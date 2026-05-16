'use client'
import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, FastForward } from 'lucide-react'
import { useStepsStore } from '@/store/steps.store'
import { AGENT_COLORS, STEP_ICONS } from '@/lib/agent-config'
import { formatDuration, cn } from '@/lib/utils'
import type { AgentRole } from '@/types'

export function StepReplayTimeline() {
  const store      = useStepsStore()
  const allSteps   = store.stepOrder.map(id => store.steps[id]).filter(Boolean) as NonNullable<typeof store.steps[string]>[]
  const replay     = store.replay
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-advance when playing
  useEffect(() => {
    if (!replay.playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      store.setReplay({ position: Math.min(replay.position + 1, allSteps.length - 1) })
      if (replay.position >= allSteps.length - 1) {
        store.setReplay({ playing: false })
      }
    }, replay.speedMs)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [replay.playing, replay.position, replay.speedMs, allSteps.length])

  const togglePlay = useCallback(() => {
    if (replay.position >= allSteps.length - 1) {
      store.setReplay({ position: 0, playing: true })
    } else {
      store.setReplay({ playing: !replay.playing })
    }
  }, [replay, allSteps.length])

  const setSpeed = useCallback((ms: number) => {
    store.setReplay({ speedMs: ms })
  }, [])

  if (allSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-6">
        <span className="text-2xl opacity-10">⟶</span>
        <p className="text-[11px] font-mono text-white/20">No steps to replay yet.</p>
      </div>
    )
  }

  const currentStep = allSteps[replay.position]
  const totalMs     = allSteps.length > 1
    ? (allSteps.at(-1)!.timestamp - allSteps[0]!.timestamp)
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Current step info */}
      {currentStep && (
        <div className="px-3 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-sm"
              style={{ color: AGENT_COLORS[currentStep.agentRole as AgentRole] ?? '#7C6FE0' }}
            >
              {STEP_ICONS[currentStep.category] ?? '·'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate">{currentStep.title}</p>
              <p className="text-[10px] font-mono text-white/30">{currentStep.agentName}</p>
            </div>
            <span className="text-[10px] font-mono text-white/25">
              {replay.position + 1} / {allSteps.length}
            </span>
          </div>
        </div>
      )}

      {/* Timeline track */}
      <div className="px-3 py-3 flex-1 overflow-hidden">
        <div className="relative h-12 flex items-center gap-px">
          {allSteps.map((step, i) => {
            const color    = AGENT_COLORS[step.agentRole as AgentRole] ?? '#7C6FE0'
            const isPast   = i <= replay.position
            const isCurrent = i === replay.position
            const width    = step.durationMs
              ? Math.max(4, Math.min(40, (step.durationMs / 5000) * 40))
              : 4

            return (
              <motion.button
                key={step.id}
                onClick={() => store.setReplay({ position: i, playing: false })}
                title={`${step.agentName}: ${step.title}`}
                className={cn(
                  'h-4 rounded-sm flex-shrink-0 transition-all duration-150 cursor-pointer',
                  isCurrent ? 'h-8 ring-1 ring-white/30' : isPast ? 'opacity-80' : 'opacity-25'
                )}
                style={{
                  width,
                  backgroundColor: isPast ? color : 'rgba(255,255,255,0.1)',
                  boxShadow: isCurrent ? `0 0 8px ${color}60` : 'none',
                }}
                whileHover={{ scaleY: 1.5 }}
              />
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-white/8 rounded-full">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            animate={{ width: `${((replay.position + 1) / allSteps.length) * 100}%` }}
            transition={{ duration: 0.15 }}
          />
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono text-white/20">start</span>
          {totalMs > 0 && (
            <span className="text-[9px] font-mono text-white/20">{formatDuration(totalMs)} total</span>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 border-t border-white/[0.06]">
        <button
          onClick={() => store.setReplay({ position: 0, playing: false })}
          className="p-1.5 rounded text-white/30 hover:text-white/70 transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => store.setReplay({ position: Math.max(0, replay.position - 1), playing: false })}
          className="p-1.5 rounded text-white/30 hover:text-white/70 transition-colors"
        >
          ‹
        </button>

        <button
          onClick={togglePlay}
          className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors border border-indigo-500/30"
        >
          {replay.playing
            ? <Pause className="w-3.5 h-3.5" />
            : <Play  className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => store.setReplay({ position: Math.min(allSteps.length - 1, replay.position + 1), playing: false })}
          className="p-1.5 rounded text-white/30 hover:text-white/70 transition-colors"
        >
          ›
        </button>

        <button
          onClick={() => store.setReplay({ position: allSteps.length - 1, playing: false })}
          className="p-1.5 rounded text-white/30 hover:text-white/70 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Speed selector */}
        <div className="ml-2 flex items-center gap-0.5">
          {[{ label: '1×', ms: 600 }, { label: '2×', ms: 300 }, { label: '4×', ms: 150 }].map(s => (
            <button
              key={s.ms}
              onClick={() => setSpeed(s.ms)}
              className={cn(
                'text-[9px] font-mono px-1.5 py-1 rounded transition-colors',
                replay.speedMs === s.ms ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/50'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
