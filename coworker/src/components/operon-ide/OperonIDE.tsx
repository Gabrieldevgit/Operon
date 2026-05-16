'use client'
// ============================================================
// OperonIDE — Phase 10, Task 3
// Full IDE shell layout.
//
//  ┌─────────────────────────────────────────────────────────┐
//  │  Title bar (traffic lights + title + palette + controls) │
//  ├──────────┬──────────────────────────────┬───────────────┤
//  │          │   Editor tab bar              │               │
//  │ Sidebar  │──────────────────────────────│  Agents /     │
//  │ (file    │   Monaco editor               │  AI Steps /   │
//  │  tree)   │   (main editing surface)      │  Memory /     │
//  │          │                               │  Diff         │
//  │          ├──────────────────────────────┤               │
//  │          │   Terminal / Output / Steps   │               │
//  ├──────────┴──────────────────────────────┴───────────────┤
//  │  Status bar (file info, cursor, sync status, git)        │
//  └─────────────────────────────────────────────────────────┘
// ============================================================
import { useRef, useCallback, Suspense, lazy } from 'react'
import { useOperonIDEStore, useActiveTab, useDirtyCount } from '@/store/operon-ide.store'
import { OPERON, IS_ELECTRON }  from '@/config/operon'
import { SyncStatusDot }        from '@/lib/ide/sync-engine'
import { ProjectTree }          from '@/components/ide/ProjectTree'
import { CodeEditor, EditorTabBar } from './CodeEditor'
import { TerminalPanel }        from './TerminalPanel'
import { CommandPalette }       from './CommandPalette'
import { fsBridge }             from '@/server/filesystem'
import { cn }                   from '@/lib/utils'

// Lazy-load heavy right-panel components
const AgentPanel   = lazy(() => import('@/components/workspace/AgentPanel').then(m => ({ default: m.AgentPanel })))
const StepsPanel   = lazy(() => import('@/components/workspace/StepsPanel').then(m => ({ default: m.StepsPanel })))
const MemoryPanel  = lazy(() => import('@/components/workspace/MemoryPanel').then(m => ({ default: m.MemoryPanel })))
const DiffViewer   = lazy(() => import('@/components/ide/DiffViewer').then(m => ({ default: m.DiffViewer })))

// ─── Resize handle ────────────────────────────────────────────

type ResizeDir = 'horizontal' | 'vertical'

interface ResizeHandleProps {
  direction: ResizeDir
  onDrag:    (delta: number) => void
}

function ResizeHandle({ direction, onDrag }: ResizeHandleProps) {
  const isH = direction === 'horizontal'
  const startRef = useRef<number | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = isH ? e.clientX : e.clientY
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (startRef.current === null) return
    const cur = isH ? e.clientX : e.clientY
    onDrag(cur - startRef.current)
    startRef.current = cur
  }

  const onPointerUp = () => { startRef.current = null }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        'shrink-0 group transition-colors bg-transparent hover:bg-indigo-500/20 active:bg-indigo-500/40',
        isH ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
      )}
    />
  )
}

// ─── Title bar ────────────────────────────────────────────────

