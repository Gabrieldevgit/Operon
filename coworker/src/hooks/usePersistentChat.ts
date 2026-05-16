'use client'
import { useCallback, useEffect, useState } from 'react'
import { nanoid }              from 'nanoid'
import { saveMessage }         from '@/lib/memory/cross-session'
import { memory_append_conversation } from '@/lib/memory/memory'
import { useWorkspaceCtx }     from '@/providers/WorkspaceProvider'
import type { ChatMessage }    from '@/types'

export function usePersistentChat() {
  const { workspaceId, history, addToHistory, ready } = useWorkspaceCtx()

  // Hydrate messages from persisted history on first load
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hydrated,  setHydrated] = useState(false)

  useEffect(() => {
    if (!ready || hydrated) return
    const hydrated_msgs: ChatMessage[] = history.map(h => ({
      id:        h.id,
      role:      h.role,
      agentId:   h.agentId,
      agentName: h.agentName,
      content:   h.content,
      timestamp: h.timestamp,
    }))
    setMessages(hydrated_msgs)
    setHydrated(true)
  }, [ready, history, hydrated])

  const addMessage = useCallback((
    msg: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
  ): ChatMessage => {
    const full: ChatMessage = {
      ...msg,
      id:        msg.id        ?? nanoid(),
      timestamp: msg.timestamp ?? Date.now(),
    }

    setMessages(prev => [...prev, full])

    // Persist to Supabase (best-effort, non-blocking)
    void saveMessage(workspaceId, {
      id:        full.id,
      role:      full.role as 'user' | 'agent',
      agentId:   full.agentId,
      agentName: full.agentName,
      content:   full.content,
      timestamp: full.timestamp,
    })
    addToHistory({
      id:        full.id,
      role:      full.role as 'user' | 'agent',
      agentId:   full.agentId,
      agentName: full.agentName,
      content:   full.content,
      timestamp: full.timestamp,
    })

    // Save user+agent turn pairs to memory for agent context
    if (full.role === 'agent') {
      const lastUser = [...messages].reverse().find(m => m.role === 'user')
      if (lastUser) {
        memory_append_conversation(workspaceId, full.agentId ?? 'agent_orc', lastUser.content, full.content)
      }
    }

    return full
  }, [workspaceId, messages, addToHistory])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, addMessage, clearMessages, ready }
}
