'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckCircle2, Circle, Loader, XCircle, MinusCircle } from 'lucide-react'
import { useState } from 'react'
import { AGENT_COLORS } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import type { Task, Agent, ChecklistItemStatus } from '@/types'

interface Props {
  tasks:  Task[]
  agents: Record<string, Agent>
  open:   boolean
}

const STATUS_ICON: Record<ChecklistItemStatus, React.ReactNode> = {
  pending:   <Circle className="w-3.5 h-3.5 text-white/20" />,
  active:    <Loader className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  failed:    <XCircle className="w-3.5 h-3.5 text-red-400" />,
  skipped:   <MinusCircle className="w-3.5 h-3.5 text-white/20" />,
}

function TaskRow({ task, agents }: { task: Task; agents: Record<string, Agent> }) {
  const [expanded, setExpanded] = useState(true)
  const agent = agents[task.assignedAgentId]
  const color = agent ? AGENT_COLORS[agent.role] : '#7C6FE0'
  const done  = task.checklist.filter(i => i.status === 'completed').length
  const total = task.checklist.length
  const pct   = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="rounded-lg border border-white/[0.07] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/80 truncate">{task.title}</span>
            <span className="text-[10px] font-mono text-white/25">{done}/{total}</span>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 bg-white/10 rounded-full mt-1.5">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-white/25 transition-transform', expanded && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1 border-t border-white/[0.05]">
              {task.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <span className="flex-shrink-0">{STATUS_ICON[item.status]}</span>
                  <span className={cn(
                    'text-xs',
                    item.status === 'completed' ? 'text-white/30 line-through' :
                    item.status === 'active'    ? 'text-white/80' : 'text-white/45'
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TaskPanel({ tasks, agents, open }: Props) {
  const active = tasks.filter(t => t.status === 'active' || t.status === 'pending')

  return (
    <AnimatePresence initial={false}>
      {open && active.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-t border-white/[0.06]"
        >
          <div className="px-4 py-3 space-y-2 max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">
                Active tasks
              </span>
              <span className="text-[10px] font-mono text-white/20">{active.length}</span>
            </div>
            {active.map(task => (
              <TaskRow key={task.id} task={task} agents={agents} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
