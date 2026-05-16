// ============================================================
// Memory Persistence — Firestore
// Syncs the Zustand memory store to/from Firestore so memories
// survive page refreshes and are shared across sessions.
// Call initMemoryPersistence() once on workspace load.
//
// ── Storage layer responsibilities (Bug 6 fix) ──────────────
//
//   Firestore (this file)
//     • Realtime state — memory entries that agents read/write
//       during an active session.
//     • Source of truth for live agent context.
//     • Audit log — every write has a timestamp, supports
//       Firestore's onSnapshot for live UI updates.
//     • TTL: entries with expiresAt are skipped on load and
//       periodically purged.
//
//   Supabase (src/lib/supabase/)
//     • Long-term persistence — completed tasks, conversation
//       history, and analytics that must survive > 30 days.
//     • Relational queries — join tasks ↔ agents ↔ users with
//       Postgres; not possible in Firestore without aggregation.
//     • Auth — Supabase Auth is the single source of user
//       identity. Firebase is initialized with a custom token
//       derived from the Supabase session.
//
//   Rule: never write the same data to both.
//   Memory entries → Firestore.  Conversation rows → Supabase.
// ============================================================
import {
  collection, doc, setDoc, getDocs,
  deleteDoc, query, where, orderBy, Timestamp,
  type Firestore,
} from 'firebase/firestore'
import { useMemoryStore } from '@/store/memory.store'
import { bus }            from '@/lib/events/bus'
import type { MemoryEntry } from '@/types'

const COLLECTION = 'memories'

// ─── Firestore document shape ─────────────────────────────────
interface MemoryDoc {
  id:          string
  workspaceId: string
  key:         string
  type:        string
  scope:       string
  agentId?:    string
  content:     string
  tags:        string[]
  importance:  number
  metadata?:   Record<string, unknown>
  createdAt:   Timestamp
  updatedAt:   Timestamp
  expiresAt?:  Timestamp | null
}

function toDoc(entry: MemoryEntry): MemoryDoc {
  return {
    id:          entry.id,
    workspaceId: entry.workspaceId,
    key:         entry.key,
    type:        entry.type,
    scope:       entry.scope,
    agentId:     entry.agentId,
    content:     entry.content,
    tags:        entry.tags,
    importance:  entry.importance,
    metadata:    entry.metadata,
    createdAt:   Timestamp.fromMillis(entry.createdAt),
    updatedAt:   Timestamp.fromMillis(entry.updatedAt),
    expiresAt:   entry.expiresAt ? Timestamp.fromMillis(entry.expiresAt) : null,
  }
}

function fromDoc(d: MemoryDoc): MemoryEntry {
  return {
    id:          d.id,
    workspaceId: d.workspaceId,
    key:         d.key,
    type:        d.type as MemoryEntry['type'],
    scope:       d.scope as MemoryEntry['scope'],
    agentId:     d.agentId,
    content:     d.content,
    tags:        d.tags,
    importance:  d.importance as MemoryEntry['importance'],
    metadata:    d.metadata,
    createdAt:   d.createdAt.toMillis(),
    updatedAt:   d.updatedAt.toMillis(),
    expiresAt:   d.expiresAt?.toMillis(),
  }
}

// ─── Load workspace memories from Firestore on startup ────────

export async function loadWorkspaceMemories(
  db: Firestore,
  workspaceId: string
): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('workspaceId', '==', workspaceId),
      orderBy('importance', 'desc')
    )

    const snapshot = await getDocs(q)
    const store    = useMemoryStore.getState()
    const now      = Date.now()
    let   loaded   = 0

    snapshot.forEach(docSnap => {
      const entry = fromDoc(docSnap.data() as MemoryDoc)
      // Skip expired entries
      if (entry.expiresAt && entry.expiresAt < now) return
      // Only load if not already in store
      if (!store.entries[entry.id]) {
        store.store(entry)
        loaded++
      }
    })

    console.log(`[Memory] Loaded ${loaded} entries for workspace ${workspaceId}`)
    bus.emit('memory.loaded', { count: loaded, workspaceId })
    bus.emit('persistence.synced', { entryCount: loaded, destination: 'firestore' })
    return loaded
  } catch (err) {
    console.error('[Memory] Failed to load from Firestore:', err)
    bus.emit('persistence.error', { source: 'firestore:load', error: String(err) })
    return 0
  }
}

// ─── Persist a single entry to Firestore ─────────────────────

export async function persistMemoryEntry(
  db: Firestore,
  entry: MemoryEntry
): Promise<void> {
  try {
    const ref = doc(collection(db, COLLECTION), entry.id)
    await setDoc(ref, toDoc(entry))
  } catch (err) {
    console.error('[Memory] Failed to persist entry:', err)
    bus.emit('persistence.error', { source: 'firestore:write', error: String(err) })
  }
}

// ─── Delete a single entry from Firestore ────────────────────

export async function deleteMemoryEntry(
  db: Firestore,
  entryId: string
): Promise<void> {
  try {
    await deleteDoc(doc(collection(db, COLLECTION), entryId))
  } catch (err) {
    console.error('[Memory] Failed to delete entry:', err)
    bus.emit('persistence.error', { source: 'firestore:delete', error: String(err) })
  }
}

// ─── Auto-sync hook: subscribe to store changes ───────────────
// Responsibility: Firestore = realtime agent memory (project + global scope).
// Session-scoped entries are intentionally excluded — they are ephemeral.
// Call once after Firebase is initialized. Returns an unsubscribe function.

export function startMemorySync(db: Firestore): () => void {
  const unsubscribe = useMemoryStore.subscribe(
    state => state.entries,
    (entries, prevEntries) => {
      let synced = 0

      // New or updated entries
      Object.values(entries).forEach(entry => {
        const prev = prevEntries[entry.id]
        if (!prev || prev.updatedAt !== entry.updatedAt) {
          // Firestore only stores project/global scope — session entries are transient
          if (entry.scope !== 'session') {
            void persistMemoryEntry(db, entry)
            synced++
          }
        }
      })

      // Deleted entries
      Object.keys(prevEntries).forEach(id => {
        if (!entries[id]) {
          void deleteMemoryEntry(db, id)
        }
      })

      if (synced > 0) {
        bus.emit('persistence.synced', { entryCount: synced, destination: 'firestore' })
      }
    }
  )

  return unsubscribe
}
