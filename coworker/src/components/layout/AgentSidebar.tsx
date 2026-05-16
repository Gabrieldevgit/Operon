'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Plus, Zap } from 'lucide-react'
import { AgentCard } from '@/components/agents/AgentCard'
import { cn } from '@/lib/utils'
import type { Agent, Workspace } from '@/types'

interface Props {
  agents:    Agent[]
  workspace: Workspace
  open:      boolean
}

export function AgentSidebar({ agents, workspace, open }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="h-full flex-shrink-0 overflow-hidden border-r border-white/[0.07]"
          style={{ background: 'rgba(8,10,16,0.95)' }}
        >
          <div className="flex flex-col h-full w-[240px]">

            {/* Workspace header */}
            <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-white/90 truncate">
                  {workspace.name}
                </span>
              </div>
              <p className="text-[10px] text-white/30 mt-1 font-mono truncate">
                {workspace.id}
              </p>
            </div>

            {/* Agents section */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              <div className="px-2 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">
                  Agents
                </span>
                <span className="text-[10px] font-mono text-white/20">
                  {agents.length} active
                </span>
              </div>

              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <AgentCard
                    agent={agent}
                    selected={selectedId === agent.id}
                    onClick={() => setSelectedId(id => id === agent.id ? null : agent.id)}
                  />
                </motion.div>
              ))}

              <button className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg mt-1',
                'text-white/20 hover:text-white/40 hover:bg-white/[0.03]',
                'transition-colors text-xs font-mono border border-dashed border-white/10',
                'hover:border-white/20'
              )}>
                <Plus className="w-3 h-3" />
                Add agent
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-white/30">
                    {workspace.settings.autonomyLevel}
                  </span>
                </div>
                <button className="text-white/20 hover:text-white/50 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
