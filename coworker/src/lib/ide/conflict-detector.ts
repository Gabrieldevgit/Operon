// ============================================================
// Conflict Detector — Phase 08, Task 7
// Multi-agent edit conflict detection + resolution system.
//
// When two agents try to edit the same file region simultaneously,
// the detector catches it, emits an event, and surfaces a
// ConflictResolver UI for the user to pick a winner or merge.
// ============================================================
import { useIDEStore } from '@/store/ide.store'
import { bus }         from '@/lib/events/bus'
import { nanoid }      from 'nanoid'

// ─── Conflict record ─────────────────────────────────────────

export type ConflictResolution = 'accept-a' | 'accept-b' | 'manual' | 'pending'

export interface EditConflict {
  id:          string
  path:        string
  agentA:      { id: string; name: string; content: string }
  agentB:      { id: string; name: string; content: string }
  base:        string           // content before either agent touched it
  resolution:  ConflictResolution
  timestamp:   number
}

// ─── In-memory conflict store ─────────────────────────────────

class ConflictRegistry {
  private conflicts: Map<string, EditConflict> = new Map()

  // Detect overlap: called before any agent writes a file.
  // Returns a conflict if another agent already has the file locked.

  detect(
    path:      string,
    agentId:   string,
    agentName: string,
    proposed:  string
  ): EditConflict | null {
    const store = useIDEStore.getState()
    const lock  = store.locks[path]

    if (!lock || lock.agentId === agentId) return null   // no conflict

    // Another agent holds this file — create a conflict record
    const base    = store.activeFiles[path]?.content ?? ''
    const conflict: EditConflict = {
      id:         nanoid(),
      path,
      agentA:     { id: lock.agentId, name: lock.agentName, content: base },
      agentB:     { id: agentId, name: agentName, content: proposed },
      base,
      resolution: 'pending',
      timestamp:  Date.now(),
    }

    this.conflicts.set(conflict.id, conflict)

    // Notify via EventBus (steps panel + UI)
    bus.emit('step.emitted', {
      stepId:   conflict.id,
      category: 'result',
      agentId,
      title:    `Edit conflict on ${path} between ${lock.agentName} and ${agentName}`,
    })

    console.warn(`[ConflictDetector] Conflict on ${path}: ${lock.agentName} vs ${agentName}`)
    return conflict
  }

  resolve(
    conflictId: string,
    resolution: ConflictResolution,
    manualContent?: string
  ): string | null {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict || conflict.resolution !== 'pending') return null

    conflict.resolution = resolution

    const store   = useIDEStore.getState()
    let winner: string

    switch (resolution) {
      case 'accept-a': winner = conflict.agentA.content; break
      case 'accept-b': winner = conflict.agentB.content; break
      case 'manual':   winner = manualContent ?? conflict.base; break
      default:         return null
    }

    store.updateContent(conflict.path, winner)
    store.unlockFile(conflict.path, conflict.agentA.id)
    store.unlockFile(conflict.path, conflict.agentB.id)

    bus.emit('step.emitted', {
      stepId:   `resolved-${conflictId}`,
      category: 'result',
      agentId:  conflict.agentA.id,
      title:    `Conflict resolved (${resolution}) on ${conflict.path}`,
    })

    return winner
  }

  getPending(): EditConflict[] {
    return [...this.conflicts.values()].filter(c => c.resolution === 'pending')
  }

  getAll(): EditConflict[] {
    return [...this.conflicts.values()]
  }
}

export const conflictRegistry = new ConflictRegistry()

// ============================================================
// ConflictResolver — Phase 08, Task 7 (UI component)
// ============================================================
'use client'
import { useState }          from 'react'
import { motion }            from 'framer-motion'
import { conflictRegistry }  from '@/lib/ide/conflict-detector'
import { DiffViewer, buildDiff } from '@/components/ide/DiffViewer'
import { cn }                from '@/lib/utils'

interface ConflictResolverProps {
  conflict:  EditConflict
  onResolved?: () => void
  className?: string
}

export function ConflictResolver({ conflict, onResolved, className }: ConflictResolverProps) {
  const [tab, setTab]             = useState<'a' | 'b' | 'manual'>('a')
  const [manualContent, setManual] = useState(conflict.base)
  const [resolved, setResolved]   = useState(false)

  function resolve(r: ConflictResolution) {
    const result = conflictRegistry.resolve(
      conflict.id,
      r,
      r === 'manual' ? manualContent : undefined
    )
    if (result !== null) {
      setResolved(true)
      onResolved?.()
    }
  }

  const diffA = buildDiff(conflict.base, conflict.agentA.content, conflict.path)
  const diffB = buildDiff(conflict.base, conflict.agentB.content, conflict.path)

  if (resolved) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-emerald-800/40 bg-emerald-950/20 text-emerald-400 text-sm">
        ✓ Conflict resolved on <span className="font-mono">{conflict.path}</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border border-amber-700/50 bg-zinc-950 overflow-hidden',
        'shadow-[0_0_20px_-5px_rgba(245,158,11,0.25)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/20 border-b border-amber-700/30">
        <span className="text-amber-400 text-lg">⚠</span>
        <div className="flex-1">
          <p className="text-amber-300 text-sm font-medium">Edit Conflict Detected</p>
          <p className="text-amber-600 text-[11px] font-mono mt-0.5">{conflict.path}</p>
        </div>
        <div className="flex gap-2 text-[11px] font-mono">
          <span className="text-indigo-400">{conflict.agentA.name}</span>
          <span className="text-zinc-600">vs</span>
          <span className="text-cyan-400">{conflict.agentB.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {([
          { key: 'a',      label: `${conflict.agentA.name}'s version` },
          { key: 'b',      label: `${conflict.agentB.name}'s version` },
          { key: 'manual', label: 'Manual merge' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 text-[12px] font-mono transition-colors',
              tab === t.key
                ? 'text-white border-b-2 border-indigo-500 -mb-px bg-zinc-900/50'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === 'a' && (
          <>
            <DiffViewer diff={diffA} readOnly className="mb-4" />
            <button
              onClick={() => resolve('accept-a')}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Accept {conflict.agentA.name}'s version
            </button>
          </>
        )}
        {tab === 'b' && (
          <>
            <DiffViewer diff={diffB} readOnly className="mb-4" />
            <button
              onClick={() => resolve('accept-b')}
              className="w-full py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-medium transition-colors"
            >
              Accept {conflict.agentB.name}'s version
            </button>
          </>
        )}
        {tab === 'manual' && (
          <>
            <textarea
              value={manualContent}
              onChange={e => setManual(e.target.value)}
              className="w-full h-64 bg-zinc-900 border border-zinc-700 rounded-lg p-3 font-mono text-[12px] text-zinc-300 focus:outline-none focus:border-zinc-500 resize-none mb-4"
              placeholder="Edit the merged content manually…"
            />
            <button
              onClick={() => resolve('manual')}
              className="w-full py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-colors"
            >
              Apply manual merge
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
