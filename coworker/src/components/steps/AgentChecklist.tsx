'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Loader, XCircle, MinusCircle } from 'lucide-react'
import { useTasksStore }  from '@/store/tasks.store'
import { useAgentsStore } from '@/store/agents.store'
import { AGENT_COLORS, AGENT_LABELS } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import type { AgentRole, ChecklistItemStatus } from '@/types'

const STATUS_ICON: Record<ChecklistItemStatus, React.ReactNode> = {
  pending:   <Circle       className="w-3 h-3 text-white/20" />,
  active:    <Loader       className="w-3 h-3 text-blue-400 animate-spin" />,
  completed: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  failed:    <XCircle      className="w-3 h-3 text-red-400" />,
  skipped:   <MinusCircle  className="w-3 h-3 text-white/20" />,
}

const AGENT_ORDER = ['agent_orc', 'agent_ui', 'agent_dev', 'agent_rev']

export function AgentChecklist() {
  const agents = useAgentsStore(s => s.agents)
  const tasks  = useTasksStore(s =>
    Object.values(s.tasks).filter(t => t.status === 'active' || t.status === 'pending')
  )

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-6">
        <span className="text-2xl opacity-10">◈</span>
        <p className="text-[11px] font-mono text-white/20">No active tasks.</p>
        <p className="text-[10px] text-white/15">Send a message to start the agents.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3">
      {AGENT_ORDER.map(agentId => {
        const agent      = agents[agentId]
        const agentTasks = tasks.filter(t => t.assignedAgentId === agentId)
        if (!agent || agentTasks.length === 0) return null

        const color = AGENT_COLORS[agent.role as AgentRole] ?? '#7C6FE0'
        const isActive = agent.status === 'working' || agent.status === 'thinking'

        return (
          <motion.div
            key={agentId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: isActive ? `${color}30` : 'rgba(255,255,255,0.07)',
              background:  isActive ? `${color}06` : 'rgba(255,255,255,0.02)',
            }}
          >
            {/* Agent header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
              <div className="relative flex-shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span className="text-[11px] font-mono font-semibold" style={{ color }}>
                {agent.name}
              </span>
              <span className="text-[9px] text-white/25 font-mono">
                {AGENT_LABELS[agent.role as AgentRole]}
              </span>
              {isActive && (
                <motion.span
                  className="ml-auto text-[9px] font-mono"
                  style={{ color: `${color}80` }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  {agent.status}
                </motion.span>
              )}
            </div>

            {/* Task checklists */}
            {agentTasks.map(task => {
              const done  = task.checklist.filter(i => i.status === 'completed').length
              const total = task.checklist.length
              const pct   = total > 0 ? (done / total) * 100 : 0

              return (
                <div key={task.id} className="px-3 py-2.5">
                  {/* Task title + progress */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/50 font-mono truncate flex-1 mr-2">
                      {task.title}
                    </span>
                    <span className="text-[9px] font-mono text-white/25 flex-shrink-0">
                      {done}/{total}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-0.5 bg-white/8 rounded-full mb-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  {/* Checklist items */}
                  <AnimatePresence>
                    {task.checklist.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 py-0.5"
                      >
                        <span className="flex-shrink-0">{STATUS_ICON[item.status]}</span>
                        <span className={cn(
                          'text-[11px] leading-snug',
                          item.status === 'completed' ? 'text-white/25 line-through' :
                          item.status === 'active'    ? 'text-white/80' : 'text-white/40'
                        )}>
                          {item.label}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </motion.div>
        )
      })}
    </div>
  )
}
