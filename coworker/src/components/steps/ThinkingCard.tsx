'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENT_COLORS } from '@/lib/agent-config'
import type { AgentRole } from '@/types'

interface Props {
  agentId:   string
  agentName: string
  agentRole: AgentRole
  text:      string
}

export function ThinkingCard({ agentId, agentName, agentRole, text }: Props) {
  const color = AGENT_COLORS[agentRole] ?? '#7C6FE0'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.22 }}
      className="mx-3 mb-2 rounded-xl border overflow-hidden"
      style={{
        borderColor:    `${color}25`,
        background:     `${color}08`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: `${color}15` }}>
        {/* Animated brain pulse */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>

        <span className="text-[10px] font-mono font-semibold" style={{ color }}>
          {agentName}
        </span>
        <span className="text-[9px] font-mono text-white/25">thinking</span>

        {/* Animated dots */}
        <div className="flex gap-0.5 ml-auto">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* Reasoning text */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-white/40 leading-relaxed font-mono whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </motion.div>
  )
}

// Container that shows all active thinking events
import { useStepsStore } from '@/store/steps.store'
import type { AgentRole as AR } from '@/types'

export function ThinkingFeed() {
  const events = useStepsStore(s => s.thinkingEvents.slice(-5))

  return (
    <AnimatePresence mode="popLayout">
      {events.map((e, i) => (
        <ThinkingCard
          key={`${e.agentId}-${e.timestamp}`}
          agentId={e.agentId}
          agentName={e.agentName}
          agentRole={e.agentId === 'agent_orc' ? 'orchestrator'
                   : e.agentId === 'agent_ui'  ? 'ui-designer'
                   : e.agentId === 'agent_dev' ? 'frontend-dev'
                   : 'reviewer'}
          text={e.text}
        />
      ))}
    </AnimatePresence>
  )
}
