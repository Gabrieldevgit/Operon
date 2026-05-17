// ============================================================
// BaseAgent — all agents extend this
// Now injects cross-session memory into every AI call.
// Bug 11 fix: Now emits agent.status and agent.thinking events
// to the central EventBus so all systems stay in sync.
// ============================================================
import { nanoid }           from 'nanoid'
import { getProvider }      from '@/lib/ai/registry'
import { buildAgentContext } from '@/lib/memory/agent-context'
import { save_action_summary } from '@/lib/memory/memory'
import { bus }              from '@/lib/events/bus'
import type { AIMessage, AIModelProvider } from '@/lib/ai/types'
import type { AgentRole, AutonomyLevel }   from '@/types/agent'
import type { StepCategory }               from '@/types/step'
import type { AgentRunContext, AgentStreamEvent } from './events'

export interface AgentConfig {
  id:            string
  name:          string
  role:          AgentRole
  modelProvider: AIModelProvider
  modelId:       string
  autonomyLevel: AutonomyLevel
  toolIds:       string[]
  systemPrompt:  string
}

export abstract class BaseAgent {
  readonly id:            string
  readonly name:          string
  readonly role:          AgentRole
  readonly modelProvider: AIModelProvider
  readonly modelId:       string
  readonly autonomyLevel: AutonomyLevel
  readonly toolIds:       string[]
  readonly systemPrompt:  string

  constructor(config: AgentConfig) {
    this.id            = config.id
    this.name          = config.name
    this.role          = config.role
    this.modelProvider = config.modelProvider
    this.modelId       = config.modelId
    this.autonomyLevel = config.autonomyLevel
    this.toolIds       = config.toolIds
    this.systemPrompt  = config.systemPrompt
  }

  abstract process(messages: AIMessage[], ctx: AgentRunContext): Promise<string>

  // ─── AI calls — memory-aware ──────────────────────────────

  protected buildFullSystemPrompt(ctx: AgentRunContext, extra?: string): string {
    const memory = buildAgentContext({
      workspaceId:  ctx.workspaceId,
      agentId:      this.id,
      maxDecisions: 5,
      maxTasks:     6,
      maxContext:   5,
      maxConvTurns: 4,
    })
    return [this.systemPrompt, extra, memory].filter(Boolean).join('\n\n')
  }

  protected async complete(
    messages: AIMessage[], ctx: AgentRunContext, extra?: string
  ): Promise<string> {
    const provider   = getProvider(this.modelProvider)
    const sysPrompt  = this.buildFullSystemPrompt(ctx, extra)
    const result     = await provider.complete(messages, {
      model: this.modelId, systemPrompt: sysPrompt, maxTokens: 2048, temperature: 0.7,
    })
    return result.content
  }

  protected async stream(
    messages: AIMessage[], ctx: AgentRunContext, extra?: string
  ): Promise<string> {
    const provider  = getProvider(this.modelProvider)
    const sysPrompt = this.buildFullSystemPrompt(ctx, extra)
    let   full      = ''

    // Emit thinking status before streaming starts
    bus.emit('agent.status', { agentId: this.id, status: 'thinking' })

    await provider.stream(
      messages,
      { model: this.modelId, systemPrompt: sysPrompt, maxTokens: 2048, temperature: 0.7 },
      chunk => {
        if (!chunk.done && chunk.delta) {
          full += chunk.delta
          ctx.send({ type: 'delta', delta: chunk.delta, agentId: this.id })
          // Emit partial thinking text so ThinkingLayer can render it
          bus.emit('agent.thinking', { agentId: this.id, text: chunk.delta })
        }
      }
    )

    // Back to idle when streaming completes
    bus.emit('agent.status', { agentId: this.id, status: 'idle' })
    return full
  }

  // ─── Status helpers ────────────────────────────────────────

  /** Emit agent status to EventBus + the SSE stream simultaneously */
  protected setStatus(
    ctx: AgentRunContext,
    status: 'idle' | 'thinking' | 'working' | 'waiting-approval' | 'error'
  ) {
    bus.emit('agent.status', { agentId: this.id, status })
    ctx.send({ type: 'agent_switch', agentId: this.id, agentName: this.name, role: this.role })
  }

  // ─── Step emission ────────────────────────────────────────

  protected emitStep(
    ctx: AgentRunContext, category: StepCategory, title: string, detail?: string,
    extra?: Partial<{ toolId: string; toolName: string; affectedFiles: string[]; risk: string }>
  ): string {
    const tempId = nanoid(8)
    ctx.send({
      type: 'step_start', tempId,
      step: {
        agentId: this.id, agentName: this.name, agentRole: this.role,
        taskId: ctx.taskId, category, title, detail,
        status: 'running', requiresApproval: false, timestamp: Date.now(), ...extra,
      },
    })
    return tempId
  }

  protected completeStep(ctx: AgentRunContext, tempId: string, success = true, detail?: string) {
    ctx.send({ type: 'step_update', tempId, patch: { status: success ? 'completed' : 'failed', detail } })
  }

  protected failStep(ctx: AgentRunContext, tempId: string, error: string) {
    ctx.send({ type: 'step_update', tempId, patch: { status: 'failed', detail: error } })
  }

  protected saveActionSummary(ctx: AgentRunContext, params: {
    taskTitle: string; whatWasDone: string; whyItWasDone: string
    filesChanged?: string[]; decisions?: string[]
  }) {
    save_action_summary({ workspaceId: ctx.workspaceId, taskId: ctx.taskId, agentId: this.id, ...params })
  }

  protected extractJson<T>(text: string): T | null {
    const match = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/) ?? text.match(/(\{[\s\S]+\}|\[[\s\S]+\])/)
    if (!match) return null
    try { return JSON.parse(match[1] ?? match[0]) as T } catch { return null }
  }
}
