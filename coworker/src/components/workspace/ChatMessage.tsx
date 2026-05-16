'use client'
import { motion } from 'framer-motion'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { formatTime } from '@/lib/utils'
import { AGENT_COLORS } from '@/lib/agent-config'
import type { ChatMessage, Agent } from '@/types'

interface Props {
  message:   ChatMessage
  agents:    Record<string, Agent>
  isLatest?: boolean
}

export function ChatMessageItem({ message, agents, isLatest }: Props) {
  const agent = message.agentId ? agents[message.agentId] : undefined

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end gap-2 group"
      >
        <div className="flex flex-col items-end gap-1 max-w-[75%]">
          <div
            className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white/90 leading-relaxed"
            style={{ background: 'rgba(124,111,224,0.15)', border: '1px solid rgba(124,111,224,0.2)' }}
          >
            {message.content}
          </div>
          <span className="text-[10px] font-mono text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div
          className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-semibold text-white/60 flex-shrink-0 mt-1"
        >
          U
        </div>
      </motion.div>
    )
  }

  const color = agent ? AGENT_COLORS[agent.role] : '#7C6FE0'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 group"
    >
      {agent ? (
        <AgentAvatar role={agent.role} name={agent.name} size="sm" className="mt-1 flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 mt-1 flex-shrink-0" />
      )}

      <div className="flex flex-col gap-1 max-w-[78%]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold" style={{ color }}>
            {message.agentName ?? 'System'}
          </span>
          <span className="text-[10px] font-mono text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div
          className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-white/80 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  )
}
