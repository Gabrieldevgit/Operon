// ============================================================
// Tool Types
// Tools are the hands of the agents. Everything goes through
// the permission layer before execution.
// ============================================================

export type ToolRisk = 'safe' | 'medium' | 'high' | 'critical'

export type ToolApproval =
  | 'auto'         // execute immediately, no user prompt
  | 'ask'          // ask user once, remember decision
  | 'always-ask'   // always prompt, regardless of past approvals
  | 'disabled'     // this agent cannot use this tool

export interface ToolExecutionContext {
  callingAgentId: string
  callingAgentName: string
  taskId:         string
  workspaceId:    string
  sessionId:      string
}

export interface ToolResult<T = unknown> {
  success:     boolean
  output?:     T
  error?:      string
  executedAt:  number
  durationMs?: number
}

export interface Tool<TInput = Record<string, unknown>, TOutput = unknown> {
  id:              string
  name:            string
  description:     string
  category:        ToolCategory
  risk:            ToolRisk
  defaultApproval: ToolApproval
  inputSchema:     Record<string, unknown>  // Zod schema description
  execute: (
    input:   TInput,
    context: ToolExecutionContext
  ) => Promise<ToolResult<TOutput>>
}

export type ToolCategory =
  | 'file-system'
  | 'code-editing'
  | 'web-search'
  | 'terminal'
  | 'database'
  | 'external-api'
  | 'git'
  | 'memory'

// Stored record of every tool invocation
export interface ToolExecutionLog {
  id:        string
  toolId:    string
  toolName:  string
  agentId:   string
  taskId:    string
  input:     unknown
  result:    ToolResult
  approved:  boolean
  approvedBy?: string  // 'auto' | 'user'
  timestamp: number
}

// Approval request surfaced to the user
export interface ApprovalRequest {
  id:           string
  toolId:       string
  toolName:     string
  agentId:      string
  agentName:    string
  taskId:       string
  action:       string
  reason:       string
  risk:         ToolRisk
  reversible:   boolean
  affectedFiles?: string[]
  input:        unknown
  status:       'pending' | 'approved' | 'denied'
  createdAt:    number
  resolvedAt?:  number
}
