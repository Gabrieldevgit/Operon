'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Copy, Check } from 'lucide-react'
import { AGENT_COLORS, STEP_ICONS } from '@/lib/agent-config'
import { formatTime, formatDuration, cn } from '@/lib/utils'
import type { AIStep, AgentRole } from '@/types'

interface Props { step: AIStep; compact?: boolean }

const STATUS_CLASSES: Record<string, string> = {
  pending:             'text-white/25',
  running:             'text-blue-400',
  completed:           'text-white/45',
  failed:              'text-red-400',
  skipped:             'text-white/20',
  'awaiting-approval': 'text-amber-400',
}

const RISK_DOT: Record<string, string> = {
  safe: 'bg-emerald-400', medium: 'bg-amber-400', high: 'bg-red-400', critical: 'bg-red-600',
}

function LiveDuration({ startMs }: { startMs: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startMs)
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startMs), 250)
    return () => clearInterval(t)
  }, [startMs])
  return <span className="text-blue-400/70">{formatDuration(elapsed)}</span>
}

export function StepItem({ step, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const color     = AGENT_COLORS[step.agentRole as AgentRole] ?? '#7C6FE0'
  const icon      = STEP_ICONS[step.category] ?? '·'
  const running   = step.status === 'running'
  const hasDetail = !!(step.detail || step.affectedFiles?.length || step.toolName)
  const canExpand = hasDetail && !compact

  function copyDetail() {
    const text = [step.title, step.toolName ? `Tool: ${step.toolName}` : null, step.detail, step.affectedFiles?.join(', ')].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="group">
      <button
        onClick={() => canExpand && setExpanded(v => !v)}
        className={cn('w-full flex items-start gap-2 px-3 py-1.5 rounded-lg text-left transition-colors',
          canExpand ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default')}
      >
        <span className={cn('font-mono text-xs mt-0.5 flex-shrink-0 w-4 text-center', running && 'animate-thinking')} style={{ color }}>
          {icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono" style={{ color: `${color}80` }}>{step.agentName}</span>
            {step.toolName && (
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-white/5 text-white/30 border border-white/[0.06]">{step.toolName}</span>
            )}
            {step.risk && step.risk !== 'safe' && (
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', RISK_DOT[step.risk])} />
            )}
            {running && (
              <motion.span className="text-[9px] font-mono text-blue-400/60" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>···</motion.span>
            )}
          </div>
          <p className={cn('text-xs leading-snug mt-0.5 truncate', STATUS_CLASSES[step.status])}>{step.title}</p>
        </div>

        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[52px]">
          <span className="text-[9px] font-mono text-white/15">{formatTime(step.timestamp)}</span>
          <span className="text-[9px] font-mono text-white/15">
            {running ? <LiveDuration startMs={step.timestamp} /> : step.durationMs != null ? formatDuration(step.durationMs) : null}
          </span>
          {canExpand && <ChevronDown className={cn('w-2.5 h-2.5 text-white/15 transition-transform mt-0.5', expanded && 'rotate-180')} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && hasDetail && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="mx-3 mb-1.5 px-3 py-2.5 rounded-xl border border-white/[0.06] relative" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <button onClick={copyDetail} className="absolute top-2 right-2 text-white/15 hover:text-white/50 transition-colors">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              {step.toolName && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">tool</span>
                  <span className="text-[10px] font-mono text-white/50">{step.toolName}</span>
                  {step.risk && (
                    <span className={cn('text-[9px] font-mono px-1 py-0.5 rounded border',
                      step.risk === 'safe'   ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                      step.risk === 'medium' ? 'text-amber-400   border-amber-400/20   bg-amber-400/5'   :
                                               'text-red-400     border-red-400/20     bg-red-400/5')}>
                      {step.risk}
                    </span>
                  )}
                </div>
              )}
              {step.detail && <p className="text-[11px] text-white/40 leading-relaxed whitespace-pre-wrap">{step.detail}</p>}
              {step.affectedFiles?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {step.affectedFiles.map(f => (
                    <code key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/35 font-mono border border-white/[0.06]">
                      {f.split('/').pop()}
                    </code>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
