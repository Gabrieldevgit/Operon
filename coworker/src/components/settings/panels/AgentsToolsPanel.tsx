'use client'
// ============================================================
// AgentsToolsPanel — Phase 09, Tasks 4 & 5
// Per-agent settings + Tools & Permissions matrix
// ============================================================
import { useState }        from 'react'
import { useSettingsStore } from '@/store/settings.store'
import type {
  AgentSettings, ModelProvider, MemoryScope,
  AutonomyLevel, ToolPermission,
} from '@/store/settings.store'
import { cn }              from '@/lib/utils'

// ─── Shared primitives (duplicated for isolation) ─────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-4 pt-2 border-t border-zinc-800/60 first:border-t-0 first:pt-0">
      {children}
    </h3>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors duration-200',
        value ? 'bg-indigo-600' : 'bg-zinc-700',
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-0',
      )} />
    </button>
  )
}

function Select<T extends string>({ value, options, onChange, className }: {
  value: T; options: { value: T; label: string }[]
  onChange: (v: T) => void; className?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className={cn(
        'bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5',
        'text-[12px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500',
        className,
      )}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Agent card ───────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#6366f1', ui: '#06b6d4', dev: '#f59e0b', reviewer: '#10b981',
}

function AgentCard({
  agent, selected, onClick,
}: { agent: AgentSettings; selected: boolean; onClick: () => void }) {
  const color = AGENT_COLORS[agent.agentId] ?? '#6366f1'
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border',
        selected
          ? 'bg-indigo-950/40 border-indigo-600/40 text-indigo-300'
          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-600',
      )}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{ background: color }}
      >
        {agent.name[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{agent.name}</p>
        <p className="text-[10px] font-mono text-zinc-600">{agent.modelProvider} · {agent.modelId}</p>
      </div>
    </button>
  )
}

// ─── Default agents list ──────────────────────────────────────

const SEED_AGENTS: AgentSettings[] = [
  {
    agentId: 'orchestrator', name: 'Orchestrator',
    modelProvider: 'gemini', modelId: 'gemini-2.0-flash',
    autonomyOverride: null, memoryScope: 'global',
    toolsEnabled: ['file_read','web_search','memory_store','memory_retrieve'],
    canInitiateTasks: true, canModifyFiles: false, canUseTerminal: false, collaborationVisible: true,
  },
  {
    agentId: 'dev', name: 'Dev Agent',
    modelProvider: 'groq', modelId: 'llama-3.3-70b-versatile',
    autonomyOverride: null, memoryScope: 'project',
    toolsEnabled: ['file_read','file_write','file_edit_patch','code_lint','terminal_run','web_search'],
    canInitiateTasks: false, canModifyFiles: true, canUseTerminal: true, collaborationVisible: true,
  },
  {
    agentId: 'ui', name: 'UI Agent',
    modelProvider: 'gemini', modelId: 'gemini-2.0-flash',
    autonomyOverride: null, memoryScope: 'project',
    toolsEnabled: ['file_read','file_write','web_search','memory_retrieve'],
    canInitiateTasks: false, canModifyFiles: true, canUseTerminal: false, collaborationVisible: true,
  },
  {
    agentId: 'reviewer', name: 'Reviewer Agent',
    modelProvider: 'groq', modelId: 'llama-3.3-70b-versatile',
    autonomyOverride: null, memoryScope: 'project',
    toolsEnabled: ['file_read','code_lint','web_search','memory_retrieve'],
    canInitiateTasks: false, canModifyFiles: false, canUseTerminal: false, collaborationVisible: true,
  },
]

// ─── Tool permission matrix ───────────────────────────────────

const TOOL_CATEGORIES = {
  'File System': ['file_read', 'file_write', 'file_edit_patch', 'file_delete', 'file_search'],
  'Code':        ['code_lint', 'code_test', 'code_symbol_search'],
  'Web':         ['web_search', 'web_fetch', 'documentation_lookup'],
  'Terminal':    ['terminal_run', 'npm_operations'],
  'Git':         ['git_commit', 'git_diff', 'git_log'],
  'Memory':      ['memory_store', 'memory_retrieve', 'decision_log'],
  'Database':    ['db_query', 'api_call'],
}

