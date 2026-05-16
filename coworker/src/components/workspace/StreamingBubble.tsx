'use client'
import { motion } from 'framer-motion'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { AGENT_COLORS } from '@/lib/agent-config'

interface Props {
  agentName: string
  agentRole: 'orchestrator' | 'ui-designer' | 'frontend-dev' | 'reviewer'
  content:   string
}

export function StreamingBubble({ agentName, agentRole, content }: Props) {
  const color = AGENT_COLORS[agentRole]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <AgentAvatar role={agentRole} name={agentName} size="sm" className="mt-1 flex-shrink-0" />

      <div className="flex flex-col gap-1 max-w-[78%]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold" style={{ color }}>
            {agentName}
          </span>
          {/* Animated typing indicator when no content yet */}
          {!content && (
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full bg-white/30"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm text-white/80 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {content || <span className="text-white/20 text-xs">Thinking…</span>}
          {/* Blinking cursor */}
          {content && (
            <motion.span
              className="inline-block w-0.5 h-3.5 bg-white/40 ml-0.5 rounded-full align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}
