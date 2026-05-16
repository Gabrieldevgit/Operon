'use client'
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { SLASH_COMMANDS } from '@/hooks/useSkillTrigger'
import { cn } from '@/lib/utils'

interface Props { onSend: (content: string) => void; disabled?: boolean }

export function ChatInput({ onSend, disabled }: Props) {
  const [value,        setValue]        = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [cmdFilter,    setCmdFilter]    = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredCmds = Object.entries(SLASH_COMMANDS).filter(([cmd]) =>
    cmdFilter === '' || cmd.includes(cmdFilter)
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setValue(val)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }

    if (val.startsWith('/')) {
      setShowCommands(true)
      setCmdFilter(val.split(' ')[0] ?? '/')
    } else {
      setShowCommands(false)
    }
  }, [])

  const send = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setShowCommands(false)
  }, [value, disabled, onSend])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape') setShowCommands(false)
  }, [send])

  const pickCommand = useCallback((cmd: string) => {
    setValue(cmd + ' ')
    setShowCommands(false)
    textareaRef.current?.focus()
  }, [])

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div
        className="relative rounded-xl border transition-colors"
        style={{
          background:  'rgba(255,255,255,0.04)',
          borderColor: canSend ? 'rgba(124,111,224,0.4)' : 'rgba(255,255,255,0.08)',
          boxShadow:   canSend ? '0 0 16px -4px rgba(124,111,224,0.2)' : 'none',
        }}
      >
        {/* Slash command picker */}
        <AnimatePresence>
          {showCommands && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-white/10 overflow-hidden z-50 max-h-72 overflow-y-auto"
              style={{ background: 'rgba(12,14,22,0.98)', backdropFilter: 'blur(12px)' }}
            >
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Skills & Commands</p>
              </div>
              {filteredCmds.map(([cmd, info]) => (
                <button
                  key={cmd}
                  onClick={() => pickCommand(cmd)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <code className="text-xs font-mono text-indigo-400 w-24 flex-shrink-0">{cmd}</code>
                  <span className="text-xs text-white/40 flex-1">{info.description}</span>
                  <span className="text-[9px] font-mono text-white/20 flex-shrink-0">
                    {info.agentId === 'agent_orc' ? 'Orion'
                   : info.agentId === 'agent_ui'  ? 'Vela'
                   : info.agentId === 'agent_dev' ? 'Kael' : 'Lyra'}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 p-2.5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder="Message the workspace… (/ for skills)"
            rows={1}
            disabled={disabled}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-white/80 placeholder:text-white/20',
              'outline-none font-sans leading-relaxed max-h-40 overflow-y-auto scrollbar-none py-0.5'
            )}
            style={{ minHeight: 24 }}
          />
          <motion.button
            onClick={send}
            disabled={!canSend}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              canSend ? 'bg-indigo-500/80 hover:bg-indigo-500 text-white' : 'bg-white/5 text-white/20'
            )}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <div className="flex items-center gap-3 px-3 pb-2">
          <span className="text-[10px] font-mono text-white/15">⏎ send</span>
          <span className="text-[10px] font-mono text-white/15">⇧⏎ newline</span>
          <span className="text-[10px] font-mono text-white/15">/ skills</span>
          {disabled && (
            <span className="text-[10px] font-mono text-indigo-400/50 ml-auto animate-pulse">agents working…</span>
          )}
        </div>
      </div>
    </div>
  )
}
