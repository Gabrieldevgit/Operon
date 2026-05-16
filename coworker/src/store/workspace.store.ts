import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Workspace, WorkspaceSettings, ChatMessage, FileNode } from '@/types'

const DEFAULT_SETTINGS: WorkspaceSettings = {
  autonomyLevel:       'assisted',
  reasoningVisibility: 'partial',
  proactiveMode:       'medium',
  memoryPersistence:   'project',
  approvalStrictness:  'high',
  showAISteps:         true,
  stepGranularity:     'standard',
  animationStyle:      'standard',
  layoutMode:          'balanced',
}

interface WorkspaceState {
  workspaces:        Record<string, Workspace>
  activeWorkspaceId: string | null
  messages:          Record<string, ChatMessage[]>  // workspaceId → messages

  // Actions
  createWorkspace:   (name: string, description?: string, ownerId?: string) => Workspace
  setActiveWorkspace:(id: string) => void
  updateSettings:    (workspaceId: string, patch: Partial<WorkspaceSettings>) => void
  setFileTree:       (workspaceId: string, tree: FileNode[]) => void
  addMessage:        (workspaceId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage
  clearMessages:     (workspaceId: string) => void
  getActiveWorkspace:() => Workspace | null
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set, get) => ({
    workspaces:        {},
    activeWorkspaceId: null,
    messages:          {},

    createWorkspace(name, description, ownerId = 'local') {
      const workspace: Workspace = {
        id:             nanoid(),
        name,
        description,
        ownerId,
        activeAgentIds: [],
        settings:       { ...DEFAULT_SETTINGS },
        createdAt:      Date.now(),
        updatedAt:      Date.now(),
      }
      set(state => {
        state.workspaces[workspace.id] = workspace
        if (!state.activeWorkspaceId) state.activeWorkspaceId = workspace.id
      })
      return workspace
    },

    setActiveWorkspace(id) {
      set(state => { state.activeWorkspaceId = id })
    },

    updateSettings(workspaceId, patch) {
      set(state => {
        const ws = state.workspaces[workspaceId]
        if (!ws) return
        ws.settings  = { ...ws.settings, ...patch }
        ws.updatedAt = Date.now()
      })
    },

    setFileTree(workspaceId, tree) {
      set(state => {
        const ws = state.workspaces[workspaceId]
        if (!ws) return
        ws.fileTree  = tree
        ws.updatedAt = Date.now()
      })
    },

    addMessage(workspaceId, message) {
      const full: ChatMessage = {
        ...message,
        id:        nanoid(),
        timestamp: Date.now(),
      }
      set(state => {
        if (!state.messages[workspaceId]) state.messages[workspaceId] = []
        state.messages[workspaceId].push(full)
      })
      return full
    },

    clearMessages(workspaceId) {
      set(state => { state.messages[workspaceId] = [] })
    },

    getActiveWorkspace() {
      const { workspaces, activeWorkspaceId } = get()
      return activeWorkspaceId ? workspaces[activeWorkspaceId] ?? null : null
    },
  }))
)
