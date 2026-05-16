// ============================================================
// IDE Store — Phase 08, Task 1
// Shared project state: file tree, active files, and editor state
// visible to ALL agents and the UI simultaneously.
//
// This is the single source of truth for "what the project looks like
// right now". Agents read from this before making edits, and write
// through it after changes — no agent holds private file state.
// ============================================================
import { create }  from 'zustand'
import { immer }   from 'zustand/middleware/immer'
import { nanoid }  from 'nanoid'
import { bus }     from '@/lib/events/bus'

// ─── Types ───────────────────────────────────────────────────

export type FileNodeType = 'file' | 'directory'

export interface FileNode {
  id:       string
  name:     string
  path:     string          // relative to workspace root (e.g. src/components/Foo.tsx)
  type:     FileNodeType
  language: string          // 'tsx' | 'ts' | 'json' | '' (dirs have '')
  size?:    number          // bytes, optional
  children: string[]        // child node ids (directories only)
  parentId: string | null
}

export interface ActiveFile {
  path:      string
  content:   string
  language:  string
  isDirty:   boolean        // unsaved local edits
  lockedBy?: string         // agentId currently editing this file
  cursorLine?: number       // last known cursor position
}

export type PlanStatus = 'pending' | 'approved' | 'executing' | 'done' | 'rejected'

export interface ExecutionPlan {
  id:          string
  taskId:      string
  agentId:     string
  title:       string
  intent:      string
  strategy:    string
  steps:       PlanStep[]
  riskLevel:   'safe' | 'medium' | 'high' | 'critical'
  confidence:  number        // 0–100
  status:      PlanStatus
  createdAt:   number
  approvedAt?: number
}

export interface PlanStep {
  id:          string
  title:       string
  description: string
  toolId?:     string
  filePath?:   string
  status:      'pending' | 'active' | 'done' | 'failed' | 'skipped'
}

export interface FileLock {
  agentId:   string
  agentName: string
  path:      string
  since:     number
}

// ─── Store state ─────────────────────────────────────────────

interface IDEState {
  // Project tree
  nodes:        Record<string, FileNode>
  rootIds:      string[]

  // Active files (open in editor)
  activeFiles:  Record<string, ActiveFile>   // keyed by path
  focusedPath:  string | null

  // Plans (plan → approve → execute)
  plans:        Record<string, ExecutionPlan>
  planOrder:    string[]

  // File locks (which agent owns each file right now)
  locks:        Record<string, FileLock>     // keyed by path

  // Workspace root path (set once on load)
  workspaceRoot: string

  // Actions — tree
  setTree:       (nodes: FileNode[], rootIds: string[]) => void
  updateNode:    (id: string, patch: Partial<FileNode>) => void

  // Actions — active files
  openFile:      (path: string, content: string, language: string) => void
  closeFile:     (path: string) => void
  updateContent: (path: string, content: string) => void
  markClean:     (path: string) => void
  setFocus:      (path: string | null) => void

  // Actions — plans
  addPlan:       (plan: Omit<ExecutionPlan, 'id' | 'createdAt'>) => ExecutionPlan
  updatePlan:    (id: string, patch: Partial<ExecutionPlan>) => void
  approvePlan:   (id: string) => void
  rejectPlan:    (id: string) => void

  // Actions — locks
  lockFile:      (path: string, agentId: string, agentName: string) => void
  unlockFile:    (path: string, agentId: string) => void
  unlockAgent:   (agentId: string) => void

  // Selectors
  getNode:       (path: string) => FileNode | undefined
  getPendingPlans: () => ExecutionPlan[]
  getLockedPaths:  (agentId: string) => string[]
}

// ─── Store implementation ─────────────────────────────────────

