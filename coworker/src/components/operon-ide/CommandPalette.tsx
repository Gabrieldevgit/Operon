'use client'
// ============================================================
// CommandPalette — Phase 10, Task 6
// Cmd+K command palette. Three modes:
//   >  IDE actions (toggle panels, open settings, run agents)
//   @  Operon agent commands (ask dev agent, run review, etc.)
//   (blank) File search across the project tree
// ============================================================
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence }    from 'framer-motion'
import { useOperonIDEStore }          from '@/store/operon-ide.store'
import { fsBridge }                   from '@/server/filesystem'
import { OPERON }                     from '@/config/operon'
import { bus }                        from '@/lib/events/bus'
import { cn }                         from '@/lib/utils'

// ─── Command types ────────────────────────────────────────────

type CommandCategory = 'file' | 'action' | 'agent' | 'recent'

interface Command {
  id:         string
  label:      string
  sublabel?:  string
  category:   CommandCategory
  icon:       string
  shortcut?:  string
  action:     () => void
}

// ─── Built-in IDE action commands ─────────────────────────────

function useIDECommands(): Command[] {
  const store = useOperonIDEStore()

  return useMemo(() => [
    // Layout
    { id: 'toggle-sidebar',  label: 'Toggle sidebar',       icon: '⬛', category: 'action', shortcut: '⌘B',   action: store.toggleSidebar  },
    { id: 'toggle-terminal', label: 'Toggle terminal',      icon: '⌨',  category: 'action', shortcut: '⌘J',   action: store.toggleBottom   },
    { id: 'toggle-agents',   label: 'Toggle agents panel',  icon: '🧑‍💼', category: 'action', shortcut: '⌘⇧A', action: store.toggleRight    },
    { id: 'new-terminal',    label: 'New terminal',         icon: '+',   category: 'action', shortcut: '⌘⇧`', action: () => store.createTerminal(store.workspaceRoot) },

    // Views
    { id: 'view-steps',      label: 'Show AI Steps',        icon: '⚡',  category: 'action', action: () => store.setRightTab('steps')   },
    { id: 'view-memory',     label: 'Show memory',          icon: '💾',  category: 'action', action: () => store.setRightTab('memory')  },
    { id: 'view-agents',     label: 'Show agents',          icon: '👤',  category: 'action', action: () => store.setRightTab('agents')  },
    { id: 'view-diff',       label: 'Show diff viewer',     icon: '⬤',  category: 'action', action: () => store.setRightTab('diff')    },

    // Agent commands
    {
      id: 'ask-orchestrator', label: 'Ask Orchestrator',    icon: '🔮', category: 'agent',
      sublabel: 'Delegate a task to the Orchestrator agent',
      action: () => {
        bus.emit('agent.switched', { agentId: 'orchestrator', agentName: 'Orchestrator', role: 'orchestration' })
        store.setRightTab('agents')
        store.setRightVisible(true)
      },
    },
    {
      id: 'ask-dev',          label: 'Ask Dev Agent',       icon: '💻', category: 'agent',
      sublabel: 'Write, refactor, or debug code',
      action: () => bus.emit('agent.switched', { agentId: 'dev', agentName: 'Dev Agent', role: 'development' }),
    },
    {
      id: 'ask-ui',           label: 'Ask UI Agent',        icon: '🎨', category: 'agent',
      sublabel: 'Design components and layouts',
      action: () => bus.emit('agent.switched', { agentId: 'ui', agentName: 'UI Agent', role: 'design' }),
    },
    {
      id: 'ask-reviewer',     label: 'Ask Reviewer',        icon: '🔍', category: 'agent',
      sublabel: 'Review code, detect bugs, audit security',
      action: () => bus.emit('agent.switched', { agentId: 'reviewer', agentName: 'Reviewer', role: 'review' }),
    },
    {
      id: 'run-review',       label: 'Run full code review', icon: '✅', category: 'agent',
      sublabel: 'Reviewer Agent audits the current file',
      action: () => {
        const { activeTabId, tabs } = useOperonIDEStore.getState()
        const tab = tabs.find(t => t.id === activeTabId)
        bus.emit('task.started', { taskId: 'review-' + Date.now(), agentId: 'reviewer', title: `Review ${tab?.fileName ?? 'file'}` })
      },
    },
  ], [store])
}

// ─── File search command ──────────────────────────────────────

async function searchFiles(query: string, root: string): Promise<Command[]> {
  if (!query.trim() || !root) return []

  const lower = query.toLowerCase()
  try {
    const allFiles: string[] = []
    const walk = async (dir: string, depth = 0) => {
      if (depth > 4) return
      const entries = await fsBridge.readDir(dir)
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue
        if (e.isDir) await walk(e.path, depth + 1)
        else if (e.name.toLowerCase().includes(lower)) allFiles.push(e.path)
      }
    }
    await walk(root)

    return allFiles.slice(0, 20).map(filePath => ({
      id:       `file:${filePath}`,
      label:    filePath.split('/').pop() ?? filePath,
      sublabel: filePath.replace(root, '').replace(/^\//, ''),
      category: 'file' as const,
      icon:     '📄',
      action:   async () => {
        const content = await fsBridge.readFile(filePath)
        useOperonIDEStore.getState().openTab(filePath, content)
      },
    }))
  } catch {
    return []
  }
}

// ─── CommandPalette ───────────────────────────────────────────

interface CommandPaletteProps {
  className?: string
}

