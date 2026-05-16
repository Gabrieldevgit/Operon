// ============================================================
// Orchestrator Agent — Orion
// The brain. Every user message goes here first.
// Orion decides: handle directly OR break into tasks + delegate.
// ============================================================
import { nanoid }     from 'nanoid'
import { BaseAgent }  from './base'
import type { AIMessage } from '@/lib/ai/types'
import type { AgentRunContext } from './events'

interface TaskPlan {
  intent:           string
  canHandleDirectly: boolean
  directResponse?:  string
  tasks?: Array<{
    title:     string
    agent:     'ui-designer' | 'frontend-dev' | 'reviewer'
    checklist: string[]
    context:   string   // what to pass to the worker
  }>
}

const SYSTEM_PROMPT = `You are Orion, the orchestrating AI in the DTS Coworker platform.

Your job:
1. Understand user requests clearly
2. Decide if you can answer directly OR if specialist agents are needed
3. When delegating, write clear instructions for each specialist
4. Aggregate results into a single, coherent response

Specialist agents available:
- "ui-designer" (Vela): React components, Tailwind layouts, Framer Motion, shadcn/ui, design systems
- "frontend-dev" (Kael): Next.js App Router, TypeScript, Zustand, API routes, feature implementation
- "reviewer" (Lyra): Code review, bug detection, security audit, type checking, best practices

Rules:
- For simple questions or explanations → handle directly
- For any coding/building task → delegate to the right specialist(s)
- Always be concise. No fluff.
- When planning tasks, think about dependencies (design before code, code before review)
- The project uses Next.js 14, TypeScript strict, Tailwind, Zustand, Framer Motion, Groq AI, Supabase, Firebase`

const BREAKDOWN_PROMPT = `Analyze the following user request and produce a JSON plan.

Respond ONLY with a JSON object in this exact shape:
{
  "intent": "one sentence describing what the user wants",
  "canHandleDirectly": true/false,
  "directResponse": "your answer (only if canHandleDirectly is true)",
  "tasks": [
    {
      "title": "task title",
      "agent": "ui-designer" | "frontend-dev" | "reviewer",
      "checklist": ["step 1", "step 2"],
      "context": "specific instructions for this agent"
    }
  ]
}

Rules:
- canHandleDirectly = true for: greetings, questions, explanations, status checks
- canHandleDirectly = false for: anything requiring code, design, review, or file changes
- tasks array is only needed when canHandleDirectly = false
- Keep checklist items short (3-5 words each)
- context should be specific and actionable`

export class OrchestratorAgent extends BaseAgent {
  constructor() {
    super({
      id:            'agent_orc',
      name:          'Orion',
      role:          'orchestrator',
      modelProvider: 'groq',
      modelId:       'llama3-70b-8192',
      autonomyLevel: 'assisted',
      toolIds:       ['web_search', 'code_search'],
      systemPrompt:  SYSTEM_PROMPT,
    })
  }

