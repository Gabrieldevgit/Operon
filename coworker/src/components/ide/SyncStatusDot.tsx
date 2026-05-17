'use client'
// ============================================================
// SyncStatusDot — Bug fix #5
// Extracted from sync-engine.ts (which is a .ts file and cannot
// contain JSX). Import this component wherever you need the
// live sync indicator — top bar, status bar, etc.
// ============================================================
import { syncEngine, useSyncStatus } from '@/lib/ide/sync-engine'
import { cn }                        from '@/lib/utils'

export function SyncStatusDot({ className }: { className?: string }) {
  const { status, queueLength } = useSyncStatus()

  const cfg = {
    idle:      { dot: 'bg-zinc-600',              label: 'Idle'              },
    connected: { dot: 'bg-emerald-500',            label: 'Synced'            },
    syncing:   { dot: 'bg-cyan-400 animate-pulse', label: 'Syncing…'          },
    error:     { dot: 'bg-amber-400',              label: `${queueLength} queued` },
    offline:   { dot: 'bg-rose-500 animate-pulse', label: 'Offline'           },
  }[status]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      <span className="text-[11px] font-mono text-zinc-500">{cfg.label}</span>
    </div>
  )
}
