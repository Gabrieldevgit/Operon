// ============================================================
// Sync Engine — Phase 08, Task 8
// Real-time sync engine: no refresh cycles, live state everywhere.
//
// Responsibilities:
//   1. Subscribe to all EventBus events and fan them out to any
//      registered sync adapter (Firestore, Supabase, WebSocket).
//   2. Queue events during connectivity gaps and drain on reconnect.
//   3. Broadcast IDE store changes (file edits, locks, plans) to
//      other browser tabs via BroadcastChannel.
//   4. Expose a React hook so components can see live sync status.
// ============================================================
import { bus, type CoworkerEventType } from '@/lib/events/bus'

// ─── Adapter interface ────────────────────────────────────────

export interface SyncAdapter {
  name:    string
  push:    (event: string, payload: unknown) => Promise<void>
  connect: () => Promise<void>
  disconnect: () => void
}

// ─── Sync status ─────────────────────────────────────────────

export type SyncStatus = 'idle' | 'connected' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status:      SyncStatus
  lastSyncAt:  number | null
  queueLength: number
  adapters:    Record<string, SyncStatus>
}

// ─── Events that should be synced across sessions ─────────────
// Low-signal events (step.emitted floods) are excluded.

const SYNC_EVENTS: CoworkerEventType[] = [
  'task.started', 'task.completed', 'task.failed', 'task.delegated',
  'tool.executed', 'tool.denied',
  'memory.created', 'memory.updated', 'memory.deleted', 'memory.loaded',
  'approval.pending', 'approval.resolved',
  'agent.status', 'agent.switched',
  'step.completed', 'step.failed',
  'workspace.ready', 'workspace.reset',
  'persistence.synced', 'persistence.error',
]

// ─── Sync Engine ─────────────────────────────────────────────

export class SyncEngine {
  private adapters:   Map<string, SyncAdapter> = new Map()
  private queue:      Array<{ event: string; payload: unknown; ts: number }> = []
  private status:     SyncStatus = 'idle'
  private listeners:  Array<(state: SyncState) => void> = []
  private unsubscribers: Array<() => void> = []
  private channel:   BroadcastChannel | null = null
  private readonly MAX_QUEUE = 500

  // ── Adapter management ───────────────────────────────────

  register(adapter: SyncAdapter) {
    this.adapters.set(adapter.name, adapter)
  }

  unregister(name: string) {
    this.adapters.get(name)?.disconnect()
    this.adapters.delete(name)
  }

  // ── Lifecycle ────────────────────────────────────────────

  async start() {
    if (this.status !== 'idle') return

    // Connect all adapters
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.connect()
      } catch (err) {
        console.error(`[SyncEngine] Failed to connect adapter "${adapter.name}":`, err)
      }
    }

    // Subscribe to EventBus for every sync-worthy event
    for (const event of SYNC_EVENTS) {
      const off = bus.on(event, (payload) => {
        void this._push(event, payload)
      })
      this.unsubscribers.push(off)
    }

    // BroadcastChannel for same-origin tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('coworker:sync')
      this.channel.addEventListener('message', (ev) => {
        // Re-emit events received from other tabs into the local bus
        // (avoid infinite loops by tagging external events)
        if (ev.data?.source === 'external') return
        try {
          const { event, payload } = ev.data
          if (event && SYNC_EVENTS.includes(event as CoworkerEventType)) {
            // silently update local stores here if needed
          }
        } catch {}
      })
    }

    this._setStatus('connected')
    await this._drainQueue()
  }

  stop() {
    for (const off of this.unsubscribers) off()
    this.unsubscribers = []
    for (const adapter of this.adapters.values()) adapter.disconnect()
    this.channel?.close()
    this.channel = null
    this._setStatus('idle')
  }

  // ── Push to all adapters ─────────────────────────────────

  private async _push(event: string, payload: unknown) {
    // Broadcast to other tabs
    try {
      this.channel?.postMessage({ event, payload, source: 'local', ts: Date.now() })
    } catch {}

    if (this.adapters.size === 0) return

    this._setStatus('syncing')
    const item = { event, payload, ts: Date.now() }

    // Try all adapters
    let anyFailed = false
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.push(event, payload)
      } catch (err) {
        console.error(`[SyncEngine] Adapter "${adapter.name}" push failed:`, err)
        anyFailed = true
        // Queue for retry
        this.queue.push(item)
        if (this.queue.length > this.MAX_QUEUE) this.queue.shift()
      }
    }

    this._setStatus(anyFailed ? 'error' : 'connected')
    this._notify()
  }

  // ── Drain queued events after reconnect ──────────────────

  private async _drainQueue() {
    if (this.queue.length === 0) return
    this._setStatus('syncing')

    const toRetry = [...this.queue]
    this.queue = []

    for (const item of toRetry) {
      for (const adapter of this.adapters.values()) {
        try {
          await adapter.push(item.event, item.payload)
        } catch {
          // Re-queue on failure
          this.queue.push(item)
        }
      }
    }

    this._setStatus('connected')
    this._notify()
  }

  // ── Status helpers ───────────────────────────────────────

  private _setStatus(s: SyncStatus) { this.status = s }

  private _notify() {
    const state = this.getState()
    for (const fn of this.listeners) fn(state)
  }

  getState(): SyncState {
    return {
      status:      this.status,
      lastSyncAt:  bus.getHistory().at(-1)?.ts ?? null,
      queueLength: this.queue.length,
      adapters:    Object.fromEntries(
        [...this.adapters.entries()].map(([k]) => [k, this.status])
      ),
    }
  }

  // ── React subscription ───────────────────────────────────

  subscribe(fn: (state: SyncState) => void): () => void {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter(l => l !== fn) }
  }
}

// ─── Singleton ────────────────────────────────────────────────

export const syncEngine = new SyncEngine()

// ─── React hook ───────────────────────────────────────────────

import { useEffect, useState } from 'react'

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(() => syncEngine.getState())

  useEffect(() => {
    return syncEngine.subscribe(setState)
  }, [])

  return state
}

// ─── Status indicator component ──────────────────────────────

import { cn } from '@/lib/utils'

export function SyncStatusDot({ className }: { className?: string }) {
  const { status, queueLength } = useSyncStatus()

  const cfg = {
    idle:      { dot: 'bg-zinc-600',  label: 'Idle' },
    connected: { dot: 'bg-emerald-500', label: 'Synced' },
    syncing:   { dot: 'bg-cyan-400 animate-pulse', label: 'Syncing…' },
    error:     { dot: 'bg-amber-400',  label: `${queueLength} queued` },
    offline:   { dot: 'bg-rose-500 animate-pulse', label: 'Offline' },
  }[status]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      <span className="text-[11px] font-mono text-zinc-500">{cfg.label}</span>
    </div>
  )
}