  async process(messages: AIMessage[], ctx: AgentRunContext): Promise<string> {
    // Step 1: signal agent switch
    ctx.send({ type: 'agent_switch', agentId: this.id, agentName: this.name, role: this.role })

    // Step 2: emit thinking step
    const thinkingId = this.emitStep(ctx, 'thinking', 'Analyzing request…')

    // Step 3: call AI to get a structured plan
    let plan: TaskPlan | null = null
    try {
      const planText = await this.complete(
        [...messages, { role: 'user', content: `User request: "${messages.at(-1)?.content}"\n\n${BREAKDOWN_PROMPT}` }],
        ctx
      )
      plan = this.extractJson<TaskPlan>(planText)
    } catch (err) {
      this.failStep(ctx, thinkingId, String(err))
    }

    // Fallback: handle directly if plan parsing fails
    if (!plan) {
      this.completeStep(ctx, thinkingId)
      return await this.stream(messages, ctx)
    }

    this.completeStep(ctx, thinkingId, true, `Intent: ${plan.intent}`)

    // Step 4: handle directly if simple
    if (plan.canHandleDirectly) {
      const responseId = this.emitStep(ctx, 'result', 'Composing response')
      const response = plan.directResponse
        ? (() => {
            // Stream the pre-built direct response character by character
            for (const char of plan.directResponse!) {
              ctx.send({ type: 'delta', delta: char, agentId: this.id })
            }
            return plan.directResponse!
          })()
        : await this.stream(messages, ctx)
      this.completeStep(ctx, responseId)
      ctx.send({ type: 'done', agentId: this.id })
      return response
    }

    // Step 5: emit tasks to the client
    if (plan.tasks?.length) {
      for (const task of plan.tasks) {
        ctx.send({
          type: 'task_created',
          task: {
            title:           task.title,
            description:     task.context,
            status:          'pending',
            priority:        'medium',
            assignedAgentId: this.resolveAgentId(task.agent),
            createdBy:       this.id,
            workspaceId:     ctx.workspaceId,
            subTaskIds:      [],
            tags:            [task.agent],
            checklist:       task.checklist.map(label => ({
              id:     nanoid(6),
              label,
              status: 'pending' as const,
            })),
          },
        })
      }
    }

    // Step 6: delegate to specialists and aggregate
    const delegationId = this.emitStep(ctx, 'delegation',
      `Delegating ${plan.tasks?.length ?? 0} task(s) to specialists`)

    const { getAgentById } = await import('./index')
    const results: string[] = []

    for (const task of plan.tasks ?? []) {
      const worker = getAgentById(this.resolveAgentId(task.agent))
      if (!worker) continue

      ctx.send({ type: 'agent_switch', agentId: worker.id, agentName: worker.name, role: worker.role })

      const workerMessages: AIMessage[] = [
        ...messages.slice(0, -1),
        { role: 'user', content: task.context },
      ]

      const workerTaskCtx: AgentRunContext = {
        ...ctx,
        taskId: nanoid(),
      }

      const result = await worker.process(workerMessages, workerTaskCtx)
      results.push(`## ${task.title}\n${result}`)
    }

    this.completeStep(ctx, delegationId, true, `${results.length} task(s) completed`)

    // Step 7: back to orchestrator for a summary
    ctx.send({ type: 'agent_switch', agentId: this.id, agentName: this.name, role: this.role })

    const summaryId = this.emitStep(ctx, 'result', 'Synthesizing results')

    const summaryMessages: AIMessage[] = [
      ...messages,
      {
        role:    'user',
        content: `Here are the results from your specialist agents:\n\n${results.join('\n\n')}\n\nWrite a concise summary for the user. Be brief — the detailed work is already shown above.`,
      },
    ]

    const summary = await this.stream(summaryMessages, ctx, 'Write a 2-3 sentence summary only.')
    this.completeStep(ctx, summaryId)

    // Save action summary to memory
    this.saveActionSummary(ctx, {
      taskTitle:   plan.intent,
      whatWasDone: `Orchestrated ${plan.tasks?.length ?? 0} tasks: ${plan.tasks?.map(t => t.title).join(', ')}`,
      whyItWasDone: plan.intent,
    })

    ctx.send({ type: 'done', agentId: this.id })
    return summary
  }

  private resolveAgentId(role: string): string {
    const map: Record<string, string> = {
      'ui-designer':  'agent_ui',
      'frontend-dev': 'agent_dev',
      'reviewer':     'agent_rev',
    }
    return map[role] ?? 'agent_dev'
  }
}

// ─── Skill trigger helper ─────────────────────────────────────
// Detect when a user message maps to a specific skill
export function detectSkillIntent(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('architecture') || m.includes('plan the') || m.includes('structure'))
    return 'plan_architecture'
  if (m.includes('break') && (m.includes('task') || m.includes('down')))
    return 'breakdown_task'
  if (m.includes('estimate') || m.includes('story point') || m.includes('effort'))
    return 'estimate_effort'
  if (m.includes('recall') || m.includes('remember') || m.includes('previous'))
    return 'recall_project_context'
  return null
}
