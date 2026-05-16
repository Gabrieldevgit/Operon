'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  loadPersistedMemories,
  loadConversationHistory,
  startPersistenceSync,
  stopPersistenceSync,
  type PersistedMessage,
} from '@/lib/memory/cross-session'

interface WorkspaceCtx {
  workspaceId:  string
  ready:        boolean   // true once memories + history are loaded
  history:      PersistedMessage[]
  addToHistory: (msg: PersistedMessage) => void
}

const Ctx = createContext<WorkspaceCtx>({
  workspaceId:  'ws_demo',
  ready:        false,
  history:      [],
  addToHistory: () => {},
})

export function useWorkspaceCtx() { return useContext(Ctx) }

interface Props {
  workspaceId: string
  children:    ReactNode
}

export function WorkspaceProvider({ workspaceId, children }: Props) {
  const [ready,   setReady]   = useState(false)
  const [history, setHistory] = useState<PersistedMessage[]>([])

  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Load persisted memories from Firestore
      await loadPersistedMemories(workspaceId)

      // 2. Load past conversation turns from Supabase
      const msgs = await loadConversationHistory(workspaceId, 40)

      if (!cancelled) {
        setHistory(msgs)
        setReady(true)
      }

      // 3. Start Firestore auto-sync for new memories
      await startPersistenceSync(workspaceId)
    }

    void init()
    return () => {
      cancelled = true
      stopPersistenceSync()
    }
  }, [workspaceId])

  function addToHistory(msg: PersistedMessage) {
    setHistory(prev => [...prev, msg])
  }

  return (
    <Ctx.Provider value={{ workspaceId, ready, history, addToHistory }}>
      {children}
    </Ctx.Provider>
  )
}
