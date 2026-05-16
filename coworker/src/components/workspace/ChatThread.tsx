'use client'
import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChatMessageItem } from './ChatMessage'
import type { ChatMessage, Agent } from '@/types'

interface Props {
  messages: ChatMessage[]
  agents:   Record<string, Agent>
}

export function ChatThread({ messages, agents }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="text-3xl opacity-20">◈</div>
        <p className="text-sm text-white/30 font-mono">
          Workspace ready. Send a message to get started.
        </p>
        <p className="text-xs text-white/15 font-mono max-w-sm">
          The Orchestrator will receive your request, break it into tasks,
          and delegate to the right agents.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            agents={agents}
            isLatest={i === messages.length - 1}
          />
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
