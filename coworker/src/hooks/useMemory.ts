'use client'
import { useCallback }    from 'react'
import { useMemoryStore } from '@/store/memory.store'
import {
  memory_store, memory_retrieve, memory_get,
  memory_forget, memory_clear_scope,
  save_action_summary, decision_log,
} from '@/lib/memory/memory'
import { getMemoryStats } from '@/lib/memory/extractor'
import type { MemoryEntry, MemoryScope, MemoryType } from '@/types'

export function useMemory(workspaceId: string, agentId?: string) {
  // Derive stable array — zustand v4 re-renders only on reference change
  const entries = useMemoryStore(s =>
    Object.values(s.entries).filter(e => e.workspaceId === workspaceId)
  )

  const store = useCallback(
    (key: string, content: string, type: MemoryType, opts?: {
      scope?: MemoryScope; importance?: 1 | 2 | 3 | 4 | 5
      tags?: string[]; ttlMs?: number
    }): MemoryEntry =>
      memory_store({ workspaceId, agentId, key, content, type, ...opts }),
    [workspaceId, agentId]
  )

  const retrieve = useCallback(
    (opts?: { type?: MemoryType; scope?: MemoryScope; tags?: string[]; limit?: number }) =>
      memory_retrieve({ workspaceId, agentId, ...opts }),
    [workspaceId, agentId]
  )

  const get     = useCallback((key: string) => memory_get(workspaceId, key), [workspaceId])
  const forget  = useCallback((id: string) => memory_forget(id), [])
  const clearScope = useCallback(
    (scope: MemoryScope) => memory_clear_scope(workspaceId, scope),
    [workspaceId]
  )

  const logDecision = useCallback(
    (decision: string, reasoning: string, alternatives?: string[]) => {
      if (!agentId) throw new Error('agentId required for decision_log')
      return decision_log({ workspaceId, agentId, decision, reasoning, alternatives })
    },
    [workspaceId, agentId]
  )

  const saveActionSummary = useCallback(
    (params: {
      taskId: string; taskTitle: string; whatWasDone: string; whyItWasDone: string
      filesChanged?: string[]; decisions?: string[]; nextSteps?: string[]
    }) => {
      if (!agentId) throw new Error('agentId required for save_action_summary')
      return save_action_summary({ workspaceId, agentId, ...params })
    },
    [workspaceId, agentId]
  )

  const stats = useCallback(() => getMemoryStats(workspaceId), [workspaceId])

  return { entries, store, retrieve, get, forget, clearScope, logDecision, saveActionSummary, stats }
}