function TitleBar() {
  const projectName = useOperonIDEStore(s => s.projectName)
  const dirtyCount  = useDirtyCount()
  const isLoading   = useOperonIDEStore(s => s.isLoading)
  const layout      = useOperonIDEStore(s => s.layout)
  const store       = useOperonIDEStore()

  return (
    <div
      className="flex items-center h-10 px-4 shrink-0 bg-zinc-950 border-b border-zinc-800/60 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Traffic lights placeholder (macOS handles real ones) */}
      {IS_ELECTRON && (
        <div className="flex gap-1.5 mr-4 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={() => window.operon.window.close()}    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" />
          <button onClick={() => window.operon.window.minimize()} className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-300 transition-colors" />
          <button onClick={() => window.operon.window.maximize()} className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors" />
        </div>
      )}

      {/* Operon wordmark */}
      <span className="text-[13px] font-bold tracking-tight mr-2" style={{ color: OPERON.colors.accent }}>
        Operon
      </span>
      <span className="text-zinc-600 text-[12px] font-mono">/</span>
      <span className="text-zinc-400 text-[12px] font-mono ml-2">{projectName}</span>
      {dirtyCount > 0 && (
        <span className="ml-2 text-[10px] font-mono text-amber-400">● {dirtyCount} unsaved</span>
      )}
      {isLoading && (
        <span className="ml-2 text-[10px] font-mono text-zinc-500 animate-pulse">loading…</span>
      )}

      {/* Draggable spacer */}
      <div className="flex-1" />

      {/* Controls — no-drag zone */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <CommandPalette />

        <SyncStatusDot className="ml-2" />

        {/* Panel toggles */}
        {[
          { icon: '⬛', active: layout.sidebarVisible, action: store.toggleSidebar,  title: 'Toggle sidebar (⌘B)' },
          { icon: '⌨',  active: layout.bottomVisible,  action: store.toggleBottom,   title: 'Toggle terminal (⌘J)' },
          { icon: '🧑‍💼', active: layout.rightVisible,   action: store.toggleRight,    title: 'Toggle agents panel' },
        ].map(btn => (
          <button
            key={btn.icon}
            onClick={btn.action}
            title={btn.title}
            className={cn(
              'w-7 h-7 rounded flex items-center justify-center text-sm transition-colors',
              btn.active ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 hover:text-zinc-400',
            )}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Right panel tabs ─────────────────────────────────────────

function RightPanel({ className }: { className?: string }) {
  const rightTab = useOperonIDEStore(s => s.layout.rightTab)
  const setRight = useOperonIDEStore(s => s.setRightTab)

  const TABS = [
    { id: 'agents', label: 'Agents', icon: '🧑‍💼' },
    { id: 'steps',  label: 'Steps',  icon: '⚡'  },
    { id: 'memory', label: 'Memory', icon: '💾'  },
    { id: 'diff',   label: 'Diff',   icon: '⬤'  },
  ] as const

  return (
    <div className={cn('flex flex-col bg-zinc-950', className)}>
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800/60 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setRight(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono transition-colors',
              'border-r border-zinc-800/60 flex-1 justify-center',
              rightTab === t.id
                ? 'text-zinc-200 border-b-2 border-b-indigo-500 bg-zinc-900/50'
                : 'text-zinc-600 hover:text-zinc-400',
            )}
          >
            <span className="text-xs">{t.icon}</span>
            <span className="hidden xl:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-700 text-sm font-mono">Loading…</div>}>
          {rightTab === 'agents' && <AgentPanel />}
          {rightTab === 'steps'  && <StepsPanel  />}
          {rightTab === 'memory' && <MemoryPanel />}
          {rightTab === 'diff'   && <DiffViewer  diff={{ path: '', language: '', hunks: [] }} readOnly className="h-full rounded-none border-0" />}
        </Suspense>
      </div>
    </div>
  )
}

// ─── Bottom panel tabs ────────────────────────────────────────

function BottomPanel({ className }: { className?: string }) {
  const bottomTab = useOperonIDEStore(s => s.layout.bottomTab)
  const setBottom = useOperonIDEStore(s => s.setBottomTab)

  const TABS = [
    { id: 'terminal', label: 'Terminal', icon: '$' },
    { id: 'output',   label: 'Output',   icon: '▶' },
    { id: 'problems', label: 'Problems', icon: '!' },
    { id: 'steps',    label: 'AI Steps', icon: '⚡'},
  ] as const

  return (
    <div className={cn('flex flex-col bg-zinc-950', className)}>
      <div className="flex border-b border-zinc-800/60 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setBottom(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-mono transition-colors border-r border-zinc-800/60',
              bottomTab === t.id
                ? 'text-zinc-200 border-b-2 border-b-indigo-500 bg-zinc-900/50'
                : 'text-zinc-600 hover:text-zinc-400',
            )}
          >
            <span className="font-mono">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {bottomTab === 'terminal' && <TerminalPanel className="h-full" />}
        {bottomTab === 'steps' && (
          <Suspense fallback={null}>
            <StepsPanel />
          </Suspense>
        )}
        {(bottomTab === 'output' || bottomTab === 'problems') && (
          <div className="flex items-center justify-center h-full text-zinc-700 font-mono text-sm">
            {bottomTab === 'output' ? 'No output yet.' : 'No problems detected.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Status bar ───────────────────────────────────────────────

function StatusBar() {
  const activeTab    = useActiveTab()
  const statusMsg    = useOperonIDEStore(s => s.statusMessage)
  const workspaceRoot= useOperonIDEStore(s => s.workspaceRoot)

  return (
    <div className="flex items-center justify-between h-6 px-4 shrink-0 bg-indigo-950/30 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-600 select-none">
      <div className="flex items-center gap-4">
        <span style={{ color: OPERON.colors.accent }}>⬡ Operon</span>
        {workspaceRoot && <span>{workspaceRoot.split('/').pop()}</span>}
        {statusMsg && <span className="text-zinc-400">{statusMsg}</span>}
      </div>
      <div className="flex items-center gap-4">
        {activeTab && (
          <>
            <span>{activeTab.language}</span>
            <span>Ln {activeTab.cursorLine}, Col {activeTab.cursorCol}</span>
            {activeTab.isDirty && <span className="text-amber-400">●</span>}
          </>
        )}
        <SyncStatusDot />
        <span>UTF-8</span>
      </div>
    </div>
  )
}

// ─── OperonIDE ────────────────────────────────────────────────

export function OperonIDE() {
  const layout   = useOperonIDEStore(s => s.layout)
  const setLayout= useOperonIDEStore(s => s.setLayout)
  const store    = useOperonIDEStore()

  // Open file from project tree
  const handleOpenFile = useCallback(async (filePath: string) => {
    store.setStatus('Opening…')
    try {
      const content = await fsBridge.readFile(filePath)
      store.openTab(filePath, content, true)   // preview tab
      store.setStatus(`Opened ${filePath.split('/').pop()}`, true)
    } catch (err) {
      store.setStatus(`Failed to open file: ${String(err)}`, true)
    }
  }, [store])

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 overflow-hidden font-mono">
      {/* Title bar */}
      <TitleBar />

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────── */}
        {layout.sidebarVisible && (
          <>
            <ProjectTree
              className="shrink-0 overflow-hidden"
              style={{ width: layout.sidebarWidth }}
              onOpenFile={handleOpenFile}
            />
            <ResizeHandle
              direction="horizontal"
              onDrag={d => setLayout({ sidebarWidth: Math.max(160, Math.min(480, layout.sidebarWidth + d)) })}
            />
          </>
        )}

        {/* ── Editor + bottom ───────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Tab bar */}
          <EditorTabBar className="shrink-0" />

          {/* Editor */}
          <div className="flex-1 overflow-hidden min-h-0">
            <CodeEditor className="w-full h-full" />
          </div>

          {/* Bottom panel */}
          {layout.bottomVisible && (
            <>
              <ResizeHandle
                direction="vertical"
                onDrag={d => setLayout({ bottomHeight: Math.max(100, Math.min(600, layout.bottomHeight - d)) })}
              />
              <BottomPanel
                className="shrink-0 border-t border-zinc-800/60"
                style={{ height: layout.bottomHeight }}
              />
            </>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────── */}
        {layout.rightVisible && (
          <>
            <ResizeHandle
              direction="horizontal"
              onDrag={d => setLayout({ rightWidth: Math.max(240, Math.min(600, layout.rightWidth - d)) })}
            />
            <RightPanel
              className="shrink-0 border-l border-zinc-800/60"
              style={{ width: layout.rightWidth }}
            />
          </>
        )}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