export function CommandPalette({ className }: CommandPaletteProps) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(0)
  const [fileResults, setFiles] = useState<Command[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const workspaceRoot = useOperonIDEStore(s => s.workspaceRoot)
  const recentFiles   = useOperonIDEStore(s => s.recentFiles)
  const openTab       = useOperonIDEStore(s => s.openTab)
  const ideCommands   = useIDECommands()

  // ── Open / close ────────────────────────────────────────

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelected(0)
    setFiles([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  // Keyboard shortcut + custom event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open ? closePalette() : openPalette()
      }
      if (e.key === 'Escape') closePalette()
    }
    const onEvent = () => openPalette()

    window.addEventListener('keydown', onKey)
    window.addEventListener('operon:openPalette', onEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('operon:openPalette', onEvent)
    }
  }, [open, openPalette, closePalette])

  // ── Mode detection ───────────────────────────────────────

  const mode   = query.startsWith('>') ? 'action' : query.startsWith('@') ? 'agent' : 'file'
  const search = query.startsWith('>') || query.startsWith('@') ? query.slice(1).trim() : query.trim()

  // ── File search (debounced) ──────────────────────────────

  useEffect(() => {
    if (mode !== 'file') { setFiles([]); return }
    if (!search) { setFiles([]); return }

    setSearching(true)
    const timeout = setTimeout(async () => {
      const results = await searchFiles(search, workspaceRoot)
      setFiles(results)
      setSearching(false)
      setSelected(0)
    }, 200)
    return () => clearTimeout(timeout)
  }, [search, mode, workspaceRoot])

  // ── Build visible commands ───────────────────────────────

  const commands: Command[] = useMemo(() => {
    if (mode === 'file') {
      if (!search) {
        // Recent files
        return recentFiles.slice(0, 10).map(fp => ({
          id:       `recent:${fp}`,
          label:    fp.split('/').pop() ?? fp,
          sublabel: fp.replace(workspaceRoot, '').replace(/^\//, ''),
          category: 'recent' as const,
          icon:     '🕐',
          action:   async () => {
            const content = await fsBridge.readFile(fp)
            openTab(fp, content)
          },
        }))
      }
      return fileResults
    }

    const filter = (cmd: Command) =>
      !search || cmd.label.toLowerCase().includes(search.toLowerCase())

    if (mode === 'action') return ideCommands.filter(c => c.category !== 'agent').filter(filter)
    if (mode === 'agent')  return ideCommands.filter(c => c.category === 'agent').filter(filter)
    return []
  }, [mode, search, fileResults, ideCommands, recentFiles, workspaceRoot, openTab])

  // ── Keyboard navigation ──────────────────────────────────

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, commands.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      commands[selected]?.action()
      closePalette()
    }
  }

  const CATEGORY_COLORS: Record<CommandCategory, string> = {
    file:   'text-zinc-400',
    action: 'text-indigo-400',
    agent:  'text-cyan-400',
    recent: 'text-zinc-500',
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openPalette}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-mono',
          'text-zinc-500 hover:text-zinc-300 bg-zinc-900/60 border border-zinc-800',
          'hover:border-zinc-600 transition-colors',
          className,
        )}
      >
        <span>⌘</span><span>K</span>
        <span className="text-zinc-700 mx-1">·</span>
        <span>Command palette</span>
      </button>

      {/* Palette overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePalette}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              key="palette"
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1,    y: 0   }}
              exit={{   opacity: 0, scale: 0.96,  y: -16 }}
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              className={cn(
                'fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl',
                'rounded-2xl border border-zinc-700/60 overflow-hidden',
                'bg-zinc-950/95 backdrop-blur-xl',
                'shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),0_0_0_1px_rgba(99,102,241,0.1)]',
              )}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
                <span className="text-zinc-500 text-lg shrink-0">
                  {mode === 'file' ? '📄' : mode === 'action' ? '⚡' : '🧑‍💼'}
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(0) }}
                  onKeyDown={onKeyDown}
                  placeholder={
                    mode === 'file'   ? 'Search files…  (> for actions, @ for agents)' :
                    mode === 'action' ? 'IDE action…' :
                    'Agent command…'
                  }
                  className="flex-1 bg-transparent text-zinc-200 text-sm font-mono placeholder-zinc-600 focus:outline-none"
                />
                {searching && (
                  <span className="text-zinc-600 text-[11px] font-mono animate-pulse">searching…</span>
                )}
                <kbd className="text-[10px] font-mono text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-800">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-1">
                {commands.length === 0 && !searching && (
                  <p className="text-center py-8 text-zinc-600 text-sm font-mono">
                    {search ? 'No results' : 'Type to search…'}
                  </p>
                )}

                {commands.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => { cmd.action(); closePalette() }}
                    onMouseEnter={() => setSelected(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === selected ? 'bg-indigo-950/50' : 'hover:bg-zinc-900/60',
                    )}
                  >
                    <span className="text-base w-5 text-center shrink-0">{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[13px] font-medium truncate', CATEGORY_COLORS[cmd.category])}>
                        {cmd.label}
                      </p>
                      {cmd.sublabel && (
                        <p className="text-zinc-600 text-[11px] font-mono truncate">{cmd.sublabel}</p>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] font-mono text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>

              {/* Mode hints */}
              <div className="flex gap-4 px-4 py-2 border-t border-zinc-900/60">
                {[
                  { prefix: '',  label: 'Files'   },
                  { prefix: '>', label: 'Actions' },
                  { prefix: '@', label: 'Agents'  },
                ].map(m => (
                  <button
                    key={m.prefix}
                    onClick={() => { setQuery(m.prefix); inputRef.current?.focus() }}
                    className={cn(
                      'text-[10px] font-mono transition-colors',
                      (m.prefix === '' && mode === 'file') ||
                      (m.prefix === '>' && mode === 'action') ||
                      (m.prefix === '@' && mode === 'agent')
                        ? 'text-indigo-400'
                        : 'text-zinc-600 hover:text-zinc-400',
                    )}
                  >
                    {m.prefix && <span className="mr-0.5">{m.prefix}</span>}
                    {m.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
