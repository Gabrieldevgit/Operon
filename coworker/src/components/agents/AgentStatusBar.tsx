'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentsStore }  from '@/store/agents.store'
import { AGENT_COLORS, AGENT_LABELS } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import type { AgentRole, AgentStatus } from '@/types'

const STATUS_LABEL: Partial<Record<AgentStatus, string>> = {
  thinking:          'thinking…',
  working:           'working…',
  'waiting-approval':'waiting…',
  error:             'error',
}

export function AgentStatusBar() {
  const agents = useAgentsStore(s =>
    Object.values(s.agents).filter(a => a.status !== 'idle' && a.status !== 'offline')
  )

  return (
    <AnimatePresence>
      {agents.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-t border-white/[0.06] flex-shrink-0"
        >
          <div className="flex items-center gap-3 px-4 py-1.5 overflow-x-auto scrollbar-none">
            {agents.map(agent => {
              const color  = AGENT_COLORS[agent.role as AgentRole] ?? '#7C6FE0'
              const label  = STATUS_LABEL[agent.status] ?? agent.status

              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-1.5 flex-shrink-0"
                >
                  {/* Animated status dot */}
                  <div className="relative">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: color }}
                      animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                  </div>

                  <span className="text-[10px] font-mono font-semibold" style={{ color }}>
                    {agent.name}
                  </span>
                  <motion.span
                    className="text-[10px] font-mono text-white/30"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    {label}
                  </motion.span>

                  {/* Separator */}
                  <span className="text-white/10 ml-1">·</span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
