'use client'
// ============================================================
// TerminalPanel — Phase 10, Task 5
// xterm.js terminal connected to node-pty via Electron IPC.
// Supports multiple sessions, auto-resize, and Operon theming.
// ============================================================
import { useEffect, useRef, useState }   from 'react'
import { useOperonIDEStore }              from '@/store/operon-ide.store'
import { IS_ELECTRON }                   from '@/config/operon'
import { cn }                            from '@/lib/utils'

// xterm.js — install: npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
import { Terminal }        from '@xterm/xterm'
import { FitAddon }        from '@xterm/addon-fit'
import { WebLinksAddon }   from '@xterm/addon-web-links'

// ─── Operon xterm theme ───────────────────────────────────────

const OPERON_TERM_THEME = {
  background:    '#09090b',   // zinc-950
  foreground:    '#e2e8f0',   // slate-200
  cursor:        '#6366f1',   // indigo-500
  cursorAccent:  '#09090b',
  selectionBackground: '#312e8166',
  black:         '#18181b',
  red:           '#f87171',
  green:         '#34d399',
  yellow:        '#fbbf24',
  blue:          '#818cf8',
  magenta:       '#c084fc',
  cyan:          '#67e8f9',
  white:         '#e2e8f0',
  brightBlack:   '#3f3f46',
  brightRed:     '#fc8181',
  brightGreen:   '#6ee7b7',
  brightYellow:  '#fcd34d',
  brightBlue:    '#a5b4fc',
  brightMagenta: '#d8b4fe',
  brightCyan:    '#a5f3fc',
  brightWhite:   '#f8fafc',
}

// ─── Single terminal instance ─────────────────────────────────

interface TermInstanceProps {
  termId:   string
  isActive: boolean
}

function TermInstance({ termId, isActive }: TermInstanceProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const xtermRef       = useRef<Terminal | null>(null)
  const fitAddonRef    = useRef<FitAddon | null>(null)
  const isInitialized  = useRef(false)

  const workspaceRoot  = useOperonIDEStore(s => s.workspaceRoot)
  const updateTermCwd  = useOperonIDEStore(s => s.updateTerminalCwd)

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return
    isInitialized.current = true

    const xterm = new Terminal({
      theme:       OPERON_TERM_THEME,
      fontFamily:  '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
      fontSize:    13,
      lineHeight:  1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback:  5000,
    })

    const fitAddon       = new FitAddon()
    const webLinksAddon  = new WebLinksAddon()

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)
    xterm.open(containerRef.current)
    fitAddon.fit()

    xtermRef.current    = xterm
    fitAddonRef.current = fitAddon

    // Welcome message
    xterm.writeln('\x1b[38;5;99m  ██████╗ ██████╗ ███████╗██████╗  ██████╗ ███╗  ██╗\x1b[0m')
    xterm.writeln('\x1b[38;5;99m ██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔═══██╗████╗ ██║\x1b[0m')
    xterm.writeln('\x1b[38;5;105m ██║   ██║██████╔╝█████╗  ██████╔╝██║   ██║██╔██╗██║\x1b[0m')
    xterm.writeln('\x1b[38;5;105m ██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██║   ██║██║╚████║\x1b[0m')
    xterm.writeln('\x1b[38;5;111m ╚██████╔╝██║     ███████╗██║  ██║╚██████╔╝██║ ╚███║\x1b[0m')
    xterm.writeln('\x1b[38;5;111m  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚══╝\x1b[0m')
    xterm.writeln('')
    xterm.writeln('\x1b[38;5;240m  Operon IDE Terminal — Full computer access\x1b[0m')
    xterm.writeln('')

    if (IS_ELECTRON) {
      // Create real node-pty terminal
      window.operon.terminal.create(termId, workspaceRoot || process.env.HOME || '/')
        .then(({ pid }) => {
          useOperonIDEStore.getState().terminals.find(t => t.id === termId) &&
            console.log(`[Terminal] PID ${pid} created for ${termId}`)
        })

      // Stream output from main process
      const unsubOutput = window.operon.terminal.onOutput(ev => {
        if (ev.termId !== termId) return
        xterm.write(ev.data)
      })

      // Send keystrokes to main process
      xterm.onData(data => {
        window.operon.terminal.input(termId, data)
      })

      // Resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit()
        window.operon.terminal.resize(termId, xterm.cols, xterm.rows)
      })
      resizeObserver.observe(containerRef.current!)

      return () => {
        unsubOutput()
        resizeObserver.disconnect()
        xterm.dispose()
        window.operon.terminal.kill(termId)
      }
    } else {
      // Web fallback: local echo only
      xterm.writeln('\x1b[33m  Running in browser mode — terminal requires Electron\x1b[0m\r\n')
      xterm.onData(data => {
        if (data === '\r') xterm.writeln('')
        else xterm.write(data)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId])

  // Fit on visibility change
  useEffect(() => {
    if (isActive) {
      setTimeout(() => fitAddonRef.current?.fit(), 50)
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-full', !isActive && 'hidden')}
      style={{ padding: '4px 8px' }}
    />
  )
}

// ─── TerminalPanel ────────────────────────────────────────────

interface TerminalPanelProps {
  className?: string
}

export function TerminalPanel({ className }: TerminalPanelProps) {
  const terminals      = useOperonIDEStore(s => s.terminals)
  const activeTermId   = useOperonIDEStore(s => s.activeTermId)
  const createTerminal = useOperonIDEStore(s => s.createTerminal)
  const closeTerminal  = useOperonIDEStore(s => s.closeTerminal)
  const setActive      = useOperonIDEStore(s => s.setActiveTerminal)
  const workspaceRoot  = useOperonIDEStore(s => s.workspaceRoot)

  // Create a default terminal if none exist
  useEffect(() => {
    if (terminals.length === 0) {
      createTerminal(workspaceRoot)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('flex flex-col bg-zinc-950', className)}>
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800/60 shrink-0">
        <div className="flex overflow-x-auto flex-1">
          {terminals.map(term => (
            <button
              key={term.id}
              onClick={() => setActive(term.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono shrink-0',
                'border-r border-zinc-800/60 transition-colors group',
                term.id === activeTermId
                  ? 'bg-zinc-900 text-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300',
              )}
            >
              <span className="text-emerald-500">$</span>
              {term.title}
              <span
                onClick={e => { e.stopPropagation(); closeTerminal(term.id) }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 ml-1"
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* New terminal button */}
        <button
          onClick={() => createTerminal(workspaceRoot)}
          className="px-3 py-1.5 text-zinc-500 hover:text-zinc-300 text-[14px] transition-colors shrink-0 border-l border-zinc-800/60"
          title="New terminal"
        >
          +
        </button>
      </div>

      {/* Terminal instances (all rendered, hidden when inactive) */}
      <div className="flex-1 overflow-hidden relative">
        {terminals.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-700 font-mono text-sm">
            No terminal. Click + to create one.
          </div>
        ) : (
          terminals.map(term => (
            <TermInstance
              key={term.id}
              termId={term.id}
              isActive={term.id === activeTermId}
            />
          ))
        )}
      </div>
    </div>
  )
}
