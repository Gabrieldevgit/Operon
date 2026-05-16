// ============================================================
// Memory Persistence — Supabase (long-term layer)
//
// ── Why two persistence layers? (Bug 6 fix) ─────────────────
//
//   Firestore (persistence.ts)
//     • Realtime agent memory — what agents actively read/write.
//     • Short-to-medium lifetime (hours → days).
//     • Scope: project + global memory entries only.
//
//   Supabase (THIS FILE)
//     • Long-term archive — conversation history, completed
//       task records, and analytics rows older than 7 days.
//     • Relational — tasks join to agents join to workspaces.
//     • Never write the same row to both stores.
//       Firestore = live context.  Supabase = permanent record.
//
// ── Data flow ────────────────────────────────────────────────
//
//   Agent writes memory
//     → Zustand store (in-memory, instant)
//     → Firestore (realtime sync, bus emits 'persistence.synced')
//
//   Conversation ends / task completes
//     → archiveConversation() / archiveCompletedTask() here
//     → Supabase row inserted (Postgres, permanent)
//     → bus emits 'persistence.synced' with destination='supabase'
//
// ============================================================

import { createBrowserClient } from '@supabase/ssr'
import { bus }                 from '@/lib/events/bus'
import type { MemoryEntry }    from '@/types'

// ─── Supabase client (browser-safe) ──────────────────────────

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Archive a completed conversation to Supabase ────────────
// Called when a chat session ends or the user explicitly saves it.
// Maps to the `conversations` table (migration 002_conversations.sql).

export interface ConversationRow {
  workspace_id: string
  agent_id:     string
  session_id:   string
  messages:     Array<{ role: string; content: string; ts: number }>
  summary?:     string
  task_id?:     string
}

export async function archiveConversation(row: ConversationRow): Promise<void> {
  const supabase = getClient()
  try {
    const { error } = await supabase
      .from('conversations')
      .insert({
        workspace_id: row.workspace_id,
        agent_id:     row.agent_id,
        session_id:   row.session_id,
        messages:     row.messages,
        summary:      row.summary ?? null,
        task_id:      row.task_id ?? null,
        archived_at:  new Date().toISOString(),
      })

    if (error) throw error

    bus.emit('persistence.synced', {
      entryCount:  row.messages.length,
      destination: 'supabase',
    })
  } catch (err) {
    console.error('[Supabase] Failed to archive conversation:', err)
    bus.emit('persistence.error', { source: 'supabase:conversations', error: String(err) })
  }
}

// ─── Archive memory entries that aged out of Firestore ───────
// Run after a workspace session ends to promote important entries
// (importance >= 4) into Supabase for long-term recall.

export async function archiveAgedMemories(
  entries: MemoryEntry[],
  workspaceId: string
): Promise<number> {
  const supabase = getClient()
  const important = entries.filter(e => e.importance >= 4 && e.scope !== 'session')

  if (important.length === 0) return 0

  try {
    const rows = important.map(e => ({
      id:           e.id,
      workspace_id: workspaceId,
      agent_id:     e.agentId ?? null,
      key:          e.key,
      type:         e.type,
      scope:        e.scope,
      content:      e.content,
      tags:         e.tags,
      importance:   e.importance,
      metadata:     e.metadata ?? null,
      created_at:   new Date(e.createdAt).toISOString(),
      updated_at:   new Date(e.updatedAt).toISOString(),
    }))

    const { error } = await supabase
      .from('memories_archive')
      .upsert(rows, { onConflict: 'id' })

    if (error) throw error

    bus.emit('persistence.synced', {
      entryCount:  rows.length,
      destination: 'supabase',
    })

    return rows.length
  } catch (err) {
    console.error('[Supabase] Failed to archive memories:', err)
    bus.emit('persistence.error', { source: 'supabase:memories_archive', error: String(err) })
    return 0
  }
}

// ─── Retrieve archived memories for a workspace ──────────────
// Used on workspace load to restore long-term context that has
// aged out of Firestore.

export async function loadArchivedMemories(
  workspaceId: string,
  limit = 20
): Promise<MemoryEntry[]> {
  const supabase = getClient()
  try {
    const { data, error } = await supabase
      .from('memories_archive')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('importance', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data ?? []).map(row => ({
      id:          row.id,
      workspaceId: row.workspace_id,
      agentId:     row.agent_id ?? undefined,
      key:         row.key,
      type:        row.type,
      scope:       row.scope,
      content:     row.content,
      tags:        row.tags ?? [],
      importance:  row.importance,
      metadata:    row.metadata ?? undefined,
      createdAt:   new Date(row.created_at).getTime(),
      updatedAt:   new Date(row.updated_at).getTime(),
    }))
  } catch (err) {
    console.error('[Supabase] Failed to load archived memories:', err)
    bus.emit('persistence.error', { source: 'supabase:memories_archive:load', error: String(err) })
    return []
  }
}
