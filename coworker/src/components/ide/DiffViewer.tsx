'use client'
// ============================================================
// DiffViewer — Phase 08, Task 2
// Before/after highlighted diff blocks with per-hunk accept/reject.
// Used in the approval modal and the plan execution preview.
//
// Design: dark terminal aesthetic, monospace, green additions,
// red removals, subtle line numbers, collapsible unchanged regions.
// ============================================================
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

// ─── Diff types ───────────────────────────────────────────────

export type HunkStatus = 'pending' | 'accepted' | 'rejected'

export interface DiffLine {
  type:    'add' | 'remove' | 'context'
  content: string
  lineOld: number | null
  lineNew: number | null
}

export interface DiffHunk {
  id:      string
  header:  string               // "@@ -12,6 +12,8 @@"
  lines:   DiffLine[]
  status:  HunkStatus
}

export interface FileDiff {
  path:      string
  language:  string
  hunks:     DiffHunk[]
  isNew?:    boolean
  isDeleted?: boolean
}

// ─── Pure diff parser ─────────────────────────────────────────
// Parses unified diff text into typed hunks.

export function parseDiff(diffText: string, filePath = ''): FileDiff {
  const lines = diffText.split('\n')
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let oldLine = 0
  let newLine = 0
  let hunkIndex = 0

  for (const raw of lines) {
    if (raw.startsWith('@@')) {
      if (currentHunk) hunks.push(currentHunk)
      const headerMatch = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/)
      oldLine = headerMatch ? parseInt(headerMatch[1], 10) : 1
      newLine = headerMatch ? parseInt(headerMatch[2], 10) : 1
      currentHunk = { id: `hunk-${hunkIndex++}`, header: raw, lines: [], status: 'pending' }
      continue
    }
    if (!currentHunk) continue

    if (raw.startsWith('+')) {
      currentHunk.lines.push({ type: 'add',     content: raw.slice(1), lineOld: null,      lineNew: newLine++ })
    } else if (raw.startsWith('-')) {
      currentHunk.lines.push({ type: 'remove',  content: raw.slice(1), lineOld: oldLine++, lineNew: null     })
    } else {
      currentHunk.lines.push({ type: 'context', content: raw.slice(1), lineOld: oldLine++, lineNew: newLine++ })
    }
  }
  if (currentHunk) hunks.push(currentHunk)

  const ext = filePath.split('.').pop() ?? ''
  return { path: filePath, language: ext, hunks }
}

// ─── Build a minimal diff from two strings ────────────────────
// Naive line-level diff — good enough for code previews.

export function buildDiff(before: string, after: string, path = ''): FileDiff {
  const oldLines = before.split('\n')
  const newLines = after.split('\n')

  const hunkLines: DiffLine[] = []
  const maxLen = Math.max(oldLines.length, newLines.length)
  let oldIdx = 1, newIdx = 1

  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i]
    const n = newLines[i]

    if (o === n) {
      hunkLines.push({ type: 'context', content: o ?? '', lineOld: oldIdx++, lineNew: newIdx++ })
    } else {
      if (o !== undefined) hunkLines.push({ type: 'remove', content: o, lineOld: oldIdx++, lineNew: null })
      if (n !== undefined) hunkLines.push({ type: 'add',    content: n, lineOld: null,     lineNew: newIdx++ })
    }
  }

  const ext = path.split('.').pop() ?? ''
  return {
    path,
    language: ext,
    hunks: hunkLines.length > 0
      ? [{ id: 'hunk-0', header: `@@ -1,${oldLines.length} +1,${newLines.length} @@`, lines: hunkLines, status: 'pending' }]
      : [],
  }
}

// ─── DiffHunkRow ─────────────────────────────────────────────

