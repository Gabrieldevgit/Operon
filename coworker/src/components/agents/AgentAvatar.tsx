'use client'
import { AGENT_COLORS, AGENT_INITIALS } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import type { AgentRole } from '@/types'

interface Props {
  role:  AgentRole
  name:  string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { outer: 24, font: 9 },
  md: { outer: 32, font: 11 },
  lg: { outer: 40, font: 13 },
}

export function AgentAvatar({ role, name, size = 'md', className }: Props) {
  const color  = AGENT_COLORS[role]
  const initials = name.slice(0, 2).toUpperCase()
  const { outer, font } = SIZES[size]

  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-lg font-mono font-semibold flex-shrink-0', className)}
      style={{
        width:           outer,
        height:          outer,
        fontSize:        font,
        backgroundColor: `${color}20`,
        border:          `1px solid ${color}50`,
        color,
        letterSpacing:   '0.05em',
      }}
      title={name}
    >
      {initials}
    </span>
  )
}
