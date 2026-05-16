'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Trash2, ChevronDown, Tag } from 'lucide-react'
import { useMemory } from '@/hooks/useMemory'
import { cn } from '@/lib/utils'
import type { MemoryEntry } from '@/types'

interface Props {
  workspaceId: string
  agentId?:   string
}

const TYPE_COLORS: Record<string, string> = {
  'conversation':   '#60A5FA',
  'project-context':'#34D399',
  'task-history':   '#A78BFA',
  'decision':       '#F59E0B',
  'agent-collab':   '#F87171',
  'user-preference':'#6EE7B7',
  'code-pattern':   '#93C5FD',
}

const SCOPE_BADGE: Record<string, string> = {
  session: 'bg-white/5 text-white/30',
  project: 'bg-indigo-500/10 text-indigo-400',
  global:  'bg-emerald-500/10 text-emerald-400',
}

function MemoryEntryRow({ entry, onForget }: { entry: MemoryEntry; onForget: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLORS[entry.type] ?? '#7C6FE0'

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      className="rounded-lg border border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="w-1 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-white/40">{entry.key}</span>
            <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded-full', SCOPE_BADGE[entry.scope])}>
              {entry.scope}
            </span>
            {'★'.repeat(entry.importance).padEnd(5, '☆').split('').map((s, i) => (
              <span key={i} className="text-[9px]" style={{ color: s === '★' ? '#F59E0B' : '#374151' }}>{s}</span>
            ))}
          </div>
          <p className="text-xs text-white/60 mt-0.5 truncate leading-snug">
            {entry.content.slice(0, 80)}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ChevronDown className={cn('w-3 h-3 text-white/20 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pt-1 border-t border-white/[0.05] space-y-2">
              <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">
                {entry.content}
              </p>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 text-[9px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                      <Tag className="w-2 h-2" />{tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => onForget(entry.id)}
                className="flex items-center gap-1 text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Forget this
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function MemoryPanel({ workspaceId, agentId }: Props) {
  const memory = useMemory(workspaceId, agentId)
  const stats  = memory.stats()
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? memory.entries
    : memory.entries.filter(e => e.type === filter)

  const sorted = [...filtered].sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-mono text-white/60">Memory</span>
          <span className="text-[10px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">
            {stats.total}
          </span>
        </div>
        <button
          onClick={() => memory.clearScope('session')}
          className="text-[10px] text-white/20 hover:text-white/50 font-mono transition-colors"
        >
          clear session
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/[0.06] overflow-x-auto">
        {['all', ...Object.keys(stats.byType)].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              'text-[9px] font-mono px-2 py-1 rounded flex-shrink-0 transition-colors whitespace-nowrap',
              filter === type
                ? 'bg-white/10 text-white/70'
                : 'text-white/25 hover:text-white/50'
            )}
          >
            {type === 'all' ? `all (${stats.total})` : `${type} (${stats.byType[type]})`}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Brain className="w-6 h-6 text-white/10 mb-2" />
            <p className="text-xs text-white/20 font-mono">No memories yet.</p>
            <p className="text-[10px] text-white/15 mt-1">
              Agents store context here as they work.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sorted.map(entry => (
              <MemoryEntryRow key={entry.id} entry={entry} onForget={memory.forget} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
