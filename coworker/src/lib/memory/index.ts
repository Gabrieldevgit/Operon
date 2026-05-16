// ============================================================
// Memory Utilities
// High-level wrappers over the Zustand memory store.
// These are what agents and skills call directly.
// ============================================================
import { nanoid } from 'nanoid'
import { useMemoryStore } from '@/store/memory.store'
import type {
  MemoryEntry, MemoryType, MemoryScope, MemoryQueryResult,
} from '@/types'

// ─── Write ────────────────────────────────────────────────────

export interface StoreMemoryInput {
  workspaceId: string
  key:         string
  content:     string
  type:        MemoryType
  scope?:      MemoryScope
  agentId?:    string
  tags?:       string[]
  importance?: 1 | 2 | 3 | 4 | 5
  ttlMs?:      number            // optional expiry
  metadata?:   Record<string, unknown>
}

/**
 * Persist a memory entry. Returns the stored entry.
 * Agents should call this after every meaningful action (save_action_summary skill).
 */
export function memory_store(input: StoreMemoryInput): MemoryEntry {
  const store = useMemoryStore.getState()

  return store.store({
    key:         input.key,
    content:     input.content,
    type:        input.type,
    scope:       input.scope     ?? 'project',
    workspaceId: input.workspaceId,
    agentId:     input.agentId,
    tags:        input.tags      ?? [],
    importance:  input.importance ?? 3,
    expiresAt:   input.ttlMs ? Date.now() + input.ttlMs : undefined,
    metadata:    input.metadata,
  })
}

// ─── Read ─────────────────────────────────────────────────────

export interface RetrieveMemoryInput {
  workspaceId: string
  scope?:      MemoryScope
  agentId?:    string
  type?:       MemoryType
  tags?:       string[]
  limit?:      number
}

/**
 * Retrieve relevant memory entries for a given context.
 * Results are sorted by importance then recency.
 */
export function memory_retrieve(input: RetrieveMemoryInput): MemoryQueryResult {
  return useMemoryStore.getState().retrieve(input)
}

/**
 * Retrieve a single entry by key. Returns null if not found.
 */
export function memory_get(workspaceId: string, key: string): MemoryEntry | null {
  const { entries } = useMemoryStore.getState()
  const now = Date.now()
  return (
    Object.values(entries).find(
      e =>
        e.workspaceId === workspaceId &&
        e.key === key &&
        (!e.expiresAt || e.expiresAt > now)
    ) ?? null
  )
}

// ─── Delete ───────────────────────────────────────────────────

export function memory_forget(id: string) {
  useMemoryStore.getState().forget(id)
}

export function memory_clear_scope(workspaceId: string, scope: MemoryScope) {
  useMemoryStore.getState().clearScope(workspaceId, scope)
}

export function memory_clear_agent(workspaceId: string, agentId: string) {
  const { entries, forget } = useMemoryStore.getState()
  Object.values(entries)
    .filter(e => e.workspaceId === workspaceId && e.agentId === agentId)
    .forEach(e => forget(e.id))
}

// ─── Decision log ─────────────────────────────────────────────

export interface DecisionLogInput {
  workspaceId: string
  agentId:     string
  decision:    string
  reasoning:   string
  alternatives?: string[]
  tags?:       string[]
}

/**
 * Log an explicit decision made during a task.
 * These are high-importance entries used to maintain architectural consistency.
 */
