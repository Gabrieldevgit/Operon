// ============================================================
// Settings Store — Phase 09
// The control center for the entire AI coworker platform.
//
// Priority rule: Agent > Workspace > Global
// (agent-level overrides workspace, workspace overrides global)
//
// Persisted to localStorage as 'coworker:settings'.
// ============================================================
import { create }    from 'zustand'
import { immer }     from 'zustand/middleware/immer'
import { persist }   from 'zustand/middleware'

// ─── Section 1: General ──────────────────────────────────────

export type AppTheme      = 'dark' | 'light' | 'neon' | 'midnight'
export type AnimationLevel= 'minimal' | 'standard' | 'cinematic' | 'futuristic'
export type Language      = 'en' | 'fr' | 'es' | 'de' | 'ja' | 'zh'

export interface GeneralSettings {
  language:            Language
  theme:               AppTheme
  animationLevel:      AnimationLevel
  startupWorkspace:    'last' | 'empty' | 'default'
  defaultAgentVisible: boolean
  notifications: {
    approvals:         boolean
    taskComplete:      boolean
    agentWarnings:     boolean
    memoryUpdates:     boolean
    sound:             boolean
  }
}

// ─── Section 2: AI Behavior ──────────────────────────────────

export type AutonomyLevel  = 1 | 2 | 3 | 4
export type ResponseStyle  = 'concise' | 'balanced' | 'detailed' | 'developer'
export type ReasoningView  = 'hidden' | 'summary' | 'full'
export type ProactiveLevel = 'off' | 'low' | 'medium' | 'high'

export interface AIBehaviorSettings {
  autonomyLevel:      AutonomyLevel
  responseStyle:      ResponseStyle
  reasoningVisibility:ReasoningView
  proactiveMode:      ProactiveLevel
  thinkingLayerInChat:boolean
  planBeforeExecute:  boolean
  autoApproveSafe:    boolean
}

// ─── Section 3: Per-agent ────────────────────────────────────

export type ModelProvider = 'gemini' | 'groq' | 'openrouter' | 'ollama'
export type MemoryScope   = 'global' | 'project' | 'agent' | 'isolated'

export interface AgentSettings {
  agentId:         string
  name:            string
  modelProvider:   ModelProvider
  modelId:         string
  autonomyOverride:AutonomyLevel | null   // null = inherit global
  memoryScope:     MemoryScope
  toolsEnabled:    string[]               // toolId list
  canInitiateTasks:boolean
  canModifyFiles:  boolean
  canUseTerminal:  boolean
  collaborationVisible: boolean
}

// ─── Section 4: Tools & Permissions ─────────────────────────

export type ToolPermission = 'disabled' | 'ask' | 'auto' | 'always_ask'

export interface ToolPermissionEntry {
  toolId:     string
  permission: ToolPermission
  allowedAgents: string[]              // empty = all
}

export interface ToolsSettings {
  permissions:        Record<string, ToolPermissionEntry>
  globalSafetyRules: {
    requireApprovalForDestructive: boolean
    blockExternalModifications:    boolean
    logAllExecutions:              boolean
  }
}

// ─── Section 5: Memory ───────────────────────────────────────

export type MemoryPersistence = 'session' | 'project' | 'global'
export type MemoryVerbosity   = 'minimal' | 'balanced' | 'full'
export type AutoExtraction    = 'off' | 'important' | 'full'

export interface MemorySettings {
  persistenceLevel:   MemoryPersistence
  verbosity:          MemoryVerbosity
  autoExtraction:     AutoExtraction
  maxEntriesPerScope: number
  resetControls: {
    confirmBeforeReset: boolean
  }
}

// ─── Section 6: AI Steps ─────────────────────────────────────

export type StepGranularity = 'high-level' | 'standard' | 'full-trace'
export type StepFilter      = 'user-impacting' | 'all' | 'tool-level'

export interface AIStepsSettings {
  visible:       boolean
  granularity:   StepGranularity
  filter:        StepFilter
  replayMode:    boolean
  debugPlayback: boolean
  maxStepsShown: number
}

// ─── Section 7: Integrations ─────────────────────────────────

export type ModelRoutingMode = 'task-based' | 'cost' | 'speed' | 'quality'

export interface ProviderConfig {
  enabled:    boolean
  apiKey:     string          // stored encrypted in production
  defaultModel: string
}

export interface IntegrationsSettings {
  providers: {
    gemini:     ProviderConfig
    groq:       ProviderConfig
    openrouter: ProviderConfig
    ollama:     ProviderConfig & { baseUrl: string }
  }
  github: {
    enabled:     boolean
    token:       string
    defaultRepo: string
  }
  firebase: {
    enabled:     boolean
    projectId:   string
  }
  supabase: {
    enabled:     boolean
    projectUrl:  string
  }
  modelRouting: {
    mode:        ModelRoutingMode
    rules:       Array<{ taskType: string; provider: ModelProvider; modelId: string }>
  }
}