const PERMISSION_OPTIONS: { value: ToolPermission; label: string; color: string }[] = [
  { value: 'disabled',   label: 'Off',    color: 'text-zinc-600'   },
  { value: 'auto',       label: 'Auto',   color: 'text-emerald-400' },
  { value: 'ask',        label: 'Ask',    color: 'text-amber-400'  },
  { value: 'always_ask', label: 'Always', color: 'text-rose-400'   },
]

function PermissionPill({ value, onChange }: { value: ToolPermission; onChange: (v: ToolPermission) => void }) {
  const current = PERMISSION_OPTIONS.find(o => o.value === value) ?? PERMISSION_OPTIONS[0]
  const idx = PERMISSION_OPTIONS.findIndex(o => o.value === value)
  const next = PERMISSION_OPTIONS[(idx + 1) % PERMISSION_OPTIONS.length]

  return (
    <button
      onClick={() => onChange(next.value)}
      title={`Click to change (current: ${current.label})`}
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-mono border transition-colors',
        'bg-zinc-900 border-zinc-800 hover:border-zinc-600 min-w-[52px] text-center',
        current.color,
      )}
    >
      {current.label}
    </button>
  )
}

// ─── AgentsToolsPanel ─────────────────────────────────────────

interface AgentsToolsPanelProps { activeSection: 'agents' | 'tools' }

