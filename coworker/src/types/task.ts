// ============================================================
// Task Types
// Tasks are the unit of work in the Coworker system.
// ============================================================

export type TaskStatus =
  | 'pending'
  | 'active'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type ChecklistItemStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface ChecklistItem {
  id:          string
  label:       string
  status:      ChecklistItemStatus
  agentId?:    string   // which agent owns this item
  completedAt?: number
  note?:       string
}

export interface Task {
  id:             string
  title:          string
  description:    string
  status:         TaskStatus
  priority:       TaskPriority
  assignedAgentId: string
  createdBy:      string   // 'user' | agentId
  workspaceId:    string
  checklist:      ChecklistItem[]
  parentTaskId?:  string
  subTaskIds:     string[]
  memoryRef?:     string   // key in memory store for context
  tags:           string[]
  createdAt:      number
  updatedAt:      number
  completedAt?:   number
  estimatedEffort?: number // story points
}

// What the orchestrator produces from a user request
export interface TaskBreakdown {
  rootTask:   Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  subTasks:   Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]
  reasoning:  string
}
