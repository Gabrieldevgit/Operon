'use client'
// ============================================================
// ConflictResolver — Bug fix #4
// Extracted from conflict-detector.ts (which is a .ts file and
// cannot contain JSX). This is the UI half of Task 7.
// ============================================================
import { useState }         from 'react'
import { motion }            from 'framer-motion'
import { conflictRegistry }  from '@/lib/ide/conflict-detector'
import type { EditConflict, ConflictResolution } from '@/lib/ide/conflict-detector'
import { DiffViewer, buildDiff } from '@/components/ide/DiffViewer'
import { cn }                from '@/lib/utils'

interface ConflictResolverProps {
  conflict:   EditConflict
  onResolved?: () => void
  className?:  string
}

export function ConflictResolver({ conflict, onResolved, className }: ConflictResolverProps) {
  const [tab, setTab]              = useState<'a' | 'b' | 'manual'>('a')
  const [manualContent, setManual] = useState(conflict.base)
  const [resolved, setResolved]    = useState(false)

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
        ✓ Conflict resolved on <span className="font-mono ml-1">{conflict.path}</span>
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
              Accept {conflict.agentA.name}&apos;s version
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
              Accept {conflict.agentB.name}&apos;s version
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
