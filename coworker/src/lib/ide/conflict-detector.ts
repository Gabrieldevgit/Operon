// ============================================================
// Conflict Detector — Phase 08, Task 7
// Multi-agent edit conflict detection + resolution system.
//
// When two agents try to edit the same file region simultaneously,
// the detector catches it, emits an event, and surfaces a
// ConflictResolver UI for the user to pick a winner or merge.
//
// Bug fix #4: UI component (ConflictResolver) has been moved to
// src/components/ide/ConflictResolver.tsx — a .ts file cannot
// contain JSX or 'use client' directives.
// ============================================================
import { useIDEStore } from '@/store/ide.store'
import { bus }         from '@/lib/events/bus'
import { nanoid }      from 'nanoid'

// ─── Conflict record ─────────────────────────────────────────

export type ConflictResolution = 'accept-a' | 'accept-b' | 'manual' | 'pending'

export interface EditConflict {
  id:          string
  path:        string
  agentA:      { id: string; name: string; content: string }
  agentB:      { id: string; name: string; content: string }
  base:        string
  resolution:  ConflictResolution
  timestamp:   number
}

// ─── In-memory conflict store ─────────────────────────────────

class ConflictRegistry {
  private conflicts: Map<string, EditConflict> = new Map()

  detect(
    path:      string,
    agentId:   string,
    agentName: string,
    proposed:  string
  ): EditConflict | null {
    const store = useIDEStore.getState()
    const lock  = store.locks[path]

    if (!lock || lock.agentId === agentId) return null

    const base     = store.activeFiles[path]?.content ?? ''
    const conflict: EditConflict = {
      id:         nanoid(),
      path,
      agentA:     { id: lock.agentId, name: lock.agentName, content: base },
      agentB:     { id: agentId, name: agentName, content: proposed },
      base,
      resolution: 'pending',
      timestamp:  Date.now(),
    }

    this.conflicts.set(conflict.id, conflict)

    bus.emit('step.emitted', {
      stepId:   conflict.id,
      category: 'result',
      agentId,
      title:    `Edit conflict on ${path} between ${lock.agentName} and ${agentName}`,
    })

    console.warn(`[ConflictDetector] Conflict on ${path}: ${lock.agentName} vs ${agentName}`)
    return conflict
  }

  resolve(
    conflictId: string,
    resolution: ConflictResolution,
    manualContent?: string
  ): string | null {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict || conflict.resolution !== 'pending') return null

    conflict.resolution = resolution

    const store = useIDEStore.getState()
    let winner: string

    switch (resolution) {
      case 'accept-a': winner = conflict.agentA.content; break
      case 'accept-b': winner = conflict.agentB.content; break
      case 'manual':   winner = manualContent ?? conflict.base; break
      default: return null
    }

    store.updateContent(conflict.path, winner)
    store.unlockFile(conflict.path, conflict.agentA.id)
    store.unlockFile(conflict.path, conflict.agentB.id)

    bus.emit('step.emitted', {
      stepId:   `resolved-${conflictId}`,
      category: 'result',
      agentId:  conflict.agentA.id,
      title:    `Conflict resolved (${resolution}) on ${conflict.path}`,
    })

    return winner
  }

  getPending(): EditConflict[] {
    return [...this.conflicts.values()].filter(c => c.resolution === 'pending')
  }

  getAll(): EditConflict[] {
    return [...this.conflicts.values()]
  }
}

export const conflictRegistry = new ConflictRegistry()

// Re-export ConflictResolver from its correct .tsx home
// so existing imports of this file still resolve.
export { ConflictResolver } from '@/components/ide/ConflictResolver'

// ─── Conflict record ─────────────────────────────────────────

export type ConflictResolution = 'accept-a' | 'accept-b' | 'manual' | 'pending'

export interface EditConflict {
  id:          string
  path:        string
  agentA:      { id: string; name: string; content: string }
  agentB:      { id: string; name: string; content: string }
  base:        string           // content before either agent touched it
  resolution:  ConflictResolution
  timestamp:   number
}

// ─── In-memory conflict store ─────────────────────────────────

class ConflictRegistry {
  private conflicts: Map<string, EditConflict> = new Map()

  // Detect overlap: called before any agent writes a file.
  // Returns a conflict if another agent already has the file locked.

  detect(
    path:      string,
    agentId:   string,
    agentName: string,
    proposed:  string
  ): EditConflict | null {
    const store = useIDEStore.getState()
    const lock  = store.locks[path]

    if (!lock || lock.agentId === agentId) return null   // no conflict

    // Another agent holds this file — create a conflict record
    const base    = store.activeFiles[path]?.content ?? ''
    const conflict: EditConflict = {
      id:         nanoid(),
      path,
      agentA:     { id: lock.agentId, name: lock.agentName, content: base },
      agentB:     { id: agentId, name: agentName, content: proposed },
      base,
      resolution: 'pending',
      timestamp:  Date.now(),
    }

    this.conflicts.set(conflict.id, conflict)

    // Notify via EventBus (steps panel + UI)
    bus.emit('step.emitted', {
      stepId:   conflict.id,
      category: 'result',
      agentId,
      title:    `Edit conflict on ${path} between ${lock.agentName} and ${agentName}`,
    })

    console.warn(`[ConflictDetector] Conflict on ${path}: ${lock.agentName} vs ${agentName}`)
    return conflict
  }

  resolve(
    conflictId: string,
    resolution: ConflictResolution,
    manualContent?: string
  ): string | null {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict || conflict.resolution !== 'pending') return null

    conflict.resolution = resolution

    const store   = useIDEStore.getState()
    let winner: string

    switch (resolution) {
      case 'accept-a': winner = conflict.agentA.content; break
      case 'accept-b': winner = conflict.agentB.content; break
      case 'manual':   winner = manualContent ?? conflict.base; break
      default:         return null
    }

    store.updateContent(conflict.path, winner)
    store.unlockFile(conflict.path, conflict.agentA.id)
    store.unlockFile(conflict.path, conflict.agentB.id)

    bus.emit('step.emitted', {
      stepId:   `resolved-${conflictId}`,
      category: 'result',
      agentId:  conflict.agentA.id,
      title:    `Conflict resolved (${resolution}) on ${conflict.path}`,
    })

    return winner
  }

  getPending(): EditConflict[] {
    return [...this.conflicts.values()].filter(c => c.resolution === 'pending')
  }

  getAll(): EditConflict[] {
    return [...this.conflicts.values()]
  }
}

export const conflictRegistry = new ConflictRegistry()

// ============================================================
// ConflictResolver — Phase 08, Task 7 (UI component)
// ============================================================

// Re-export ConflictResolver from its correct .tsx home
// so existing imports of this file still resolve.
export { ConflictResolver } from '@/components/ide/ConflictResolver'
