import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { MemoryEntry, MemoryType, MemoryScope, MemoryQueryResult } from '@/types'
import { bus } from '@/lib/events/bus'

interface MemoryState {
  entries: Record<string, MemoryEntry>

  // Actions
  store:   (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => MemoryEntry
  retrieve:(query: {
    workspaceId: string
    scope?:      MemoryScope
    agentId?:    string
    type?:       MemoryType
    tags?:       string[]
    limit?:      number
  }) => MemoryQueryResult
  update:  (id: string, content: string, metadata?: Record<string, unknown>) => void
  forget:  (id: string) => void
  clearScope:(workspaceId: string, scope: MemoryScope) => void
}

export const useMemoryStore = create<MemoryState>()(
  immer((set, get) => ({
    entries: {},

    store(entry) {
      const full: MemoryEntry = {
        ...entry,
        id:        nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      set(state => { state.entries[full.id] = full })
      bus.emit('memory.created', { entryId: full.id, type: full.type, scope: full.scope, agentId: full.agentId })
      return full
    },

    retrieve({ workspaceId, scope, agentId, type, tags, limit = 20 }) {
      const all = Object.values(get().entries)
      const now = Date.now()

      const filtered = all.filter(e => {
        if (e.workspaceId !== workspaceId) return false
        if (e.expiresAt && e.expiresAt < now) return false
        if (scope && e.scope !== scope) return false
        if (type && e.type !== type) return false
        // agentId: match specific agent OR shared entries (no agentId)
        if (agentId && e.agentId && e.agentId !== agentId) return false
        if (tags?.length) {
          const hasAll = tags.every(t => e.tags.includes(t))
          if (!hasAll) return false
        }
        return true
      })

      // Sort by importance desc, then recency
      filtered.sort((a, b) =>
        b.importance - a.importance || b.updatedAt - a.updatedAt
      )

      return {
        entries: filtered.slice(0, limit),
        query:   JSON.stringify({ workspaceId, scope, agentId, type }),
        scope:   scope ?? 'project',
        agentId,
        total:   filtered.length,
      }
    },

    update(id, content, metadata) {
      set(state => {
        const entry = state.entries[id]
        if (!entry) return
        entry.content   = content
        entry.updatedAt = Date.now()
        if (metadata) entry.metadata = { ...entry.metadata, ...metadata }
      })
      bus.emit('memory.updated', { entryId: id, key: get().entries[id]?.key ?? id })
    },

    forget(id) {
      set(state => { delete state.entries[id] })
      bus.emit('memory.deleted', { entryId: id })
    },

    clearScope(workspaceId, scope) {
      set(state => {
        for (const [id, entry] of Object.entries(state.entries)) {
          if (entry.workspaceId === workspaceId && entry.scope === scope) {
            delete state.entries[id]
          }
        }
      })
    },
  }))
)

// ─── Bug 3 fix: memoized workspace selector ───────────────────
// Use this in components INSTEAD of `Object.values(s.entries)`.
// Only recomputes when the entries object reference changes,
// preventing rerender storms as memory scales.
//
// Usage:
//   const entries = useWorkspaceMemories('ws-123')
//
import { useMemo } from 'react'

export function useWorkspaceMemories(workspaceId: string): MemoryEntry[] {
  const entries = useMemoryStore(state => state.entries)
  return useMemo(
    () => Object.values(entries).filter(e => e.workspaceId === workspaceId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, workspaceId]
  )
}
