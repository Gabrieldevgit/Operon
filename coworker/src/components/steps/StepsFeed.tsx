'use client'
import { useRef, useEffect } from 'react'
import { AnimatePresence }   from 'framer-motion'
import { Trash2 }            from 'lucide-react'
import { useStepsStore, type StepGranularity } from '@/store/steps.store'
import { StepItem }     from './StepItem'
import { ThinkingFeed } from './ThinkingCard'
import { cn }           from '@/lib/utils'

const GRANULARITY_OPTS: { key: StepGranularity; label: string; desc: string }[] = [
  { key: 'summary',  label: 'Summary',  desc: 'Delegation + results only' },
  { key: 'standard', label: 'Standard', desc: 'All agent actions'         },
  { key: 'verbose',  label: 'Verbose',  desc: 'Every internal step'       },
]

export function StepsFeed() {
  const store       = useStepsStore()
  const granularity = useStepsStore(s => s.granularity)
  const visible     = store.getVisibleSteps()
  const bottomRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visible.length])

  return (
    <div className="flex flex-col h-full">

      {/* Granularity controls */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06]">
        {GRANULARITY_OPTS.map(o => (
          <button
            key={o.key}
            onClick={() => store.setGranularity(o.key)}
            title={o.desc}
            className={cn(
              'text-[10px] font-mono px-2 py-1 rounded transition-colors',
              granularity === o.key
                ? 'bg-white/10 text-white/80'
                : 'text-white/25 hover:text-white/50'
            )}
          >
            {o.label}
          </button>
        ))}
        <div className="flex-1" />
        {visible.length > 0 && (
          <button
            onClick={() => store.clearAll()}
            className="text-white/15 hover:text-white/40 transition-colors"
            title="Clear all steps"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Thinking events (above the feed) */}
      <ThinkingFeed />

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto py-1">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <span className="text-2xl opacity-10">◈</span>
            <p className="text-[11px] font-mono text-white/20">
              Steps appear here as agents work.
            </p>
            {granularity === 'summary' && (
              <p className="text-[10px] text-white/15">
                Switch to Standard to see more detail.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence initial={false}>
              {visible.map(step => (
                <StepItem key={step.id} step={step} />
              ))}
            </AnimatePresence>
            <div ref={bottomRef} className="h-2" />
          </div>
        )}
      </div>
    </div>
  )
}
