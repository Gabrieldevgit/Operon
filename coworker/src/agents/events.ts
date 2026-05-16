// ============================================================
// Agent Stream Events
// The orchestrator API route sends these multiplexed over SSE.
// One connection carries text deltas, step updates, and task events.
// ============================================================
import type { AIStep } from '@/types/step'
import type { Task }   from '@/types/task'

export type AgentStreamEvent =
  | { type: 'delta';        delta: string;                agentId?: string }
  | { type: 'step_start';   step: Omit<AIStep, 'id'>;    tempId: string }
  | { type: 'step_update';  tempId: string;               patch: Partial<AIStep> }
  | { type: 'task_created'; task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'agent_switch'; agentId: string; agentName: string; role: string }
  | { type: 'thinking';     agentId: string; text: string }
  | { type: 'done';         agentId?: string; model?: string }
  | { type: 'error';        error: string }

export function encodeEvent(event: AgentStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// Context passed to every agent during execution
export interface AgentRunContext {
  workspaceId:  string
  sessionId:    string
  userId:       string
  taskId:       string
  send:         (event: AgentStreamEvent) => void
}
