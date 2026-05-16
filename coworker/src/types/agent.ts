// ============================================================
// Agent Types
// Every AI co-worker in the system implements this shape.
// ============================================================

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'waiting-approval'
  | 'error'
  | 'offline'

export type AgentRole =
  | 'orchestrator'
  | 'ui-designer'
  | 'frontend-dev'
  | 'reviewer'

export type AutonomyLevel =
  | 'passive'       // suggest only, never act
  | 'assisted'      // asks before every action
  | 'semi-auto'     // auto-executes safe actions, asks for medium+
  | 'autonomous'    // acts freely within sandbox limits

export type ModelProvider = 'groq' | 'ollama' | 'openrouter' | 'gemini'

export interface AgentPersonality {
  responseStyle: 'concise' | 'balanced' | 'detailed' | 'developer'
  proactivity:  'off' | 'low' | 'medium' | 'high'
  tone:         'professional' | 'friendly' | 'direct'
}

export interface AgentCapabilities {
  canInitiateTasks:    boolean
  canModifyFiles:      boolean
  canAccessTerminal:   boolean
  canCollaborate:      boolean
  canRequestApprovals: boolean
  canAutoExecuteSafe:  boolean
}

export interface Agent {
  id:              string
  name:            string
  role:            AgentRole
  status:          AgentStatus
  description:     string
  systemPrompt:    string
  modelProvider:   ModelProvider
  modelId:         string
  autonomyLevel:   AutonomyLevel
  personality:     AgentPersonality
  capabilities:    AgentCapabilities
  toolPermissions: string[]        // tool IDs this agent may use
  memoryScope:     'global' | 'isolated'
  workspaceId:     string
  currentTaskId?:  string
  createdAt:       number
  updatedAt:       number
}

// Used when the orchestrator delegates work
export interface AgentMessage {
  id:          string
  fromAgentId: string
  toAgentId:   string
  taskId:      string
  content:     string
  type:        'delegation' | 'clarification' | 'result' | 'error'
  timestamp:   number
}
