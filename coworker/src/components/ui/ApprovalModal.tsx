'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, ShieldCheck, FileEdit, Terminal, X } from 'lucide-react'
import { AgentAvatar } from '@/components/agents/AgentAvatar'
import { RISK_COLORS } from '@/lib/agent-config'
import { cn } from '@/lib/utils'
import type { ApprovalRequest } from '@/types'

interface Props {
  request:   ApprovalRequest | null
  onApprove: (id: string, remember: boolean) => void
  onDeny:    (id: string, remember: boolean) => void
}

const RISK_ICONS = {
  safe:     <ShieldCheck className="w-4 h-4" />,
  medium:   <ShieldAlert className="w-4 h-4" />,
  high:     <ShieldAlert className="w-4 h-4" />,
  critical: <ShieldAlert className="w-4 h-4" />,
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'file-write': <FileEdit className="w-3.5 h-3.5" />,
  'terminal':   <Terminal className="w-3.5 h-3.5" />,
}

export function ApprovalModal({ request, onApprove, onDeny }: Props) {
  const [remember, setRemember] = useState(false)

  if (!request) return null
  const riskStyle = RISK_COLORS[request.risk]

  return (
    <AnimatePresence>
      {request && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onDeny(request.id, false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm rounded-2xl border overflow-hidden"
              style={{
                background:   'rgba(10,12,20,0.98)',
                borderColor:  riskStyle.border,
                boxShadow:    `0 0 40px -8px ${riskStyle.border}`,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Risk header bar */}
              <div
                className="px-4 py-3 flex items-center gap-2.5 border-b"
                style={{ background: riskStyle.bg, borderColor: riskStyle.border }}
              >
                <span style={{ color: riskStyle.text }}>{RISK_ICONS[request.risk]}</span>
                <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: riskStyle.text }}>
                  {request.risk} risk action
                </span>
                <button
                  onClick={() => onDeny(request.id, false)}
                  className="ml-auto text-white/30 hover:text-white/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Agent + action */}
                <div className="flex items-start gap-3">
                  <AgentAvatar role={'frontend-dev'} name={request.agentName} size="md" />
                  <div>
                    <div className="text-xs font-mono text-white/40 mb-0.5">{request.agentName} wants to:</div>
                    <p className="text-sm text-white/90 font-medium leading-snug">{request.action}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="px-3 py-2.5 rounded-xl border border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs text-white/50 leading-relaxed">{request.reason}</p>
                </div>

                {/* Affected files */}
                {request.affectedFiles?.length ? (
                  <div>
                    <p className="text-[10px] font-mono text-white/25 mb-1.5">Affected files</p>
                    <div className="flex flex-wrap gap-1">
                      {request.affectedFiles.map(f => (
                        <code key={f} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 font-mono border border-white/[0.07]">
                          {f}
                        </code>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Reversible note */}
                <div className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full', request.reversible ? 'bg-emerald-400' : 'bg-amber-400')} />
                  <span className="text-[11px] font-mono text-white/30">
                    {request.reversible ? 'This action can be undone' : 'This action cannot be undone'}
                  </span>
                </div>

                {/* Remember toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <button
                    role="checkbox"
                    aria-checked={remember}
                    onClick={() => setRemember(v => !v)}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      remember ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 bg-transparent'
                    )}
                  >
                    {remember && <span className="text-[9px] text-white">✓</span>}
                  </button>
                  <span className="text-[11px] text-white/40">
                    Remember this decision for {request.agentName}
                  </span>
                </label>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onDeny(request.id, remember)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-sm font-medium transition-colors',
                      'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70',
                      'border border-white/10'
                    )}
                  >
                    Deny
                  </button>
                  <motion.button
                    onClick={() => onApprove(request.id, remember)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors border"
                    style={{
                      background:   riskStyle.bg,
                      borderColor:  riskStyle.border,
                      color:        riskStyle.text,
                    }}
                  >
                    Allow
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
