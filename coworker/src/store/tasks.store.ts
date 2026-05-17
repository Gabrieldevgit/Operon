import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Task, TaskStatus, ChecklistItem, ChecklistItemStatus } from '@/types'

interface TasksState {
  tasks: Record<string, Task>

  // Actions
  createTask:         (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task
  updateTask:         (taskId: string, patch: Partial<Task>) => void
  setTaskStatus:      (taskId: string, status: TaskStatus) => void
  setChecklistItem:   (taskId: string, itemId: string, status: ChecklistItemStatus, note?: string) => void
  addChecklistItem:   (taskId: string, item: Omit<ChecklistItem, 'id'>) => void
  getTasksByAgent:    (agentId: string) => Task[]
  getTasksByWorkspace:(workspaceId: string) => Task[]
  getActiveTasks:     () => Task[]
}

export const useTasksStore = create<TasksState>()(
  immer((set, get) => ({
    tasks: {},

    createTask(task) {
      const full: Task = {
        ...task,
        id:        nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      set(state => { state.tasks[full.id] = full })
      return full
    },

    updateTask(taskId, patch) {
      set(state => {
        const task = state.tasks[taskId]
        if (!task) return
        Object.assign(task, patch)
        task.updatedAt = Date.now()
      })
    },

    setTaskStatus(taskId, status) {
      set(state => {
        const task = state.tasks[taskId]
        if (!task) return
        task.status    = status
        task.updatedAt = Date.now()
        if (status === 'completed') task.completedAt = Date.now()
      })
    },

    setChecklistItem(taskId, itemId, status, note) {
      set(state => {
        const task = state.tasks[taskId]
        if (!task) return
        const item = task.checklist.find(i => i.id === itemId)
        if (!item) return
        item.status = status
        if (status === 'completed') item.completedAt = Date.now()
        if (note) item.note = note
        task.updatedAt = Date.now()
      })
    },

    addChecklistItem(taskId, item) {
      set(state => {
        const task = state.tasks[taskId]
        if (!task) return
        task.checklist.push({ ...item, id: nanoid() })
        task.updatedAt = Date.now()
      })
    },

    getTasksByAgent(agentId) {
      return Object.values(get().tasks).filter(t => t.assignedAgentId === agentId)
    },

    getTasksByWorkspace(workspaceId) {
      return Object.values(get().tasks).filter(t => t.workspaceId === workspaceId)
    },

    getActiveTasks() {
      return Object.values(get().tasks).filter(t => t.status === 'executing')
    },
  }))
)
