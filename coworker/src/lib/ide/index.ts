// ============================================================
// Phase 08 — IDE-like Features & Diff System
// Central export index
// ============================================================

// Store
export * from '@/store/ide.store'

// Components
export { DiffViewer, parseDiff, buildDiff }  from '@/components/ide/DiffViewer'
export type { FileDiff, DiffHunk, DiffLine } from '@/components/ide/DiffViewer'

export { PlanCard, ThinkingLayer }           from '@/components/ide/PlanCard'
export type { ThinkingSnapshot }             from '@/components/ide/PlanCard'

export { ProjectTree }                       from '@/components/ide/ProjectTree'

// Lib
export { planExecutor, PlanExecutor }        from '@/lib/ide/plan-executor'
export type { PlanRequest }                  from '@/lib/ide/plan-executor'

export { sandbox, ExecutionSandbox }         from '@/lib/ide/sandbox'

export { conflictRegistry }                  from '@/lib/ide/conflict-detector'
export type { EditConflict, ConflictResolution } from '@/lib/ide/conflict-detector'

export { syncEngine, SyncEngine, useSyncStatus, SyncStatusDot } from '@/lib/ide/sync-engine'
export type { SyncState, SyncAdapter }       from '@/lib/ide/sync-engine'
