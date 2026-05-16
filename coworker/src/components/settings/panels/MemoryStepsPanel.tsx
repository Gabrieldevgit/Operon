'use client'
// ============================================================
// MemoryStepsPanel — Phase 09, Tasks 6 & 7
// Memory settings (persistence, verbosity, extraction, resets)
// AI Steps settings (granularity, filter, replay mode)
// ============================================================
import { useState }         from 'react'
import { useSettingsStore }  from '@/store/settings.store'
import { useMemoryStore }    from '@/store/memory.store'
import type {
  MemoryPersistence, MemoryVerbosity, AutoExtraction,
  StepGranularity, StepFilter,
} from '@/store/settings.store'
import { cn } from '@/lib/utils'

// ─── Shared primitives ────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-4 pt-2 border-t border-zinc-800/60 first:border-t-0 first:pt-0">
      {children}
    </h3>
  )
}

function SettingRow({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-zinc-900/60 last:border-0">
      <div>
        <p className="text-zinc-200 text-[13px] font-medium">{label}</p>
        {hint && <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors',
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

function Select<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500 min-w-[150px]"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Danger button ────────────────────────────────────────────

function DangerButton({ label, hint, onConfirm }: {
  label: string; hint: string; onConfirm: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-900/60 last:border-0 gap-6">
      <div>
        <p className="text-zinc-200 text-[13px] font-medium">{label}</p>
        <p className="text-zinc-500 text-[11px] mt-0.5">{hint}</p>
      </div>
      {confirming ? (
        <div className="flex gap-2">
          <button
            onClick={() => { onConfirm(); setConfirming(false) }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono bg-rose-700/30 text-rose-400 border border-rose-700/40 hover:bg-rose-700/50 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-zinc-500 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-rose-400 border border-rose-800/40 hover:bg-rose-950/30 transition-colors"
        >
          {label}
        </button>
      )}
    </div>
  )
}

// ─── Memory stats widget ──────────────────────────────────────

function MemoryStats() {
  const entries = useMemoryStore(s => s.entries)
  const counts  = Object.values(entries).reduce((acc, e) => {
    acc[e.scope] = (acc[e.scope] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: 'Session',  key: 'session' },
        { label: 'Project',  key: 'project' },
        { label: 'Global',   key: 'global'  },
      ].map(s => (
        <div key={s.key} className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-center">
          <p className="text-xl font-bold text-zinc-200">{counts[s.key] ?? 0}</p>
          <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Steps granularity visual ─────────────────────────────────

const GRANULARITY_DESC: Record<StepGranularity, string> = {
  'high-level': 'Major actions only — task starts, completions, approvals.',
  'standard':   'Standard detail — tool calls, step transitions, errors.',
  'full-trace': 'Every internal event — best for debugging and auditing.',
}

// ─── MemoryStepsPanel ─────────────────────────────────────────

interface MemoryStepsPanelProps { activeSection: 'memory' | 'ai-steps' }

export function MemoryStepsPanel({ activeSection }: MemoryStepsPanelProps) {
  const memory    = useSettingsStore(s => s.memory)
  const aiSteps   = useSettingsStore(s => s.aiSteps)
  const setMemory = useSettingsStore(s => s.setMemory)
  const setSteps  = useSettingsStore(s => s.setAISteps)

  const clearSession = () => useMemoryStore.getState().clearByScope?.('session')
  const clearProject = () => useMemoryStore.getState().clearByScope?.('project')
  const clearAll     = () => useMemoryStore.getState().clearByScope?.('global')

  if (activeSection === 'memory') {
    return (
      <div className="max-w-2xl">
        <SectionTitle>Memory Usage</SectionTitle>
        <MemoryStats />

        <SectionTitle>Persistence</SectionTitle>

        <SettingRow
          label="Persistence level"
          hint="Where memories are stored by default. Higher levels survive longer."
        >
          <Select<MemoryPersistence>
            value={memory.persistenceLevel}
            options={[
              { value: 'session', label: 'Session only'   },
              { value: 'project', label: 'Project memory' },
              { value: 'global',  label: 'Global memory'  },
            ]}
            onChange={v => setMemory({ persistenceLevel: v })}
          />
        </SettingRow>

        <SettingRow
          label="Memory verbosity"
          hint="How much detail is saved when memories are created."
        >
          <Select<MemoryVerbosity>
            value={memory.verbosity}
            options={[
              { value: 'minimal',  label: 'Minimal'  },
              { value: 'balanced', label: 'Balanced' },
              { value: 'full',     label: 'Full'     },
            ]}
            onChange={v => setMemory({ verbosity: v })}
          />
        </SettingRow>

        <SettingRow
          label="Max entries per scope"
          hint="Older entries are evicted when this limit is reached."
        >
          <select
            value={memory.maxEntriesPerScope}
            onChange={e => setMemory({ maxEntriesPerScope: parseInt(e.target.value) })}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none min-w-[120px]"
          >
            {[100, 250, 500, 1000, 2000].map(n => (
              <option key={n} value={n}>{n.toLocaleString()} entries</option>
            ))}
          </select>
        </SettingRow>

        <SectionTitle>Auto-extraction</SectionTitle>

        <SettingRow
          label="Auto-extract from conversations"
          hint="AI reads responses and saves important decisions, constraints, and tech choices automatically."
        >
          <Select<AutoExtraction>
            value={memory.autoExtraction}
            options={[
              { value: 'off',       label: 'Off'             },
              { value: 'important', label: 'Important only'  },
              { value: 'full',      label: 'Full capture'    },
            ]}
            onChange={v => setMemory({ autoExtraction: v })}
          />
        </SettingRow>

        <SectionTitle>Reset Controls</SectionTitle>

        <SettingRow
          label="Confirm before reset"
          hint="Show a confirmation step before wiping any memory scope."
        >
          <Toggle
            value={memory.resetControls.confirmBeforeReset}
            onChange={v => setMemory({ resetControls: { confirmBeforeReset: v } })}
          />
        </SettingRow>

        <DangerButton
          label="Clear session memory"
          hint="Remove all memories from the current session."
          onConfirm={clearSession}
        />
        <DangerButton
          label="Clear project memory"
          hint="Remove all project-scoped memory for this workspace."
          onConfirm={clearProject}
        />
        <DangerButton
          label="Clear all memory"
          hint="Wipe all memory across all scopes. This cannot be undone."
          onConfirm={clearAll}
        />
      </div>
    )
  }

  // ── AI Steps section ─────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <SectionTitle>Visibility</SectionTitle>

      <SettingRow label="Show AI Steps panel" hint="Toggle the realtime execution feed on the right side.">
        <Toggle value={aiSteps.visible} onChange={v => setSteps({ visible: v })} />
      </SettingRow>

      <SectionTitle>Detail Level</SectionTitle>

      <div className="space-y-2 mb-4">
        {(['high-level', 'standard', 'full-trace'] as StepGranularity[]).map(g => (
          <button
            key={g}
            onClick={() => setSteps({ granularity: g })}
            className={cn(
              'w-full flex items-start gap-3 px-4 py-3 rounded-lg border transition-all text-left',
              aiSteps.granularity === g
                ? 'bg-indigo-950/30 border-indigo-600/40 text-indigo-300'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            <span className={cn(
              'w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5',
              aiSteps.granularity === g ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600',
            )} />
            <div>
              <p className="font-medium text-[12px] capitalize">{g.replace('-', ' ')}</p>
              <p className="text-[11px] opacity-70 mt-0.5">{GRANULARITY_DESC[g]}</p>
            </div>
          </button>
        ))}
      </div>

      <SectionTitle>Filtering</SectionTitle>

      <SettingRow label="Filter events" hint="Which events to show in the live feed.">
        <Select<StepFilter>
          value={aiSteps.filter}
          options={[
            { value: 'user-impacting', label: 'User-impacting only' },
            { value: 'all',            label: 'All events'          },
            { value: 'tool-level',     label: 'Tool-level logs'     },
          ]}
          onChange={v => setSteps({ filter: v })}
        />
      </SettingRow>

      <SettingRow label="Max steps shown" hint="Older steps are removed when this limit is reached.">
        <select
          value={aiSteps.maxStepsShown}
          onChange={e => setSteps({ maxStepsShown: parseInt(e.target.value) })}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none"
        >
          {[50, 100, 200, 500, 1000].map(n => (
            <option key={n} value={n}>{n} steps</option>
          ))}
        </select>
      </SettingRow>

      <SectionTitle>Replay</SectionTitle>

      <SettingRow label="Enable replay mode" hint="Record step history so you can scrub back through AI execution.">
        <Toggle value={aiSteps.replayMode} onChange={v => setSteps({ replayMode: v })} />
      </SettingRow>

      <SettingRow label="Debug playback" hint="Slow-motion step replay for auditing AI decisions.">
        <Toggle
          value={aiSteps.debugPlayback}
          onChange={v => setSteps({ debugPlayback: v })}
        />
      </SettingRow>
    </div>
  )
}
