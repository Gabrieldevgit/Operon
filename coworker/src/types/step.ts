import type { ToolRisk } from './tool'

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'awaiting-approval'

export type StepCategory =
  | 'thinking'
  | 'tool-use'
  | 'file-read'
  | 'file-write'
  | 'delegation'
  | 'memory-read'
  | 'memory-write'
  | 'approval'
  | 'communication'
  | 'result'

export interface AIStep {
  id:               string
  agentId:          string
  agentName:        string
  agentRole:        string
  taskId:           string
  category:         StepCategory
  title:            string
  detail?:          string
  status:           StepStatus
  toolId?:          string
  toolName?:        string
  affectedFiles?:   string[]
  risk?:            ToolRisk
  timestamp:        number
  durationMs?:      number
  requiresApproval: boolean
  approvalId?:      string
  approvedBy?:      string
  parentStepId?:    string
  metadata?:        Record<string, unknown>
}

export interface AgentThinkingPreview {
  agentId:    string
  taskId:     string
  intent:     string
  strategy:   string
  steps:      string[]
  riskLevel:  ToolRisk
  confidence: number
  timestamp:  number
}
