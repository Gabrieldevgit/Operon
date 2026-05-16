'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ListChecks, Clock, RotateCcw } from 'lucide-react'
import { StepsFeed }            from '@/components/steps/StepsFeed'
import { AgentChecklist }       from '@/components/steps/AgentChecklist'
import { StepReplayTimeline }   from '@/components/steps/StepReplayTimeline'
import { useStepsStore }        from '@/store/steps.store'
import { cn }                   from '@/lib/utils'

type Tab = 'feed' | 'checklist' | 'replay'

const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
  { key: 'feed',      icon: <Activity   className="w-3.5 h-3.5" />, label: 'Steps'     },
  { key: 'checklist', icon: <ListChecks className="w-3.5 h-3.5" />, label: 'Checklist' },
  { key: 'replay',    icon: <Clock      className="w-3.5 h-3.5" />, label: 'Replay'    },
]

interface Props {
  steps: import('@/types').AIStep[]
  open:  boolean
  onClear?: () => void
}

export function StepsPanel({ steps, open, onClear }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const totalSteps  = useStepsStore(s => s.stepOrder.length)
  const replayActive = useStepsStore(s => s.replay.active)

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="steps"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="h-full flex-shrink-0 overflow-hidden border-l border-white/[0.07]"
          style={{ background: 'rgba(8,10,16,0.95)' }}
        >
          <div className="flex flex-col h-full w-[300px]">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono text-white/60">Observability</span>
                {totalSteps > 0 && (
                  <span className="text-[10px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">
                    {totalSteps}
                  </span>
                )}
              </div>

              {/* Replay mode toggle */}
              <button
                onClick={() => {
                  useStepsStore.getState().setReplay({ active: !replayActive, playing: false, position: 0 })
                  if (!replayActive) setActiveTab('replay')
                  else setActiveTab('feed')
                }}
                className={cn(
                  'flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded transition-colors',
                  replayActive
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-white/20 hover:text-white/50'
                )}
                title="Toggle replay mode"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                replay
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-white/[0.06] flex-shrink-0">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono transition-colors',
                    activeTab === tab.key
                      ? 'text-white/70 border-b-2 border-indigo-500'
                      : 'text-white/25 hover:text-white/50'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'feed' && (
                  <motion.div
                    key="feed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="h-full"
                  >
                    <StepsFeed />
                  </motion.div>
                )}
                {activeTab === 'checklist' && (
                  <motion.div
                    key="checklist"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="h-full overflow-y-auto"
                  >
                    <AgentChecklist />
                  </motion.div>
                )}
                {activeTab === 'replay' && (
                  <motion.div
                    key="replay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="h-full"
                  >
                    <StepReplayTimeline />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 flex-shrink-0">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono text-white/20">
                {replayActive ? 'replay mode' : 'live feed'}
              </span>
              <span className="text-[10px] font-mono text-white/15 ml-auto">⌘\</span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