export function decision_log(input: DecisionLogInput): MemoryEntry {
  const content = [
    `Decision: ${input.decision}`,
    `Reasoning: ${input.reasoning}`,
    input.alternatives?.length
      ? `Alternatives considered: ${input.alternatives.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  return memory_store({
    workspaceId: input.workspaceId,
    key:         `decision:${nanoid(8)}`,
    content,
    type:        'decision',
    scope:       'project',
    agentId:     input.agentId,
    importance:  5,
    tags:        ['decision', ...(input.tags ?? [])],
    metadata:    { decision: input.decision, reasoning: input.reasoning },
  })
}

// ─── Action summary (save_action_summary skill) ───────────────

export interface ActionSummaryInput {
  workspaceId:  string
  taskId:       string
  taskTitle:    string
  agentId:      string
  whatWasDone:  string
  whyItWasDone: string
  filesChanged?: string[]
  decisions?:   string[]
  nextSteps?:   string[]
}

/**
 * Called by every agent after completing a task.
 * Creates a high-importance memory entry that future tasks can retrieve.
 */
export function save_action_summary(input: ActionSummaryInput): MemoryEntry {
  const lines = [
    `Task: ${input.taskTitle}`,
    `Done: ${input.whatWasDone}`,
    `Why: ${input.whyItWasDone}`,
    input.filesChanged?.length
      ? `Files: ${input.filesChanged.join(', ')}`
      : null,
    input.decisions?.length
      ? `Decisions: ${input.decisions.join(' | ')}`
      : null,
    input.nextSteps?.length
      ? `Next: ${input.nextSteps.join(' | ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  return memory_store({
    workspaceId: input.workspaceId,
    key:         `summary:${input.taskId}`,
    content:     lines,
    type:        'task-history',
    scope:       'project',
    agentId:     input.agentId,
    importance:  4,
    tags:        ['summary', `task:${input.taskId}`, `agent:${input.agentId}`],
    metadata:    {
      taskId:       input.taskId,
      filesChanged: input.filesChanged ?? [],
      decisions:    input.decisions    ?? [],
    },
  })
}

// ─── Conversation history ─────────────────────────────────────

/**
 * Append a message pair to conversation memory.
 * Keeps the last N turns in context.
 */
export function memory_append_conversation(
  workspaceId: string,
  agentId:     string,
  userMessage: string,
  agentReply:  string,
  maxTurns = 20
) {
  const key     = `conv:${agentId}`
  const existing = memory_get(workspaceId, key)

  // Parse existing turns or start fresh
  const turns: Array<{ user: string; agent: string; ts: number }> =
    existing?.metadata?.turns as typeof turns ?? []

  turns.push({ user: userMessage, agent: agentReply, ts: Date.now() })

  // Trim to maxTurns
  const trimmed = turns.slice(-maxTurns)

  const content = trimmed
    .map(t => `User: ${t.user}\nAgent: ${t.agent}`)
    .join('\n\n')

  if (existing) {
    useMemoryStore.getState().update(existing.id, content, { turns: trimmed })
  } else {
    memory_store({
      workspaceId,
      key,
      content,
      type:       'conversation',
      scope:      'session',
      agentId,
      importance: 2,
      tags:       ['conversation', `agent:${agentId}`],
      metadata:   { turns: trimmed },
    })
  }
}

// ─── Project context ──────────────────────────────────────────

/**
 * Store an architectural decision or project pattern.
 * These are the most durable memories — kept at project scope.
 */
export function memory_store_project_context(
  workspaceId: string,
  key:         string,
  content:     string,
  tags:        string[] = []
): MemoryEntry {
  return memory_store({
    workspaceId,
    key:         `ctx:${key}`,
    content,
    type:        'project-context',
    scope:       'project',
    importance:  5,
    tags:        ['context', ...tags],
  })
}

// ─── User preferences ─────────────────────────────────────────

export function memory_store_preference(
  workspaceId: string,
  key:         string,
  value:       unknown
): MemoryEntry {
  return memory_store({
    workspaceId,
    key:         `pref:${key}`,
    content:     typeof value === 'string' ? value : JSON.stringify(value),
    type:        'user-preference',
    scope:       'global',
    importance:  3,
    tags:        ['preference', key],
    metadata:    { value },
  })
}

export function memory_get_preference<T = unknown>(
  workspaceId: string,
  key:         string
): T | null {
  const entry = memory_get(workspaceId, `pref:${key}`)
  return (entry?.metadata?.value as T) ?? null
}