export const useIDEStore = create<IDEState>()(
  immer((set, get) => ({
    nodes:         {},
    rootIds:       [],
    activeFiles:   {},
    focusedPath:   null,
    plans:         {},
    planOrder:     [],
    locks:         {},
    workspaceRoot: '',

    // ── Tree ─────────────────────────────────────────────────

    setTree(nodes, rootIds) {
      set(state => {
        state.nodes   = {}
        state.rootIds = rootIds
        nodes.forEach(n => { state.nodes[n.id] = n })
      })
    },

    updateNode(id, patch) {
      set(state => {
        const node = state.nodes[id]
        if (!node) return
        Object.assign(node, patch)
      })
    },

    // ── Active files ─────────────────────────────────────────

    openFile(path, content, language) {
      set(state => {
        if (!state.activeFiles[path]) {
          state.activeFiles[path] = { path, content, language, isDirty: false }
        }
        state.focusedPath = path
      })
    },

    closeFile(path) {
      set(state => {
        delete state.activeFiles[path]
        if (state.focusedPath === path) {
          const remaining = Object.keys(state.activeFiles)
          state.focusedPath = remaining[remaining.length - 1] ?? null
        }
      })
    },

    updateContent(path, content) {
      set(state => {
        const f = state.activeFiles[path]
        if (!f) return
        f.content = content
        f.isDirty = true
      })
    },

    markClean(path) {
      set(state => {
        const f = state.activeFiles[path]
        if (f) f.isDirty = false
      })
    },

    setFocus(path) {
      set(state => { state.focusedPath = path })
    },

    // ── Plans ────────────────────────────────────────────────

    addPlan(plan) {
      const full: ExecutionPlan = { ...plan, id: nanoid(), createdAt: Date.now() }
      set(state => {
        state.plans[full.id] = full
        state.planOrder.push(full.id)
        // Keep only last 50 plans
        if (state.planOrder.length > 50) {
          const removed = state.planOrder.splice(0, state.planOrder.length - 50)
          removed.forEach(id => delete state.plans[id])
        }
      })
      bus.emit('step.emitted', {
        stepId:   full.id,
        category: 'delegation',
        agentId:  full.agentId,
        title:    `Plan: ${full.title}`,
      })
      return full
    },

    updatePlan(id, patch) {
      set(state => {
        const plan = state.plans[id]
        if (!plan) return
        Object.assign(plan, patch)
      })
    },

    approvePlan(id) {
      set(state => {
        const plan = state.plans[id]
        if (!plan) return
        plan.status    = 'approved'
        plan.approvedAt = Date.now()
      })
      bus.emit('approval.resolved', { requestId: id, approved: true, agentId: get().plans[id]?.agentId ?? '' })
    },

    rejectPlan(id) {
      set(state => {
        const plan = state.plans[id]
        if (!plan) return
        plan.status = 'rejected'
      })
      bus.emit('approval.resolved', { requestId: id, approved: false, agentId: get().plans[id]?.agentId ?? '' })
    },

    // ── Locks ────────────────────────────────────────────────

    lockFile(path, agentId, agentName) {
      set(state => {
        state.locks[path] = { agentId, agentName, path, since: Date.now() }
      })
    },

    unlockFile(path, agentId) {
      set(state => {
        if (state.locks[path]?.agentId === agentId) {
          delete state.locks[path]
        }
      })
    },

    unlockAgent(agentId) {
      set(state => {
        for (const path of Object.keys(state.locks)) {
          if (state.locks[path].agentId === agentId) {
            delete state.locks[path]
          }
        }
      })
    },

    // ── Selectors ────────────────────────────────────────────

    getNode(path) {
      return Object.values(get().nodes).find(n => n.path === path)
    },

    getPendingPlans() {
      const { plans, planOrder } = get()
      return planOrder.map(id => plans[id]).filter(p => p?.status === 'pending') as ExecutionPlan[]
    },

    getLockedPaths(agentId) {
      return Object.values(get().locks)
        .filter(l => l.agentId === agentId)
        .map(l => l.path)
    },
  }))
)
