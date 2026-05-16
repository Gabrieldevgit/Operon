'use client'
import { motion } from 'framer-motion'
import { AgentAvatar } from './AgentAvatar'
import { AgentStatusDot } from './AgentStatusDot'
import { AGENT_COLORS, AGENT_LABELS, STATUS_LABELS } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types'

interface Props {
  agent:    Agent
  selected: boolean
  onClick:  () => void
}

export function AgentCard({ agent, selected, onClick }: Props) {
  const color    = AGENT_COLORS[agent.role]
  const isActive = agent.status !== 'idle' && agent.status !== 'offline'

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left',
        'transition-colors duration-150 group',
        selected
          ? 'bg-white/5 border border-white/10'
          : 'hover:bg-white/[0.03] border border-transparent'
      )}
    >
      {/* Left accent bar — needs `relative` on parent to position correctly */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full transition-opacity duration-200"
        style={{ backgroundColor: color, opacity: selected ? 1 : 0 }}
      />

      <AgentAvatar role={agent.role} name={agent.name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white/90 truncate">{agent.name}</span>
          <AgentStatusDot status={agent.status} size={6} />
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] font-mono text-white/30 truncate">
            {AGENT_LABELS[agent.role]}
          </span>
          {isActive && (
            <span className="text-[10px] font-mono truncate" style={{ color: `${color}99` }}>
              · {STATUS_LABELS[agent.status]}
            </span>
          )}
        </div>
      </div>

      {/* Model chip — shown on hover */}
      <span className="text-[9px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded hidden group-hover:block flex-shrink-0">
        {agent.modelProvider}
      </span>
    </motion.button>
  )
}
