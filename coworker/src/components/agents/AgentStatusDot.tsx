'use client'
import { motion } from 'framer-motion'
import { STATUS_COLORS } from '@/lib/agent-config'
import type { AgentStatus } from '@/types'

interface Props {
  status: AgentStatus
  size?:  number
}

const PULSE_STATUSES: AgentStatus[] = ['thinking', 'working', 'waiting-approval']

export function AgentStatusDot({ status, size = 8 }: Props) {
  const color   = STATUS_COLORS[status]
  const pulsing = PULSE_STATUSES.includes(status)

  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {pulsing && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.4 }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span
        className="relative rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  )
}
