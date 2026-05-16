'use client'
// ============================================================
// useChat — wires AI stream to workspace messages + memory
// Phase 05 agents will extend this, but it's fully functional.
// ============================================================
import { useCallback } from 'react'
import { nanoid } from 'nanoid'
import { useAIStream } from './useAIStream'
import { memory_append_conversation } from '@/lib/memory/memory'
import { extractFromResponse }         from '@/lib/memory/extractor'
import type { ChatMessage } from '@/types'
import type { TaskType } from '@/lib/ai/types'

interface UseChatOptions {
  workspaceId:  string
  agentId?:     string
  taskType?:    TaskType
  systemPrompt?: string
  onMessage?:   (msg: ChatMessage) => void
}

export function useChat({
  workspaceId,
  agentId     = 'agent_orc',
  taskType    = 'simple',
  systemPrompt,
  onMessage,
}: UseChatOptions) {

  const stream = useAIStream({
    taskType,
    systemPrompt,
    onDone(content) {
      // 1. Emit the finished message
      const msg: ChatMessage = {
        id:        nanoid(),
        role:      'agent',
        agentId,
        agentName: 'Orion',
        content,
        timestamp: Date.now(),
        metadata:  { provider: stream.provider },
      }
      onMessage?.(msg)

      // 2. Auto-extract facts from the response into memory
      extractFromResponse(content, { workspaceId, agentId })
    },
  })

  const send = useCallback(
    (userContent: string, history: ChatMessage[]) => {
      // 1. Save conversation turn to memory
      const lastAgentMsg = [...history].reverse().find(m => m.role === 'agent')
      if (lastAgentMsg) {
        const lastUserMsg = [...history].reverse().find(m => m.role === 'user')
        if (lastUserMsg) {
          memory_append_conversation(
            workspaceId, agentId,
            lastUserMsg.content, lastAgentMsg.content
          )
        }
      }

      // 2. Build API messages from history
      const messages = [
        ...history
          .filter(m => m.role !== 'system')
          .map(m => ({
            role:    (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
          })),
        { role: 'user' as const, content: userContent },
      ]

      stream.send(messages)
    },
    [stream, workspaceId, agentId]
  )

  return {
    send,
    abort:    stream.abort,
    reset:    stream.reset,
    streaming: stream.streaming,
    draft:    stream.content,
    error:    stream.error,
    provider: stream.provider,
  }
}