// ─── Section 8: Security ─────────────────────────────────────

export type ApprovalStrictness = 'low' | 'medium' | 'high'

export interface SecuritySettings {
  approvalStrictness:     ApprovalStrictness
  riskBlocking: {
    disableHighRisk:      boolean
    requireManualAlways:  boolean
    sandboxOnly:          boolean
  }
  externalApis: {
    allowedDomains:  string[]
    blockedDomains:  string[]
    trustedApis:     string[]
  }
  auditLogging: {
    enabled:         boolean
    fullTrace:       boolean
  }
}

// ─── Root settings shape ──────────────────────────────────────

export interface SettingsState {
  general:      GeneralSettings
  aiBehavior:   AIBehaviorSettings
  agents:       Record<string, AgentSettings>
  tools:        ToolsSettings
  memory:       MemorySettings
  aiSteps:      AIStepsSettings
  integrations: IntegrationsSettings
  security:     SecuritySettings

  // Actions
  setGeneral:      (patch: Partial<GeneralSettings>)      => void
  setAIBehavior:   (patch: Partial<AIBehaviorSettings>)   => void
  setAgent:        (agentId: string, patch: Partial<AgentSettings>) => void
  removeAgent:     (agentId: string)                       => void
  setToolPerm:     (toolId: string, patch: Partial<ToolPermissionEntry>) => void
  setTools:        (patch: Partial<ToolsSettings>)         => void
  setMemory:       (patch: Partial<MemorySettings>)        => void
  setAISteps:      (patch: Partial<AIStepsSettings>)       => void
  setIntegrations: (patch: Partial<IntegrationsSettings>)  => void
  setSecurity:     (patch: Partial<SecuritySettings>)      => void
  resetSection:    (section: keyof Omit<SettingsState, keyof ActionsOnly>) => void
}

type ActionsOnly = Pick<SettingsState,
  'setGeneral'|'setAIBehavior'|'setAgent'|'removeAgent'|
  'setToolPerm'|'setTools'|'setMemory'|'setAISteps'|
  'setIntegrations'|'setSecurity'|'resetSection'
>

// ─── Defaults ────────────────────────────────────────────────

const DEFAULT_GENERAL: GeneralSettings = {
  language:            'en',
  theme:               'dark',
  animationLevel:      'standard',
  startupWorkspace:    'last',
  defaultAgentVisible: true,
  notifications: {
    approvals:    true,
    taskComplete: true,
    agentWarnings:true,
    memoryUpdates:false,
    sound:        false,
  },
}

const DEFAULT_AI_BEHAVIOR: AIBehaviorSettings = {
  autonomyLevel:       2,
  responseStyle:       'balanced',
  reasoningVisibility: 'summary',
  proactiveMode:       'medium',
  thinkingLayerInChat: true,
  planBeforeExecute:   true,
  autoApproveSafe:     false,
}

const DEFAULT_TOOLS: ToolsSettings = {
  permissions: {
    file_read:          { toolId: 'file_read',         permission: 'auto',       allowedAgents: [] },
    file_write:         { toolId: 'file_write',        permission: 'ask',        allowedAgents: [] },
    file_edit_patch:    { toolId: 'file_edit_patch',   permission: 'ask',        allowedAgents: [] },
    file_delete:        { toolId: 'file_delete',       permission: 'always_ask', allowedAgents: [] },
    terminal_run:       { toolId: 'terminal_run',      permission: 'always_ask', allowedAgents: [] },
    web_search:         { toolId: 'web_search',        permission: 'auto',       allowedAgents: [] },
    memory_store:       { toolId: 'memory_store',      permission: 'auto',       allowedAgents: [] },
    code_lint:          { toolId: 'code_lint',         permission: 'auto',       allowedAgents: [] },
    git_commit:         { toolId: 'git_commit',        permission: 'ask',        allowedAgents: [] },
    db_query:           { toolId: 'db_query',          permission: 'always_ask', allowedAgents: [] },
  },
  globalSafetyRules: {
    requireApprovalForDestructive: true,
    blockExternalModifications:    true,
    logAllExecutions:              true,
  },
}

const DEFAULT_MEMORY: MemorySettings = {
  persistenceLevel:   'project',
  verbosity:          'balanced',
  autoExtraction:     'important',
  maxEntriesPerScope: 500,
  resetControls: { confirmBeforeReset: true },
}

const DEFAULT_AI_STEPS: AIStepsSettings = {
  visible:       true,
  granularity:   'standard',
  filter:        'all',
  replayMode:    false,
  debugPlayback: false,
  maxStepsShown: 200,
}

