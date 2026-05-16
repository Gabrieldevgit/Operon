import type { AutonomyLevel } from './agent'
import type { MemoryScope }   from './memory'

export interface FileNode {
  name:      string
  path:      string
  type:      'file' | 'directory'
  language?: string
  children?: FileNode[]
}

export interface WorkspaceSettings {
  autonomyLevel:        AutonomyLevel
  reasoningVisibility:  'hidden' | 'partial' | 'full'
  proactiveMode:        'off' | 'low' | 'medium' | 'high'
  memoryPersistence:    MemoryScope
  approvalStrictness:   'low' | 'medium' | 'high'
  showAISteps:          boolean
  stepGranularity:      'high-level' | 'standard' | 'full'
  animationStyle:       'minimal' | 'standard' | 'cinematic'
  layoutMode:           'chat' | 'ide' | 'balanced'
}

export interface Workspace {
  id:              string
  name:            string
  description?:    string
  ownerId:         string
  activeAgentIds:  string[]
  projectRoot?:    string
  fileTree?:       FileNode[]
  settings:        WorkspaceSettings
  createdAt:       number
  updatedAt:       number
}

export interface ChatMessage {
  id:         string
  role:       'user' | 'agent' | 'system'
  agentId?:   string
  agentName?: string
  content:    string
  taskId?:    string
  timestamp:  number
  metadata?:  Record<string, unknown>
}
