// ============================================================
// Cross-Session Memory
// Loads previous session memories + conversation history so
// agents know what happened in past sessions.
// ============================================================
import { useMemoryStore } from '@/store/memory.store'
import type { MemoryEntry } from '@/types'

// ─── Firestore loader ─────────────────────────────────────────

export async function loadPersistedMemories(
  workspaceId: string
): Promise<number> {
  try {
    const { firestore } = await import('@/lib/firebase/client')
    const { collection, query, where, orderBy, getDocs, Timestamp } =
      await import('firebase/firestore')

    const db  = firestore()
    const col = collection(db, 'memories')
    const q   = query(
      col,
      where('workspaceId', '==', workspaceId),
      orderBy('importance', 'desc')
    )

    const snap  = await getDocs(q)
    const store = useMemoryStore.getState()
    const now   = Date.now()
    let loaded  = 0

    snap.forEach(doc => {
      const d    = doc.data()
      const exp  = d.expiresAt instanceof Timestamp ? d.expiresAt.toMillis() : undefined
      if (exp && exp < now) return             // skip expired
      if (store.entries[d.id]) return          // already loaded

      const entry: MemoryEntry = {
        id:          d.id as string,
        workspaceId: d.workspaceId as string,
        key:         d.key as string,
        type:        d.type as MemoryEntry['type'],
        scope:       d.scope as MemoryEntry['scope'],
        agentId:     d.agentId as string | undefined,
        content:     d.content as string,
        tags:        (d.tags as string[]) ?? [],
        importance:  (d.importance as 1|2|3|4|5) ?? 3,
        metadata:    d.metadata as Record<string, unknown> | undefined,
        createdAt:   (d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now()),
        updatedAt:   (d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : Date.now()),
        expiresAt:   exp,
      }
      store.store(entry)
      loaded++
    })

    console.log(`[Memory] Loaded ${loaded} persisted entries for ${workspaceId}`)
    return loaded
  } catch (err) {
    console.warn('[Memory] Firestore load skipped (not configured):', (err as Error).message)
    return 0
  }
}

// ─── Supabase conversation loader ─────────────────────────────

export interface PersistedMessage {
  id:        string
  role:      'user' | 'agent'
  agentId?:  string
  agentName?: string
  content:   string
  timestamp: number
}

export async function loadConversationHistory(
  workspaceId: string,
  limit = 40
): Promise<PersistedMessage[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error

    return ((data ?? []) as Array<{
      id: string; role: string; agent_id?: string;
      agent_name?: string; content: string; timestamp: number
    }>)
      .reverse()
      .map(r => ({
        id:        r.id,
        role:      r.role as 'user' | 'agent',
        agentId:   r.agent_id,
        agentName: r.agent_name,
        content:   r.content,
        timestamp: r.timestamp,
      }))
  } catch (err) {
    console.warn('[Memory] Supabase conversation load skipped:', (err as Error).message)
    return []
  }
}

export async function saveMessage(
  workspaceId: string,
  msg: PersistedMessage
): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    await supabase.from('conversations').insert({
      id:           msg.id,
      workspace_id: workspaceId,
      role:         msg.role,
      agent_id:     msg.agentId,
      agent_name:   msg.agentName,
      content:      msg.content,
      timestamp:    msg.timestamp,
    })
  } catch {
    // Silent — conversation persistence is best-effort
  }
}

// ─── Firestore sync starter ────────────────────────────────────

let _syncUnsub: (() => void) | null = null

export async function startPersistenceSync(workspaceId: string): Promise<void> {
  if (_syncUnsub) return // already running

  try {
    const { firestore }  = await import('@/lib/firebase/client')
    const { startMemorySync } = await import('./persistence')
    _syncUnsub = startMemorySync(firestore())
    console.log('[Memory] Firestore sync started')
  } catch {
    console.warn('[Memory] Firestore sync skipped (not configured)')
  }
}

export function stopPersistenceSync() {
  _syncUnsub?.()
  _syncUnsub = null
}