export function AgentsToolsPanel({ activeSection }: AgentsToolsPanelProps) {
  const agents      = useSettingsStore(s => s.agents)
  const permissions = useSettingsStore(s => s.tools.permissions)
  const safetyRules = useSettingsStore(s => s.tools.globalSafetyRules)
  const setAgent    = useSettingsStore(s => s.setAgent)
  const setToolPerm = useSettingsStore(s => s.setToolPerm)
  const setTools    = useSettingsStore(s => s.setTools)

  // Merge persisted agents with seeds (seeds fill missing entries)
  const mergedAgents = SEED_AGENTS.map(seed => ({ ...seed, ...(agents[seed.agentId] ?? {}) }))
  const [selectedId, setSelectedId] = useState<string>(mergedAgents[0]?.agentId ?? '')
  const selectedAgent = mergedAgents.find(a => a.agentId === selectedId) ?? mergedAgents[0]

  if (activeSection === 'agents') {
    return (
      <div className="max-w-3xl">
        <div className="grid grid-cols-[180px_1fr] gap-4">
          {/* Agent list */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Co-workers</p>
            {mergedAgents.map(a => (
              <AgentCard
                key={a.agentId}
                agent={a}
                selected={a.agentId === selectedId}
                onClick={() => setSelectedId(a.agentId)}
              />
            ))}
          </div>

          {/* Agent detail */}
          {selectedAgent && (
            <div className="space-y-1 bg-zinc-900/40 rounded-xl border border-zinc-800 p-4">
              <SectionTitle>Model</SectionTitle>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[11px] text-zinc-500 mb-1.5">Provider</p>
                  <Select<ModelProvider>
                    value={selectedAgent.modelProvider}
                    options={[
                      { value: 'gemini',     label: 'Gemini'      },
                      { value: 'groq',       label: 'Groq'        },
                      { value: 'openrouter', label: 'OpenRouter'  },
                      { value: 'ollama',     label: 'Ollama'      },
                    ]}
                    onChange={v => setAgent(selectedId, { modelProvider: v })}
                    className="w-full"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 mb-1.5">Model ID</p>
                  <input
                    value={selectedAgent.modelId}
                    onChange={e => setAgent(selectedId, { modelId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <SectionTitle>Autonomy</SectionTitle>

              <div className="mb-3">
                <p className="text-[11px] text-zinc-500 mb-1.5">Override global autonomy level</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setAgent(selectedId, { autonomyOverride: null })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors',
                      selectedAgent.autonomyOverride === null
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-600/40'
                        : 'text-zinc-500 border-zinc-800 hover:border-zinc-600',
                    )}
                  >
                    Inherit global
                  </button>
                  {([1,2,3,4] as AutonomyLevel[]).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setAgent(selectedId, { autonomyOverride: lvl })}
                      className={cn(
                        'w-9 py-1.5 rounded-lg text-[11px] font-mono border transition-colors',
                        selectedAgent.autonomyOverride === lvl
                          ? 'bg-amber-600/30 text-amber-300 border-amber-600/40'
                          : 'text-zinc-500 border-zinc-800 hover:border-zinc-600',
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <SectionTitle>Memory & Access</SectionTitle>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-zinc-500 mb-1.5">Memory scope</p>
                  <Select<MemoryScope>
                    value={selectedAgent.memoryScope}
                    options={[
                      { value: 'global',    label: 'Global'    },
                      { value: 'project',   label: 'Project'   },
                      { value: 'agent',     label: 'Agent only'},
                      { value: 'isolated',  label: 'Isolated'  },
                    ]}
                    onChange={v => setAgent(selectedId, { memoryScope: v })}
                    className="w-full"
                  />
                </div>
              </div>

              <SectionTitle>Permissions</SectionTitle>

              {([
                { key: 'canInitiateTasks',      label: 'Can initiate tasks independently' },
                { key: 'canModifyFiles',         label: 'Can modify project files'         },
                { key: 'canUseTerminal',         label: 'Can use terminal (with approval)'  },
                { key: 'collaborationVisible',   label: 'Show collaboration in UI'          },
              ] as const).map(p => (
                <div key={p.key} className="flex items-center justify-between py-2 border-b border-zinc-900/60 last:border-0">
                  <p className="text-zinc-300 text-[12px]">{p.label}</p>
                  <Toggle
                    value={selectedAgent[p.key] as boolean}
                    onChange={v => setAgent(selectedId, { [p.key]: v })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Tools & Permissions ──────────────────────────────────
  return (
    <div className="max-w-2xl">
      <SectionTitle>Global Safety Rules</SectionTitle>

      {([
        { key: 'requireApprovalForDestructive', label: 'Require approval for destructive actions', hint: 'Delete, overwrite, and terminal commands always ask first.' },
        { key: 'blockExternalModifications',    label: 'Block external system modifications',      hint: 'Prevent agents from calling external APIs or modifying outside the sandbox.' },
        { key: 'logAllExecutions',              label: 'Log all tool executions',                  hint: 'Every tool call is recorded in the AI Steps feed.' },
      ] as const).map(r => (
        <div key={r.key} className="flex items-start justify-between gap-6 py-3 border-b border-zinc-900/60 last:border-0">
          <div>
            <p className="text-zinc-200 text-[13px] font-medium">{r.label}</p>
            <p className="text-zinc-500 text-[11px] mt-0.5">{r.hint}</p>
          </div>
          <Toggle
            value={safetyRules[r.key]}
            onChange={v => setTools({ globalSafetyRules: { ...safetyRules, [r.key]: v } })}
          />
        </div>
      ))}

      <SectionTitle>Permission Matrix</SectionTitle>

      <div className="text-[10px] font-mono text-zinc-600 flex gap-4 mb-3">
        {PERMISSION_OPTIONS.map(o => (
          <span key={o.value} className={o.color}>
            {o.label} — {o.value === 'disabled' ? 'never' : o.value === 'auto' ? 'no prompt' : o.value === 'ask' ? 'prompt once' : 'always prompt'}
          </span>
        ))}
      </div>

      {Object.entries(TOOL_CATEGORIES).map(([category, tools]) => (
        <div key={category} className="mb-4">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">{category}</p>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            {tools.map((toolId, i) => {
              const perm = permissions[toolId] ?? { toolId, permission: 'ask', allowedAgents: [] }
              return (
                <div
                  key={toolId}
                  className={cn(
                    'flex items-center justify-between px-3 py-2',
                    i < tools.length - 1 && 'border-b border-zinc-900',
                  )}
                >
                  <span className="text-[12px] font-mono text-zinc-400">{toolId}</span>
                  <PermissionPill
                    value={perm.permission}
                    onChange={v => setToolPerm(toolId, { permission: v })}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