function DiffHunkRow({ line }: { line: DiffLine }) {
  return (
    <div className={cn(
      'flex font-mono text-[12px] leading-[1.6] select-text',
      line.type === 'add'    && 'bg-emerald-950/60 text-emerald-300',
      line.type === 'remove' && 'bg-rose-950/60 text-rose-300',
      line.type === 'context'&& 'text-zinc-400',
    )}>
      {/* Line numbers */}
      <span className="select-none w-10 text-right pr-3 text-zinc-600 shrink-0 border-r border-zinc-800">
        {line.lineOld ?? ''}
      </span>
      <span className="select-none w-10 text-right pr-3 text-zinc-600 shrink-0 border-r border-zinc-800">
        {line.lineNew ?? ''}
      </span>
      {/* Gutter symbol */}
      <span className={cn(
        'select-none px-2 shrink-0 w-6',
        line.type === 'add'    && 'text-emerald-500',
        line.type === 'remove' && 'text-rose-500',
        line.type === 'context'&& 'text-zinc-700',
      )}>
        {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
      </span>
      {/* Content */}
      <span className="px-2 whitespace-pre-wrap break-all min-w-0 flex-1">{line.content}</span>
    </div>
  )
}

// ─── DiffHunkBlock ────────────────────────────────────────────

interface DiffHunkBlockProps {
  hunk:       DiffHunk
  onAccept?:  (id: string) => void
  onReject?:  (id: string) => void
  readOnly?:  boolean
}

function DiffHunkBlock({ hunk, onAccept, onReject, readOnly }: DiffHunkBlockProps) {
  const [collapsed, setCollapsed] = useState(false)

  const addCount    = hunk.lines.filter(l => l.type === 'add').length
  const removeCount = hunk.lines.filter(l => l.type === 'remove').length

  return (
    <div className={cn(
      'rounded border mb-2 overflow-hidden transition-all',
      hunk.status === 'accepted' && 'border-emerald-700/60 bg-emerald-950/20',
      hunk.status === 'rejected' && 'border-rose-800/60 bg-rose-950/20 opacity-50',
      hunk.status === 'pending'  && 'border-zinc-700/60',
    )}>
      {/* Hunk header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-mono">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors w-4"
        >
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="text-zinc-500 flex-1 truncate">{hunk.header}</span>
        {addCount > 0    && <span className="text-emerald-400">+{addCount}</span>}
        {removeCount > 0 && <span className="text-rose-400">−{removeCount}</span>}
        {/* Per-hunk actions */}
        {!readOnly && hunk.status === 'pending' && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => onAccept?.(hunk.id)}
              className="px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-700/40 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onReject?.(hunk.id)}
              className="px-2 py-0.5 rounded text-[10px] font-sans bg-rose-900/40 text-rose-400 hover:bg-rose-800/40 border border-rose-700/40 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
        {hunk.status === 'accepted' && (
          <span className="text-emerald-500 text-[10px] font-sans">✓ Accepted</span>
        )}
        {hunk.status === 'rejected' && (
          <span className="text-rose-500 text-[10px] font-sans">✗ Rejected</span>
        )}
      </div>
      {/* Lines */}
      {!collapsed && (
        <div className="overflow-x-auto">
          {hunk.lines.map((line, i) => <DiffHunkRow key={i} line={line} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main DiffViewer ─────────────────────────────────────────

export interface DiffViewerProps {
  diff:          FileDiff
  onAcceptAll?:  () => void
  onRejectAll?:  () => void
  onAcceptHunk?: (hunkId: string) => void
  onRejectHunk?: (hunkId: string) => void
  readOnly?:     boolean
  className?:    string
}

export function DiffViewer({
  diff,
  onAcceptAll,
  onRejectAll,
  onAcceptHunk,
  onRejectHunk,
  readOnly = false,
  className,
}: DiffViewerProps) {
  const [hunks, setHunks] = useState<DiffHunk[]>(diff.hunks)

  const stats = useMemo(() => ({
    add:    hunks.flatMap(h => h.lines).filter(l => l.type === 'add').length,
    remove: hunks.flatMap(h => h.lines).filter(l => l.type === 'remove').length,
    total:  hunks.length,
    accepted: hunks.filter(h => h.status === 'accepted').length,
    rejected: hunks.filter(h => h.status === 'rejected').length,
  }), [hunks])

  function acceptHunk(id: string) {
    setHunks(prev => prev.map(h => h.id === id ? { ...h, status: 'accepted' } : h))
    onAcceptHunk?.(id)
  }

  function rejectHunk(id: string) {
    setHunks(prev => prev.map(h => h.id === id ? { ...h, status: 'rejected' } : h))
    onRejectHunk?.(id)
  }

  function acceptAll() {
    setHunks(prev => prev.map(h => ({ ...h, status: 'accepted' })))
    onAcceptAll?.()
  }

  function rejectAll() {
    setHunks(prev => prev.map(h => ({ ...h, status: 'rejected' })))
    onRejectAll?.()
  }

  return (
    <div className={cn('rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden', className)}>
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
        <span className="text-zinc-400 text-[11px] font-mono flex-1 truncate">
          {diff.isNew     && <span className="text-emerald-400 mr-2">NEW</span>}
          {diff.isDeleted && <span className="text-rose-400 mr-2">DELETED</span>}
          {diff.path}
        </span>
        <div className="flex gap-3 text-[11px] font-mono">
          <span className="text-emerald-400">+{stats.add}</span>
          <span className="text-rose-400">−{stats.remove}</span>
          {!readOnly && (
            <span className="text-zinc-600 ml-1">
              {stats.accepted}/{stats.total} accepted
            </span>
          )}
        </div>
        {/* Bulk actions */}
        {!readOnly && (
          <div className="flex gap-1.5">
            <button
              onClick={acceptAll}
              className="px-2.5 py-1 rounded text-[11px] font-sans bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-700/40 transition-colors"
            >
              Accept all
            </button>
            <button
              onClick={rejectAll}
              className="px-2.5 py-1 rounded text-[11px] font-sans bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 border border-zinc-700/40 transition-colors"
            >
              Reject all
            </button>
          </div>
        )}
      </div>

      {/* Hunks */}
      <div className="p-3">
        {hunks.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm font-mono">No changes</div>
        ) : (
          hunks.map(hunk => (
            <DiffHunkBlock
              key={hunk.id}
              hunk={hunk}
              onAccept={acceptHunk}
              onReject={rejectHunk}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </div>
  )
}
