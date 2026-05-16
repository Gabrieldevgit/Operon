'use client'
// ============================================================
// ProjectTree — Phase 08, Task 5
// Project tree awareness panel. Click a suggestion → opens file.
// Shows which agent is currently reading/writing each file.
// ============================================================
import { useState, useCallback }  from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIDEStore }              from '@/store/ide.store'
import type { FileNode }            from '@/store/ide.store'
import { cn }                       from '@/lib/utils'

// ─── Language icons (text-based, no external deps) ───────────

const LANG_ICON: Record<string, string> = {
  tsx: '⚛', ts: '𝘁', js: '𝘫', jsx: '⚛',
  json: '{}', css: '✦', md: '¶', sql: '🗄',
  html: '🌐', py: '🐍', sh: '⚙', env: '🔑',
  lock: '🔒', gitignore: '⊘', default: '·',
}

function langIcon(name: string): string {
  const ext = name.split('.').pop() ?? ''
  return LANG_ICON[ext] ?? LANG_ICON.default
}

// ─── Agent dot (shows which agent has this file locked) ──────

interface AgentDotProps { agentName: string; color?: string }
function AgentDot({ agentName, color = '#6366f1' }: AgentDotProps) {
  return (
    <span
      title={`${agentName} is editing this file`}
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {agentName[0]?.toUpperCase()}
    </span>
  )
}

// ─── TreeNode ─────────────────────────────────────────────────

interface TreeNodeProps {
  nodeId:    string
  depth:     number
  onOpenFile:(path: string, nodeId: string) => void
}

function TreeNode({ nodeId, depth, onOpenFile }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2)

  const node      = useIDEStore(s => s.nodes[nodeId])
  const locks     = useIDEStore(s => s.locks)
  const focusedPath = useIDEStore(s => s.focusedPath)

  if (!node) return null

  const lock         = locks[node.path]
  const isFocused    = node.path === focusedPath
  const isDirectory  = node.type === 'directory'
  const indent       = depth * 14

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen(o => !o)
    } else {
      onOpenFile(node.path, nodeId)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-1.5 py-[3px] pr-2 rounded-sm text-left',
          'hover:bg-zinc-800/60 transition-colors duration-100',
          isFocused && 'bg-indigo-950/50 text-indigo-300',
          !isFocused && 'text-zinc-400 hover:text-zinc-200',
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* Expand arrow for dirs */}
        {isDirectory && (
          <span className="text-zinc-600 text-[10px] w-3 shrink-0">
            {isOpen ? '▼' : '▶'}
          </span>
        )}

        {/* Icon */}
        <span className={cn(
          'text-[11px] shrink-0 w-4',
          isDirectory ? 'text-yellow-500/80' : 'text-zinc-500',
        )}>
          {isDirectory ? (isOpen ? '📂' : '📁') : langIcon(node.name)}
        </span>

        {/* Name */}
        <span className={cn(
          'text-[12px] flex-1 truncate',
          isFocused   && 'text-indigo-300 font-medium',
          lock        && 'text-cyan-400/80',
        )}>
          {node.name}
        </span>

        {/* Agent lock indicator */}
        {lock && <AgentDot agentName={lock.agentName} />}
      </button>

      {/* Children */}
      <AnimatePresence>
        {isDirectory && isOpen && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map(childId => (
              <TreeNode
                key={childId}
                nodeId={childId}
                depth={depth + 1}
                onOpenFile={onOpenFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ProjectTree panel ────────────────────────────────────────

interface ProjectTreeProps {
  className?:  string
  onOpenFile?: (path: string) => void
}

export function ProjectTree({ className, onOpenFile }: ProjectTreeProps) {
  const [search, setSearch]     = useState('')
  const rootIds  = useIDEStore(s => s.rootIds)
  const nodes    = useIDEStore(s => s.nodes)
  const openFile = useIDEStore(s => s.openFile)
  const locks    = useIDEStore(s => s.locks)

  const handleOpenFile = useCallback((path: string, nodeId: string) => {
    const node = nodes[nodeId]
    if (!node || node.type === 'directory') return
    openFile(path, '', node.language)
    onOpenFile?.(path)
  }, [nodes, openFile, onOpenFile])

  // Filtered flat search results
  const searchResults = search.trim().length > 1
    ? Object.values(nodes).filter(n =>
        n.type === 'file' && n.path.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 20)
    : []

  const lockedCount = Object.keys(locks).length

  return (
    <div className={cn(
      'flex flex-col bg-zinc-950 border-r border-zinc-800/60 select-none',
      className
    )}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            Project Files
          </span>
          {lockedCount > 0 && (
            <span className="text-[10px] font-mono text-cyan-500/80">
              {lockedCount} active
            </span>
          )}
        </div>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search files…"
          className={cn(
            'w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5',
            'text-[12px] font-mono text-zinc-300 placeholder-zinc-600',
            'focus:outline-none focus:border-zinc-600 transition-colors',
          )}
        />
      </div>

      {/* Tree / search results */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {search.trim().length > 1 ? (
          // ── Search results ─────────────────────────────────
          searchResults.length === 0 ? (
            <p className="text-center py-6 text-zinc-600 text-[12px] font-mono">No files found</p>
          ) : (
            searchResults.map(node => (
              <button
                key={node.id}
                onClick={() => handleOpenFile(node.path, node.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/60 text-left transition-colors"
              >
                <span className="text-[11px] text-zinc-500 w-4 shrink-0">{langIcon(node.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-300 truncate">{node.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono truncate">{node.path}</p>
                </div>
                {locks[node.path] && <AgentDot agentName={locks[node.path].agentName} />}
              </button>
            ))
          )
        ) : rootIds.length === 0 ? (
          // ── Empty state ────────────────────────────────────
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-3xl opacity-20">📁</span>
            <p className="text-zinc-600 text-[12px] font-mono">No project loaded</p>
          </div>
        ) : (
          // ── File tree ──────────────────────────────────────
          rootIds.map(id => (
            <TreeNode
              key={id}
              nodeId={id}
              depth={0}
              onOpenFile={handleOpenFile}
            />
          ))
        )}
      </div>

      {/* Footer — active lock summary */}
      {lockedCount > 0 && (
        <div className="px-3 py-2 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
          {Object.values(locks).map(lock => (
            <span key={lock.path} className="flex items-center gap-1 text-[10px] font-mono text-cyan-400/80">
              <AgentDot agentName={lock.agentName} color="#06b6d4" />
              {lock.path.split('/').pop()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
