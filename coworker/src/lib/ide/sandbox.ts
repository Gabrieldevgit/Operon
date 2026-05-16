// ============================================================
// Sandbox — Phase 08, Task 6
// Safe execution sandbox: dry-run mode + rollback support.
//
// Every file-mutating operation goes through here.
// In dry-run mode, changes are recorded but never applied.
// A rollback journal lets any change be undone instantly.
// ============================================================
import { useIDEStore } from '@/store/ide.store'
import { bus }         from '@/lib/events/bus'

// ─── Rollback journal entry ───────────────────────────────────

interface JournalEntry {
  id:          string
  timestamp:   number
  path:        string
  prevContent: string       // content before the change
  nextContent: string       // content after the change
  agentId:     string
  planId?:     string
  rolledBack:  boolean
}

// ─── Sandbox class ───────────────────────────────────────────

export class ExecutionSandbox {
  private journal:   JournalEntry[] = []
  private dryRun:    boolean        = false
  private maxJournal = 100

  // ── Mode control ─────────────────────────────────────────

  enableDryRun()  { this.dryRun = true  }
  disableDryRun() { this.dryRun = false }
  isDryRun()      { return this.dryRun  }

  // ── File write (sandboxed) ───────────────────────────────
  // Returns the diff that would be (or was) applied.

  async writeFile(
    path:       string,
    nextContent: string,
    agentId:    string,
    planId?:    string
  ): Promise<{ applied: boolean; prevContent: string }> {
    const store = useIDEStore.getState()
    const prevContent = store.activeFiles[path]?.content ?? ''

    if (this.dryRun) {
      // Dry run: record intent but do not apply
      console.log(`[Sandbox DRY-RUN] Would write ${path} (${nextContent.length} chars)`)
      return { applied: false, prevContent }
    }

    // Record in journal BEFORE applying
    const entry: JournalEntry = {
      id:          `j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp:   Date.now(),
      path,
      prevContent,
      nextContent,
      agentId,
      planId,
      rolledBack:  false,
    }

    this.journal.push(entry)
    if (this.journal.length > this.maxJournal) this.journal.shift()

    // Apply change to IDE store
    store.updateContent(path, nextContent)

    bus.emit('step.emitted', {
      stepId:   entry.id,
      category: 'file-write',
      agentId,
      title:    `Wrote ${path}`,
    })

    return { applied: true, prevContent }
  }

  // ── Rollback a specific journal entry ────────────────────

  rollback(entryId: string): boolean {
    const entry = this.journal.find(e => e.id === entryId)
    if (!entry || entry.rolledBack) return false

    useIDEStore.getState().updateContent(entry.path, entry.prevContent)
    entry.rolledBack = true

    bus.emit('step.emitted', {
      stepId:   `rollback-${entry.id}`,
      category: 'result',
      agentId:  entry.agentId,
      title:    `Rolled back ${entry.path}`,
    })

    return true
  }

  // ── Rollback all changes from a plan ─────────────────────

  rollbackPlan(planId: string): number {
    const entries = this.journal
      .filter(e => e.planId === planId && !e.rolledBack)
      .reverse()   // undo in reverse order

    for (const e of entries) this.rollback(e.id)
    return entries.length
  }

  // ── Rollback last N changes by an agent ─────────────────

  rollbackAgent(agentId: string, count = 1): number {
    const entries = this.journal
      .filter(e => e.agentId === agentId && !e.rolledBack)
      .slice(-count)
      .reverse()

    for (const e of entries) this.rollback(e.id)
    return entries.length
  }

  // ── Preview: what a write would produce ─────────────────

  previewWrite(path: string, nextContent: string): {
    prevContent: string
    addedLines:  number
    removedLines: number
  } {
    const store       = useIDEStore.getState()
    const prevContent = store.activeFiles[path]?.content ?? ''
    const prevLines   = prevContent.split('\n')
    const nextLines   = nextContent.split('\n')

    let added = 0, removed = 0
    const maxLen = Math.max(prevLines.length, nextLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (prevLines[i] !== nextLines[i]) {
        if (prevLines[i] !== undefined) removed++
        if (nextLines[i] !== undefined) added++
      }
    }

    return { prevContent, addedLines: added, removedLines: removed }
  }

  // ── Journal access ───────────────────────────────────────

  getJournal(agentId?: string): JournalEntry[] {
    return agentId
      ? this.journal.filter(e => e.agentId === agentId)
      : [...this.journal]
  }

  getEntry(entryId: string): JournalEntry | undefined {
    return this.journal.find(e => e.id === entryId)
  }

  clearJournal() { this.journal = [] }
}

// ─── Singleton export ─────────────────────────────────────────

export const sandbox = new ExecutionSandbox()
