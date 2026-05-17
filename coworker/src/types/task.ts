// ============================================================
// Task Types
// Tasks are the unit of work in the Coworker system.
// ============================================================

// ChatGPT Bug 7 fix: Expanded from 6 states to 9 for full workflow visibility.
// Use ONLY these states — never invent ad-hoc status strings.
//
// State machine:
//   queued → planning → executing → reviewing → completed
//                          ↓              ↓
//                    awaiting_approval   failed
//                          ↓
//                       executing
//   Any state → cancelled
//   Any state → blocked (waiting on dependency)
export type TaskStatus =
  | 'queued'             // created, waiting to be picked up
  | 'planning'           // orchestrator is breaking it down
  | 'executing'          // agent is actively working
  | 'awaiting_approval'  // paused, waiting for user to approve an action
  | 'reviewing'          // reviewer agent is checking the output
  | 'blocked'            // waiting on another task or resource
  | 'completed'          // finished successfully
  | 'failed'             // terminal failure
  | 'cancelled'          // user or system cancelled

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