const DEFAULT_INTEGRATIONS: IntegrationsSettings = {
  providers: {
    gemini:     { enabled: false, apiKey: '', defaultModel: 'gemini-2.0-flash' },
    groq:       { enabled: false, apiKey: '', defaultModel: 'llama-3.3-70b-versatile' },
    openrouter: { enabled: false, apiKey: '', defaultModel: 'anthropic/claude-3.5-sonnet' },
    ollama:     { enabled: false, apiKey: '', defaultModel: 'llama3', baseUrl: 'http://localhost:11434' },
  },
  github:   { enabled: false, token: '', defaultRepo: '' },
  firebase: { enabled: false, projectId: '' },
  supabase: { enabled: false, projectUrl: '' },
  modelRouting: {
    mode: 'task-based',
    rules: [
      { taskType: 'orchestration', provider: 'gemini',     modelId: 'gemini-2.0-flash' },
      { taskType: 'code',          provider: 'groq',       modelId: 'llama-3.3-70b-versatile' },
      { taskType: 'background',    provider: 'ollama',     modelId: 'llama3' },
      { taskType: 'review',        provider: 'openrouter', modelId: 'anthropic/claude-3.5-sonnet' },
    ],
  },
}

const DEFAULT_SECURITY: SecuritySettings = {
  approvalStrictness: 'high',
  riskBlocking: {
    disableHighRisk:     false,
    requireManualAlways: false,
    sandboxOnly:         false,
  },
  externalApis: {
    allowedDomains: [],
    blockedDomains: [],
    trustedApis:    [],
  },
  auditLogging: { enabled: true, fullTrace: false },
}

// ─── Store ───────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set, get) => ({
      general:      DEFAULT_GENERAL,
      aiBehavior:   DEFAULT_AI_BEHAVIOR,
      agents:       {},
      tools:        DEFAULT_TOOLS,
      memory:       DEFAULT_MEMORY,
      aiSteps:      DEFAULT_AI_STEPS,
      integrations: DEFAULT_INTEGRATIONS,
      security:     DEFAULT_SECURITY,

      setGeneral(patch)      { set(s => { Object.assign(s.general, patch) }) },
      setAIBehavior(patch)   { set(s => { Object.assign(s.aiBehavior, patch) }) },

      setAgent(agentId, patch) {
        set(s => {
          if (!s.agents[agentId]) {
            s.agents[agentId] = {
              agentId, name: agentId,
              modelProvider: 'gemini', modelId: 'gemini-2.0-flash',
              autonomyOverride: null,
              memoryScope: 'agent',
              toolsEnabled: [],
              canInitiateTasks: false, canModifyFiles: false,
              canUseTerminal: false, collaborationVisible: true,
            }
          }
          Object.assign(s.agents[agentId], patch)
        })
      },

      removeAgent(agentId)   { set(s => { delete s.agents[agentId] }) },

      setToolPerm(toolId, patch) {
        set(s => {
          if (!s.tools.permissions[toolId]) {
            s.tools.permissions[toolId] = { toolId, permission: 'ask', allowedAgents: [] }
          }
          Object.assign(s.tools.permissions[toolId], patch)
        })
      },

      setTools(patch)         { set(s => { Object.assign(s.tools, patch) }) },
      setMemory(patch)        { set(s => { Object.assign(s.memory, patch) }) },
      setAISteps(patch)       { set(s => { Object.assign(s.aiSteps, patch) }) },
      setIntegrations(patch)  { set(s => { Object.assign(s.integrations, patch) }) },
      setSecurity(patch)      { set(s => { Object.assign(s.security, patch) }) },

      resetSection(section) {
        const defaults: Record<string, unknown> = {
          general: DEFAULT_GENERAL, aiBehavior: DEFAULT_AI_BEHAVIOR,
          agents: {}, tools: DEFAULT_TOOLS, memory: DEFAULT_MEMORY,
          aiSteps: DEFAULT_AI_STEPS, integrations: DEFAULT_INTEGRATIONS,
          security: DEFAULT_SECURITY,
        }
        set(s => { (s as Record<string, unknown>)[section] = defaults[section] })
      },
    })),
    {
      name:    'coworker:settings',
      version: 1,
      // Never persist raw API keys to localStorage in production —
      // strip them before serialisation and restore from env vars.
      partialize: (s) => ({
        ...s,
        integrations: {
          ...s.integrations,
          providers: Object.fromEntries(
            Object.entries(s.integrations.providers).map(([k, v]) => [
              k, { ...v, apiKey: '' }   // strip key from localStorage
            ])
          ),
        },
        github:   { ...s.integrations.github,   token: '' },
      }),
    }
  )
)

// ─── Derived helpers ──────────────────────────────────────────

/** Resolve effective autonomy for an agent (agent override or global) */
export function resolveAutonomy(agentId: string): AutonomyLevel {
  const { agents, aiBehavior } = useSettingsStore.getState()
  return agents[agentId]?.autonomyOverride ?? aiBehavior.autonomyLevel
}

/** Check if a tool action should be auto-approved */
export function isAutoApproved(toolId: string): boolean {
  const { tools } = useSettingsStore.getState()
  return tools.permissions[toolId]?.permission === 'auto'
}
