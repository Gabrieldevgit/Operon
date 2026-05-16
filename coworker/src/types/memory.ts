// ============================================================
// Memory Types
// The memory layer gives agents persistent context across
// sessions and between each other.
// ============================================================

export type MemoryScope = 'session' | 'project' | 'global'

export type MemoryType =
  | 'conversation'     // chat history entries
  | 'project-context'  // architecture decisions, file map, patterns
  | 'task-history'     // completed task summaries
  | 'decision'         // explicit decisions made (logged via save_action_summary)
  | 'agent-collab'     // cross-agent context
  | 'user-preference'  // user settings + behavior patterns
  | 'code-pattern'     // observed code patterns for consistency

export interface MemoryEntry {
  id:          string
  type:        MemoryType
  scope:       MemoryScope
  agentId?:    string    // undefined = shared across all agents
  workspaceId: string
  key:         string    // human-readable lookup key
  content:     string    // the actual memory content (text)
  metadata?:   Record<string, unknown>
  tags:        string[]
  createdAt:   number
  updatedAt:   number
  expiresAt?:  number    // null = persistent
  importance:  1 | 2 | 3 | 4 | 5  // for pruning when context window fills
}

// What memory_retrieve returns
export interface MemoryQueryResult {
  entries:   MemoryEntry[]
  query:     string
  scope:     MemoryScope
  agentId?:  string
  total:     number
}

// Summary written after each task by save_action_summary skill
export interface ActionSummary {
  taskId:        string
  taskTitle:     string
  agentId:       string
  whatWasDone:   string
  whyItWasDone:  string
  filesChanged:  string[]
  decisions:     string[]
  nextSteps?:    string[]
  createdAt:     number
}
