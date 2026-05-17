'use client'
// ============================================================
// AgentPanel — Bug fix #1
// Was imported by OperonIDE but never created.
// Adapts the AgentSidebar into a right-panel format for the IDE.
// ============================================================
import { useAgentsStore }   from '@/store/agents.store'
import { useIDEStore }      from '@/store/ide.store'
import { OPERON }           from '@/config/operon'
import { bus }              from '@/lib/events/bus'
import { cn }               from '@/lib/utils'

// ─── Agent status indicator ───────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  idle:     'bg-zinc-600',
  working:  'bg-cyan-400 animate-pulse',
  thinking: 'bg-indigo-400 animate-pulse',
  done:     'bg-emerald-500',
  error:    'bg-rose-500',
}

// ─── AgentPanel ───────────────────────────────────────────────

export function AgentPanel({ className }: { className?: string }) {
  const agents     = useAgentsStore(s => Object.values(s.agents))
  const locks      = useIDEStore(s => s.locks)
  const activePlan = useIDEStore(s =>
    s.planOrder.map(id => s.plans[id]).find(p => p?.status === 'pending')
  )

  function switchToAgent(agentId: string, agentName: string, role: string) {
    bus.emit('agent.switched', { agentId, agentName, role })
  }

  return (
    <div className={cn('flex flex-col h-full bg-zinc-950 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 shrink-0">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Co-workers
        </p>
      </div>

      {/* Pending plan banner */}
      {activePlan && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg border border-indigo-700/50 bg-indigo-950/30 shrink-0">
          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider mb-0.5">
            Awaiting approval
          </p>
          <p className="text-zinc-300 text-[12px] truncate">{activePlan.title}</p>
        </div>
      )}

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {agents.length === 0 ? (
          <p className="text-center py-8 text-zinc-700 text-[12px] font-mono">
            No agents loaded
          </p>
        ) : (
          agents.map(agent => {
            const agentCfg = Object.values(OPERON.agents).find(a => a.id === agent.id)
            const color    = agentCfg?.color ?? '#6366f1'
            const lockedFiles = Object.values(locks)
              .filter(l => l.agentId === agent.id)
              .map(l => l.path.split('/').pop())

            return (
              <button
                key={agent.id}
                onClick={() => switchToAgent(agent.id, agent.name, agent.role)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left',
                  'hover:bg-zinc-800/60 transition-colors border border-transparent',
                  agent.status !== 'idle' && 'border-zinc-800/60 bg-zinc-900/40',
                )}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: color }}
                >
                  {agent.name[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-200 text-[13px] font-medium truncate">
                      {agent.name}
                    </span>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[agent.status] ?? STATUS_DOT.idle)} />
                  </div>
                  <p className="text-zinc-600 text-[10px] font-mono truncate capitalize">
                    {agent.status === 'idle' ? agent.role : agent.status}
                  </p>
                  {lockedFiles.length > 0 && (
                    <p className="text-cyan-500/70 text-[10px] font-mono truncate mt-0.5">
                      ✎ {lockedFiles.join(', ')}
                    </p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer — quick actions */}
      <div className="px-3 py-3 border-t border-zinc-800/60 shrink-0 space-y-1.5">
        {Object.values(OPERON.agents).map(a => (
          <button
            key={a.id}
            onClick={() => bus.emit('agent.switched', { agentId: a.id, agentName: a.displayName, role: a.id })}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors text-left"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
            Ask {a.displayName}
          </button>
        ))}
      </div>
    </div>
  )
}
