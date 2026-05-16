'use client'
// ============================================================
// PlanCard + ThinkingLayer — Phase 08, Tasks 3 & 4
//
// PlanCard: shows a pending ExecutionPlan waiting for approval.
// ThinkingLayer: shows the AI's structured reasoning preview
//   (intent / strategy / steps / risk / confidence) inline in chat,
//   collapsible, with animated reveal.
// ============================================================
import { useState }         from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIDEStore }       from '@/store/ide.store'
import type { ExecutionPlan, PlanStep } from '@/store/ide.store'
import { cn }                from '@/lib/utils'

// ─── Risk badge ───────────────────────────────────────────────

const RISK_CONFIG = {
  safe:     { label: 'SAFE',     classes: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40' },
  medium:   { label: 'MEDIUM',   classes: 'bg-amber-900/40  text-amber-400  border-amber-700/40'  },
  high:     { label: 'HIGH',     classes: 'bg-rose-900/40   text-rose-400   border-rose-700/40'   },
  critical: { label: 'CRITICAL', classes: 'bg-rose-950/60   text-rose-300   border-rose-600/60 animate-pulse' },
} as const

function RiskBadge({ risk }: { risk: ExecutionPlan['riskLevel'] }) {
  const cfg = RISK_CONFIG[risk]
  return (
    <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded border tracking-wider', cfg.classes)}>
      {cfg.label}
    </span>
  )
}

// ─── Step row in plan ─────────────────────────────────────────

function PlanStepRow({ step, index }: { step: PlanStep; index: number }) {
  const icon = {
    pending: <span className="text-zinc-600">○</span>,
    active:  <span className="text-cyan-400 animate-pulse">◉</span>,
    done:    <span className="text-emerald-400">✓</span>,
    failed:  <span className="text-rose-400">✗</span>,
    skipped: <span className="text-zinc-600">—</span>,
  }[step.status]

  return (
    <div className={cn(
      'flex items-start gap-2.5 px-3 py-2 rounded text-[12px] transition-colors',
      step.status === 'active' && 'bg-cyan-950/30 border border-cyan-800/30',
      step.status === 'done'   && 'opacity-60',
    )}>
      <span className="mt-0.5 text-[14px] w-4 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-mono text-[10px]">{String(index + 1).padStart(2, '0')}</span>
          <span className={cn(
            'font-medium',
            step.status === 'active' ? 'text-cyan-300' : 'text-zinc-300'
          )}>{step.title}</span>
          {step.toolId && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/40">
              {step.toolId}
            </span>
          )}
        </div>
        {step.description && (
          <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">{step.description}</p>
        )}
        {step.filePath && (
          <span className="text-[10px] font-mono text-indigo-400/80 mt-0.5 block">{step.filePath}</span>
        )}
      </div>
    </div>
  )
}

// ─── Confidence bar ───────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">{value}%</span>
    </div>
  )
}

// ─── PlanCard ─────────────────────────────────────────────────

interface PlanCardProps {
  plan:      ExecutionPlan
  className?: string
}

export function PlanCard({ plan, className }: PlanCardProps) {
  const [expanded, setExpanded] = useState(true)
  const { approvePlan, rejectPlan } = useIDEStore()

  const isPending  = plan.status === 'pending'
  const isExecuting = plan.status === 'executing'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        'bg-zinc-950/80 backdrop-blur-sm',
        isPending   && 'border-indigo-700/50 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]',
        isExecuting && 'border-cyan-700/50 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]',
        plan.status === 'done'     && 'border-emerald-800/40',
        plan.status === 'rejected' && 'border-zinc-800 opacity-50',
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full shrink-0',
          isPending   && 'bg-indigo-400 animate-pulse',
          isExecuting && 'bg-cyan-400 animate-ping',
          plan.status === 'approved' && 'bg-emerald-400',
          plan.status === 'done'     && 'bg-emerald-600',
          plan.status === 'rejected' && 'bg-zinc-600',
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              {isPending ? 'Awaiting approval' : plan.status}
            </span>
            <RiskBadge risk={plan.riskLevel} />
          </div>
          <p className="text-zinc-200 text-sm font-medium mt-0.5 truncate">{plan.title}</p>
        </div>

        <span className="text-zinc-600 text-[12px]">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-800/60 space-y-4">
              {/* Intent + Strategy */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="rounded-lg bg-zinc-900/60 px-3 py-2.5 border border-zinc-800/60">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Intent</p>
                  <p className="text-zinc-300 text-[12px] leading-relaxed">{plan.intent}</p>
                </div>
                <div className="rounded-lg bg-zinc-900/60 px-3 py-2.5 border border-zinc-800/60">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Strategy</p>
                  <p className="text-zinc-300 text-[12px] leading-relaxed">{plan.strategy}</p>
                </div>
              </div>

              {/* Confidence */}
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Confidence</p>
                <ConfidenceBar value={plan.confidence} />
              </div>

              {/* Steps */}
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">
                  Steps ({plan.steps.length})
                </p>
                <div className="space-y-0.5">
                  {plan.steps.map((step, i) => (
                    <PlanStepRow key={step.id} step={step} index={i} />
                  ))}
                </div>
              </div>

              {/* Approval actions */}
              {isPending && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => approvePlan(plan.id)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors border border-indigo-500/60"
                  >
                    Approve & Execute
                  </button>
                  <button
                    onClick={() => rejectPlan(plan.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors border border-zinc-700/60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── ThinkingLayer ────────────────────────────────────────────
// Sits inside the chat stream, shows AI reasoning BEFORE final output.
// Expandable, with animated line-by-line reveal.

export interface ThinkingSnapshot {
  agentId:    string
  agentName:  string
  agentColor: string
  thoughts:   string[]          // each string is one reasoning line
  isComplete: boolean
}

interface ThinkingLayerProps {
  snapshot:  ThinkingSnapshot
  className?: string
}

export function ThinkingLayer({ snapshot, className }: ThinkingLayerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('mb-2', className)}>
      {/* Toggle pill */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono',
          'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600',
          'transition-all duration-200 select-none',
          !snapshot.isComplete && 'animate-pulse'
        )}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: snapshot.agentColor }}
        />
        <span className="text-zinc-400">
          {snapshot.agentName}
          {snapshot.isComplete ? ' · thought for a moment' : ' · thinking…'}
        </span>
        <span className="text-zinc-600 ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {/* Thought lines */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 space-y-1.5">
              {snapshot.thoughts.map((thought, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="text-[12px] text-zinc-500 leading-relaxed font-mono"
                >
                  <span className="text-zinc-700 select-none mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {thought}
                </motion.p>
              ))}
              {!snapshot.isComplete && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="flex gap-1 pt-1"
                >
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1 h-1 rounded-full bg-zinc-600" />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
