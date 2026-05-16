'use client'
// ============================================================
// SettingsModal — Phase 09, Task 1
// Full-screen settings overlay with left nav + panel routing.
// Dark, terminal-adjacent aesthetic with subtle glow accents.
// ============================================================
import { useState, useEffect }      from 'react'
import { motion, AnimatePresence }   from 'framer-motion'
import { useSettingsStore }          from '@/store/settings.store'
import { GeneralAIPanel }           from './panels/GeneralAIPanel'
import { AgentsToolsPanel }         from './panels/AgentsToolsPanel'
import { MemoryStepsPanel }         from './panels/MemoryStepsPanel'
import { IntegrationsSecurityPanel } from './panels/IntegrationsSecurityPanel'
import { cn }                        from '@/lib/utils'

// ─── Nav items ────────────────────────────────────────────────

type PanelId =
  | 'general'
  | 'ai-behavior'
  | 'agents'
  | 'tools'
  | 'memory'
  | 'ai-steps'
  | 'integrations'
  | 'security'

interface NavItem {
  id:       PanelId
  label:    string
  icon:     string
  group?:   string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'general',      label: 'General',       icon: '⚙',  group: 'WORKSPACE'     },
  { id: 'ai-behavior',  label: 'AI Behavior',   icon: '🧠', group: 'WORKSPACE'     },
  { id: 'agents',       label: 'Agents',        icon: '👤', group: 'COWORKERS'     },
  { id: 'tools',        label: 'Tools & Perms', icon: '🔧', group: 'COWORKERS'     },
  { id: 'memory',       label: 'Memory',        icon: '💾', group: 'SYSTEM'        },
  { id: 'ai-steps',     label: 'AI Steps',      icon: '⚡', group: 'SYSTEM'        },
  { id: 'integrations', label: 'Integrations',  icon: '🔌', group: 'CONNECTIONS'   },
  { id: 'security',     label: 'Security',      icon: '🛡', group: 'CONNECTIONS'   },
]

// Group the nav for visual separation
const GROUPS = ['WORKSPACE', 'COWORKERS', 'SYSTEM', 'CONNECTIONS']

// ─── Panel routing ────────────────────────────────────────────

function resolvePanel(id: PanelId) {
  switch (id) {
    case 'general':
    case 'ai-behavior':
      return <GeneralAIPanel activeSection={id} />

    case 'agents':
    case 'tools':
      return <AgentsToolsPanel activeSection={id} />

    case 'memory':
    case 'ai-steps':
      return <MemoryStepsPanel activeSection={id} />

    case 'integrations':
    case 'security':
      return <IntegrationsSecurityPanel activeSection={id} />
  }
}

// ─── SettingsModal ────────────────────────────────────────────

interface SettingsModalProps {
  open:     boolean
  onClose:  () => void
  defaultPanel?: PanelId
}

export function SettingsModal({ open, onClose, defaultPanel = 'general' }: SettingsModalProps) {
  const [activeId, setActiveId] = useState<PanelId>(defaultPanel)
  const [dirty, setDirty]       = useState(false)

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Track dirty state for unsaved indicator
  const unsubscribe = useSettingsStore.subscribe(() => setDirty(true))

  function handleClose() {
    setDirty(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.97,  y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'fixed inset-4 z-50 md:inset-8 lg:inset-12 xl:inset-16',
              'flex overflow-hidden rounded-2xl',
              'border border-zinc-800/80',
              'bg-zinc-950 shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)]',
            )}
          >
            {/* ── Left nav ────────────────────────────────── */}
            <nav className="w-52 shrink-0 flex flex-col bg-zinc-900/60 border-r border-zinc-800/60">
              {/* Header */}
              <div className="px-4 py-4 border-b border-zinc-800/60">
                <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
                  Control Center
                </p>
                <p className="text-white text-sm font-semibold mt-0.5">Settings</p>
              </div>

              {/* Nav groups */}
              <div className="flex-1 overflow-y-auto py-2">
                {GROUPS.map(group => {
                  const items = NAV_ITEMS.filter(n => n.group === group)
                  return (
                    <div key={group} className="mb-1">
                      <p className="px-4 pt-3 pb-1 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                        {group}
                      </p>
                      {items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setActiveId(item.id)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-all duration-150',
                            'text-[13px] rounded-none',
                            activeId === item.id
                              ? 'bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-500'
                              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                          )}
                        >
                          <span className="text-[15px] w-5 text-center">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-zinc-800/60">
                {dirty && (
                  <p className="text-[10px] font-mono text-amber-500/80 mb-2">
                    ● Changes auto-saved
                  </p>
                )}
                <button
                  onClick={handleClose}
                  className="w-full py-1.5 rounded-lg text-[12px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Close  esc
                </button>
              </div>
            </nav>

            {/* ── Panel area ──────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800/60 shrink-0">
                {NAV_ITEMS.find(n => n.id === activeId) && (
                  <>
                    <span className="text-xl">
                      {NAV_ITEMS.find(n => n.id === activeId)!.icon}
                    </span>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {NAV_ITEMS.find(n => n.id === activeId)!.label}
                      </p>
                      <p className="text-zinc-500 text-[11px] font-mono">
                        {NAV_ITEMS.find(n => n.id === activeId)!.group}
                      </p>
                    </div>
                  </>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      const section = activeId.replace('-', '') as never
                      useSettingsStore.getState().resetSection(section)
                    }}
                    className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Reset to defaults
                  </button>
                </div>
              </div>

              {/* Scrollable panel content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeId}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{   opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {resolvePanel(activeId)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Trigger button (drop-in for top bar) ────────────────────

interface SettingsButtonProps {
  className?: string
}

export function SettingsButton({ className }: SettingsButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono',
          'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors',
          className
        )}
      >
        ⚙ Settings
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
