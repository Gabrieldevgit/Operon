// ============================================================
// EventBus — Bug 5 fix: central event engine
// Replaces direct store calls between systems with typed events.
// Every agent action, tool call, and memory write emits here.
// Listeners (UI, logs, steps feed) subscribe and react independently.
// ============================================================
import type { AgentStatus, ToolRisk } from '@/types'

// ─── Typed event map ──────────────────────────────────────────

export type CoworkerEventMap = {
  // Task lifecycle
  'task.started':       { taskId: string; agentId: string; title: string }
  'task.completed':     { taskId: string; agentId: string; result: string }
  'task.failed':        { taskId: string; agentId: string; error: string }
  'task.delegated':     { taskId: string; fromAgentId: string; toAgentId: string }

  // Tool execution
  'tool.executing':     { toolId: string; toolName: string; agentId: string; risk: ToolRisk }
  'tool.executed':      { toolId: string; agentId: string; success: boolean; durationMs: number }
  'tool.denied':        { toolId: string; agentId: string; reason: string }

  // Memory
  'memory.created':     { entryId: string; type: string; scope: string; agentId?: string }
  'memory.updated':     { entryId: string; key: string }
  'memory.deleted':     { entryId: string }
  'memory.loaded':      { count: number; workspaceId: string }

  // Approval flow
  'approval.pending':   { requestId: string; toolId: string; agentId: string; risk: ToolRisk }
  'approval.resolved':  { requestId: string; approved: boolean; agentId: string }

  // Agent state
  'agent.status':       { agentId: string; status: AgentStatus }
  'agent.thinking':     { agentId: string; text: string }
  'agent.switched':     { agentId: string; agentName: string; role: string }

  // Step feed
  'step.emitted':       { stepId: string; category: string; agentId: string; title: string }
  'step.completed':     { stepId: string; durationMs?: number }
  'step.failed':        { stepId: string; error: string }

  // Workspace
  'workspace.ready':    { workspaceId: string; memoriesLoaded: number; historyLoaded: number }
  'workspace.reset':    { workspaceId: string }

  // Skills
  'skill.started':      { skillId: string; agentId: string }
  'skill.completed':    { skillId: string; agentId: string; success: boolean }

  // Persistence
  // Firestore = realtime state + audit log
  // Supabase  = long-term persistence + relational queries
  'persistence.synced': { entryCount: number; destination: 'firestore' | 'supabase' }
  'persistence.error':  { source: string; error: string }
}

export type CoworkerEventType    = keyof CoworkerEventMap
export type CoworkerEventPayload<T extends CoworkerEventType> = CoworkerEventMap[T]

type Handler<T extends CoworkerEventType> = (payload: CoworkerEventPayload<T>) => void
type AnyHandler = (payload: unknown) => void

// ─── EventBus class ───────────────────────────────────────────

class EventBus {
  private handlers = new Map<string, Set<AnyHandler>>()
  private history:  Array<{ type: string; payload: unknown; ts: number }> = []
  private readonly MAX_HISTORY = 200

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T extends CoworkerEventType>(event: T, handler: Handler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as AnyHandler)
    return () => this.off(event, handler)
  }

  /** Subscribe for one emission only. */
  once<T extends CoworkerEventType>(event: T, handler: Handler<T>): () => void {
    const wrapper: Handler<T> = (payload) => {
      handler(payload)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  /** Unsubscribe a specific handler. */
  off<T extends CoworkerEventType>(event: T, handler: Handler<T>): void {
    this.handlers.get(event)?.delete(handler as AnyHandler)
  }

  /** Emit an event synchronously to all subscribers. */
  emit<T extends CoworkerEventType>(event: T, payload: CoworkerEventPayload<T>): void {
    this.history.push({ type: event, payload, ts: Date.now() })
    if (this.history.length > this.MAX_HISTORY) this.history.shift()

    const set = this.handlers.get(event)
    if (!set?.size) return

    for (const handler of set) {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[EventBus] Handler error on "${event}":`, err)
      }
    }
  }

  /** Get recent event history (for debugging / replay). */
  getHistory(filterType?: CoworkerEventType) {
    return filterType
      ? this.history.filter(e => e.type === filterType)
      : [...this.history]
  }

  /** Remove all handlers for an event, or all handlers everywhere. */
  clear(event?: CoworkerEventType) {
    if (event) this.handlers.delete(event)
    else       this.handlers.clear()
  }

  /** How many handlers are registered (debugging). */
  listenerCount(event: CoworkerEventType): number {
    return this.handlers.get(event)?.size ?? 0
  }
}

// ─── Singleton export ─────────────────────────────────────────

export const bus = new EventBus()

// ─── React hook ───────────────────────────────────────────────

import { useEffect } from 'react'

export function useEvent<T extends CoworkerEventType>(
  event: T,
  handler: Handler<T>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    return bus.on(event, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}

// ─── Debug helper (dev only) ──────────────────────────────────

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as typeof window & { __coworkerBus?: EventBus }).__coworkerBus = bus
}
