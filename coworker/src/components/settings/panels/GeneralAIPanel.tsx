'use client'
// ============================================================
// GeneralAIPanel — Phase 09, Tasks 2 & 3
// General settings (theme, language, animations, notifications)
// AI Behavior settings (autonomy, response style, reasoning, proactive)
// ============================================================
import { useSettingsStore } from '@/store/settings.store'
import type {
  AppTheme, AnimationLevel, Language,
  AutonomyLevel, ResponseStyle, ReasoningView, ProactiveLevel,
} from '@/store/settings.store'
import { cn } from '@/lib/utils'

// ─── Shared UI primitives ─────────────────────────────────────

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
      <div className="min-w-0">
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
        'relative w-10 h-5.5 rounded-full transition-colors duration-200 shrink-0',
        value ? 'bg-indigo-600' : 'bg-zinc-700',
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
        value ? 'translate-x-4.5' : 'translate-x-0',
      )} />
    </button>
  )
}

function Select<T extends string>({ value, options, onChange }: {
  value:    T
  options:  { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className={cn(
        'bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5',
        'text-[12px] font-mono text-zinc-300',
        'focus:outline-none focus:border-zinc-500 transition-colors',
        'min-w-[130px]',
      )}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Autonomy slider ──────────────────────────────────────────

const AUTONOMY_LABELS: Record<AutonomyLevel, { label: string; desc: string; color: string }> = {
  1: { label: 'Passive',      desc: 'Suggests text only. Cannot trigger any tools.',        color: 'bg-emerald-500' },
  2: { label: 'Assisted',     desc: 'Prepares actions, requires approval for everything.',   color: 'bg-cyan-500'    },
  3: { label: 'Semi-Auto',    desc: 'Executes safe tools automatically, asks for edits.',   color: 'bg-amber-500'   },
  4: { label: 'Autonomous',   desc: 'Full sandbox execution. Heavy logging required.',      color: 'bg-rose-500'    },
}

function AutonomySlider({ value, onChange }: { value: AutonomyLevel; onChange: (v: AutonomyLevel) => void }) {
  const cfg = AUTONOMY_LABELS[value]
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {([1, 2, 3, 4] as AutonomyLevel[]).map(level => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 py-2 rounded-lg text-[11px] font-mono transition-all duration-150 border',
              value === level
                ? `${AUTONOMY_LABELS[level].color} text-white border-transparent shadow-lg`
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600',
            )}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-2.5">
        <p className="text-zinc-200 text-[12px] font-semibold">{cfg.label}</p>
        <p className="text-zinc-500 text-[11px] mt-0.5">{cfg.desc}</p>
      </div>
    </div>
  )
}

// ─── GeneralAIPanel ───────────────────────────────────────────

interface GeneralAIPanelProps {
  activeSection: 'general' | 'ai-behavior'
}

export function GeneralAIPanel({ activeSection }: GeneralAIPanelProps) {
  const general    = useSettingsStore(s => s.general)
  const aiBehavior = useSettingsStore(s => s.aiBehavior)
  const setGeneral = useSettingsStore(s => s.setGeneral)
  const setAI      = useSettingsStore(s => s.setAIBehavior)

  if (activeSection === 'general') {
    return (
      <div className="max-w-2xl space-y-1">
        <SectionTitle>Appearance</SectionTitle>

        <SettingRow label="Theme" hint="Visual style of the workspace interface.">
          <Select<AppTheme>
            value={general.theme}
            options={[
              { value: 'dark',     label: 'Dark (default)' },
              { value: 'midnight', label: 'Midnight' },
              { value: 'neon',     label: 'Neon' },
              { value: 'light',    label: 'Light' },
            ]}
            onChange={v => setGeneral({ theme: v })}
          />
        </SettingRow>

        <SettingRow label="Animation intensity" hint="Controls all motion, transitions and live state effects.">
          <Select<AnimationLevel>
            value={general.animationLevel}
            options={[
              { value: 'minimal',    label: 'Minimal' },
              { value: 'standard',   label: 'Standard' },
              { value: 'cinematic',  label: 'Cinematic' },
              { value: 'futuristic', label: 'Futuristic' },
            ]}
            onChange={v => setGeneral({ animationLevel: v })}
          />
        </SettingRow>

        <SettingRow label="Language">
          <Select<Language>
            value={general.language}
            options={[
              { value: 'en', label: 'English'  },
              { value: 'fr', label: 'Français'  },
              { value: 'es', label: 'Español'   },
              { value: 'de', label: 'Deutsch'   },
              { value: 'ja', label: '日本語'    },
              { value: 'zh', label: '中文'      },
            ]}
            onChange={v => setGeneral({ language: v })}
          />
        </SettingRow>

        <SectionTitle>Workspace</SectionTitle>

        <SettingRow label="Startup behavior" hint="What to show when the app first loads.">
          <Select
            value={general.startupWorkspace}
            options={[
              { value: 'last',    label: 'Last workspace' },
              { value: 'empty',   label: 'Empty workspace' },
              { value: 'default', label: 'Default workspace' },
            ]}
            onChange={v => setGeneral({ startupWorkspace: v as 'last' | 'empty' | 'default' })}
          />
        </SettingRow>

        <SettingRow label="Show agents by default" hint="Display the co-worker sidebar on startup.">
          <Toggle
            value={general.defaultAgentVisible}
            onChange={v => setGeneral({ defaultAgentVisible: v })}
          />
        </SettingRow>

        <SectionTitle>Notifications</SectionTitle>

        {([
          { key: 'approvals',    label: 'Approval requests',    hint: 'Alert when an agent needs permission to act.' },
          { key: 'taskComplete', label: 'Task completed',       hint: 'Notify when a task finishes.' },
          { key: 'agentWarnings',label: 'Agent warnings',       hint: 'Show when an agent encounters an issue.' },
          { key: 'memoryUpdates',label: 'Memory updates',       hint: 'Show when memory entries are created or changed.' },
          { key: 'sound',        label: 'Sound effects',        hint: 'Play subtle audio cues.' },
        ] as const).map(n => (
          <SettingRow key={n.key} label={n.label} hint={n.hint}>
            <Toggle
              value={general.notifications[n.key]}
              onChange={v => setGeneral({ notifications: { ...general.notifications, [n.key]: v } })}
            />
          </SettingRow>
        ))}
      </div>
    )
  }

  // ── AI Behavior section ──────────────────────────────────
  return (
    <div className="max-w-2xl space-y-1">
      <SectionTitle>Autonomy</SectionTitle>

      <div className="py-3">
        <p className="text-zinc-200 text-[13px] font-medium mb-1">Global autonomy level</p>
        <p className="text-zinc-500 text-[11px] mb-3">
          Controls how independently agents act. Individual agents can override this.
        </p>
        <AutonomySlider
          value={aiBehavior.autonomyLevel}
          onChange={v => setAI({ autonomyLevel: v })}
        />
      </div>

      <SettingRow
        label="Plan before execute"
        hint="Agents produce a visible plan and wait for approval before taking action."
      >
        <Toggle value={aiBehavior.planBeforeExecute} onChange={v => setAI({ planBeforeExecute: v })} />
      </SettingRow>

      <SettingRow
        label="Auto-approve safe actions"
        hint="Safe-risk tools (file reads, searches) skip the approval step."
      >
        <Toggle value={aiBehavior.autoApproveSafe} onChange={v => setAI({ autoApproveSafe: v })} />
      </SettingRow>

      <SectionTitle>Communication</SectionTitle>

      <SettingRow label="Response style" hint="How detailed agent messages are by default.">
        <Select<ResponseStyle>
          value={aiBehavior.responseStyle}
          options={[
            { value: 'concise',   label: 'Concise'    },
            { value: 'balanced',  label: 'Balanced'   },
            { value: 'detailed',  label: 'Detailed'   },
            { value: 'developer', label: 'Developer'  },
          ]}
          onChange={v => setAI({ responseStyle: v })}
        />
      </SettingRow>

      <SettingRow label="Reasoning visibility" hint="How much of the AI's internal reasoning is shown.">
        <Select<ReasoningView>
          value={aiBehavior.reasoningVisibility}
          options={[
            { value: 'hidden',  label: 'Hidden'        },
            { value: 'summary', label: 'Summary only'  },
            { value: 'full',    label: 'Full trace'    },
          ]}
          onChange={v => setAI({ reasoningVisibility: v })}
        />
      </SettingRow>

      <SettingRow
        label="Thinking layer in chat"
        hint="Show collapsible AI reasoning blocks inside the chat stream."
      >
        <Toggle value={aiBehavior.thinkingLayerInChat} onChange={v => setAI({ thinkingLayerInChat: v })} />
      </SettingRow>

      <SectionTitle>Proactive behaviour</SectionTitle>

      <SettingRow label="Proactive AI mode" hint="How often agents suggest actions unprompted.">
        <Select<ProactiveLevel>
          value={aiBehavior.proactiveMode}
          options={[
            { value: 'off',    label: 'Off'    },
            { value: 'low',    label: 'Low'    },
            { value: 'medium', label: 'Medium' },
            { value: 'high',   label: 'High'   },
          ]}
          onChange={v => setAI({ proactiveMode: v })}
        />
      </SettingRow>
    </div>
  )
}
