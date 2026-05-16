'use client'
// ============================================================
// IntegrationsSecurityPanel — Phase 09, Tasks 8 & 9
// Integrations: AI providers, GitHub, Firebase, model routing
// Security: approval strictness, risk blocking, audit logging
// ============================================================
import { useState }         from 'react'
import { useSettingsStore }  from '@/store/settings.store'
import type {
  ModelProvider, ModelRoutingMode, ApprovalStrictness,
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
      <div className="flex-1 min-w-0">
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

// ─── API key input (masked) ───────────────────────────────────

function ApiKeyInput({ value, onChange, placeholder = 'sk-…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex gap-1.5 w-full">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500 min-w-0"
      />
      <button
        onClick={() => setVisible(v => !v)}
        className="px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-[11px] font-mono"
      >
        {visible ? 'hide' : 'show'}
      </button>
    </div>
  )
}

// ─── Provider card ────────────────────────────────────────────

const PROVIDER_META: Record<ModelProvider, { name: string; icon: string; placeholder: string }> = {
  gemini:     { name: 'Gemini',     icon: '✦', placeholder: 'AIza…' },
  groq:       { name: 'Groq',       icon: '⚡', placeholder: 'gsk_…' },
  openrouter: { name: 'OpenRouter', icon: '🔀', placeholder: 'sk-or-…' },
  ollama:     { name: 'Ollama',     icon: '🦙', placeholder: '(local — no key needed)' },
}

interface ProviderCardProps {
  providerId: ModelProvider
}

function ProviderCard({ providerId }: ProviderCardProps) {
  const meta        = PROVIDER_META[providerId]
  const provider    = useSettingsStore(s => s.integrations.providers[providerId])
  const setInts     = useSettingsStore(s => s.setIntegrations)
  const integrations = useSettingsStore(s => s.integrations)

  function update(patch: Partial<typeof provider>) {
    setInts({
      providers: {
        ...integrations.providers,
        [providerId]: { ...provider, ...patch },
      },
    })
  }

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-colors',
      provider.enabled ? 'border-indigo-700/40 bg-indigo-950/10' : 'border-zinc-800 bg-zinc-900/30',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span className="text-zinc-200 font-medium text-[13px]">{meta.name}</span>
        </div>
        <Toggle value={provider.enabled} onChange={v => update({ enabled: v })} />
      </div>

      {provider.enabled && (
        <div className="space-y-2.5">
          {providerId !== 'ollama' && (
            <div>
              <p className="text-[11px] text-zinc-500 mb-1">API Key</p>
              <ApiKeyInput
                value={provider.apiKey}
                onChange={v => update({ apiKey: v })}
                placeholder={meta.placeholder}
              />
            </div>
          )}

          {providerId === 'ollama' && (
            <div>
              <p className="text-[11px] text-zinc-500 mb-1">Base URL</p>
              <input
                value={(provider as { baseUrl?: string }).baseUrl ?? 'http://localhost:11434'}
                onChange={e => update({ baseUrl: e.target.value } as never)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none"
              />
            </div>
          )}

          <div>
            <p className="text-[11px] text-zinc-500 mb-1">Default model</p>
            <input
              value={provider.defaultModel}
              onChange={e => update({ defaultModel: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Model routing rules table ────────────────────────────────

function ModelRoutingTable() {
  const integrations = useSettingsStore(s => s.integrations)
  const setInts      = useSettingsStore(s => s.setIntegrations)
  const rules        = integrations.modelRouting.rules

  function updateRule(idx: number, patch: Partial<typeof rules[0]>) {
    const updated = rules.map((r, i) => i === idx ? { ...r, ...patch } : r)
    setInts({ modelRouting: { ...integrations.modelRouting, rules: updated } })
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <div className="grid grid-cols-3 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800">
        {['Task type', 'Provider', 'Model'].map(h => (
          <span key={h} className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">{h}</span>
        ))}
      </div>
      {rules.map((rule, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 px-4 py-2.5 border-b border-zinc-900 last:border-0 items-center">
          <input
            value={rule.taskType}
            onChange={e => updateRule(i, { taskType: e.target.value })}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-zinc-600 w-full"
          />
          <select
            value={rule.provider}
            onChange={e => updateRule(i, { provider: e.target.value as ModelProvider })}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-400 focus:outline-none w-full"
          >
            {(['gemini','groq','openrouter','ollama'] as ModelProvider[]).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            value={rule.modelId}
            onChange={e => updateRule(i, { modelId: e.target.value })}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-zinc-400 focus:outline-none w-full"
          />
        </div>
      ))}
    </div>
  )
}

// ─── Security strictness selector ────────────────────────────

const STRICTNESS_INFO: Record<ApprovalStrictness, { desc: string; color: string }> = {
  low:    { desc: 'Minimal prompts. Only critical actions require approval.',   color: 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300' },
  medium: { desc: 'Balanced. Medium and high-risk actions ask for approval.',   color: 'border-amber-600/40 bg-amber-950/20 text-amber-300'   },
  high:   { desc: 'Strict. Nearly all tool actions require explicit approval.', color: 'border-rose-600/40 bg-rose-950/20 text-rose-300'     },
}

// ─── IntegrationsSecurityPanel ────────────────────────────────

interface IntegrationsSecurityPanelProps {
  activeSection: 'integrations' | 'security'
}

export function IntegrationsSecurityPanel({ activeSection }: IntegrationsSecurityPanelProps) {
  const integrations = useSettingsStore(s => s.integrations)
  const security     = useSettingsStore(s => s.security)
  const setInts      = useSettingsStore(s => s.setIntegrations)
  const setSec       = useSettingsStore(s => s.setSecurity)
  const [newDomain, setNewDomain] = useState('')

  if (activeSection === 'integrations') {
    return (
      <div className="max-w-2xl">
        <SectionTitle>AI Providers</SectionTitle>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['gemini', 'groq', 'openrouter', 'ollama'] as ModelProvider[]).map(id => (
            <ProviderCard key={id} providerId={id} />
          ))}
        </div>

        <SectionTitle>Model Routing</SectionTitle>

        <SettingRow label="Routing strategy" hint="How the system picks which model to use per task.">
          <select
            value={integrations.modelRouting.mode}
            onChange={e => setInts({ modelRouting: { ...integrations.modelRouting, mode: e.target.value as ModelRoutingMode } })}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none"
          >
            {[
              { value: 'task-based', label: 'Task-based routing' },
              { value: 'cost',       label: 'Cost optimized'     },
              { value: 'speed',      label: 'Speed priority'     },
              { value: 'quality',    label: 'Quality priority'   },
            ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>

        <div className="mt-3">
          <p className="text-[11px] text-zinc-500 mb-2">Per-task routing rules</p>
          <ModelRoutingTable />
        </div>

        <SectionTitle>External Connections</SectionTitle>

        {/* GitHub */}
        <div className={cn('rounded-xl border p-4 mb-3 transition-colors', integrations.github.enabled ? 'border-indigo-700/40 bg-indigo-950/10' : 'border-zinc-800')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>🐙</span>
              <span className="text-zinc-200 font-medium text-[13px]">GitHub</span>
            </div>
            <Toggle
              value={integrations.github.enabled}
              onChange={v => setInts({ github: { ...integrations.github, enabled: v } })}
            />
          </div>
          {integrations.github.enabled && (
            <div className="space-y-2">
              <div>
                <p className="text-[11px] text-zinc-500 mb-1">Personal access token</p>
                <ApiKeyInput
                  value={integrations.github.token}
                  onChange={v => setInts({ github: { ...integrations.github, token: v } })}
                  placeholder="ghp_…"
                />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 mb-1">Default repository</p>
                <input
                  value={integrations.github.defaultRepo}
                  onChange={e => setInts({ github: { ...integrations.github, defaultRepo: e.target.value } })}
                  placeholder="owner/repo"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Firebase + Supabase row */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'firebase', icon: '🔥', name: 'Firebase', field: 'projectId', placeholder: 'my-project' },
            { key: 'supabase', icon: '⚡', name: 'Supabase', field: 'projectUrl', placeholder: 'https://xxx.supabase.co' },
          ].map(({ key, icon, name, field, placeholder }) => {
            const cfg = integrations[key as 'firebase' | 'supabase']
            return (
              <div key={key} className={cn('rounded-xl border p-4 transition-colors', cfg.enabled ? 'border-indigo-700/40 bg-indigo-950/10' : 'border-zinc-800')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-zinc-200 font-medium text-[13px]">{name}</span>
                  </div>
                  <Toggle
                    value={cfg.enabled}
                    onChange={v => setInts({ [key]: { ...cfg, enabled: v } } as never)}
                  />
                </div>
                {cfg.enabled && (
                  <input
                    value={(cfg as Record<string, string>)[field] ?? ''}
                    onChange={e => setInts({ [key]: { ...cfg, [field]: e.target.value } } as never)}
                    placeholder={placeholder}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Security section ─────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <SectionTitle>Approval Strictness</SectionTitle>

      <div className="space-y-2 mb-6">
        {(['low', 'medium', 'high'] as ApprovalStrictness[]).map(level => (
          <button
            key={level}
            onClick={() => setSec({ approvalStrictness: level })}
            className={cn(
              'w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all',
              security.approvalStrictness === level
                ? STRICTNESS_INFO[level].color
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            <span className={cn(
              'w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5',
              security.approvalStrictness === level ? 'border-current bg-current' : 'border-zinc-600',
            )} />
            <div>
              <p className="font-semibold text-[12px] capitalize">{level}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{STRICTNESS_INFO[level].desc}</p>
            </div>
          </button>
        ))}
      </div>

      <SectionTitle>Risk Blocking</SectionTitle>

      {([
        { key: 'disableHighRisk',     label: 'Disable high-risk tools',       hint: 'Completely prevent terminal, delete, and DB tools from running.' },
        { key: 'requireManualAlways', label: 'Always require manual approval', hint: 'Every tool call, regardless of risk, needs explicit user confirmation.' },
        { key: 'sandboxOnly',         label: 'Sandbox mode only',              hint: 'Agents can execute freely but only inside the safe sandbox. No external systems.' },
      ] as const).map(r => (
        <SettingRow key={r.key} label={r.label} hint={r.hint}>
          <Toggle
            value={security.riskBlocking[r.key]}
            onChange={v => setSec({ riskBlocking: { ...security.riskBlocking, [r.key]: v } })}
          />
        </SettingRow>
      ))}

      <SectionTitle>API Domain Controls</SectionTitle>

      <div className="mb-3">
        <p className="text-[11px] text-zinc-500 mb-2">Allowed external domains</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {security.externalApis.allowedDomains.map(d => (
            <span key={d} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/30 text-emerald-400 border border-emerald-800/40">
              {d}
              <button onClick={() => setSec({ externalApis: { ...security.externalApis, allowedDomains: security.externalApis.allowedDomains.filter(x => x !== d) } })}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newDomain.trim()) {
                setSec({ externalApis: { ...security.externalApis, allowedDomains: [...security.externalApis.allowedDomains, newDomain.trim()] } })
                setNewDomain('')
              }
            }}
            placeholder="api.example.com"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={() => {
              if (!newDomain.trim()) return
              setSec({ externalApis: { ...security.externalApis, allowedDomains: [...security.externalApis.allowedDomains, newDomain.trim()] } })
              setNewDomain('')
            }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <SectionTitle>Audit Logging</SectionTitle>

      <SettingRow label="Enable audit logging" hint="Record every tool call and agent decision to the persistent log.">
        <Toggle
          value={security.auditLogging.enabled}
          onChange={v => setSec({ auditLogging: { ...security.auditLogging, enabled: v } })}
        />
      </SettingRow>

      <SettingRow label="Full trace recording" hint="Store complete input/output for every tool execution. Increases storage usage.">
        <Toggle
          value={security.auditLogging.fullTrace}
          onChange={v => setSec({ auditLogging: { ...security.auditLogging, fullTrace: v } })}
        />
      </SettingRow>
    </div>
  )
}
