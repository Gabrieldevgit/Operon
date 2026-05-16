import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { ApprovalRequest } from '@/types'

interface ApprovalsState {
  queue:       ApprovalRequest[]        // pending approvals
  history:     ApprovalRequest[]        // resolved approvals
  remembered:  Record<string, boolean>  // toolId+agentId → always allow/deny

  // Actions
  request:     (req: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>) => ApprovalRequest
  resolve:     (id: string, approved: boolean, remember?: boolean) => void
  getPending:  () => ApprovalRequest[]
  isRemembered:(toolId: string, agentId: string) => boolean | undefined
}

export const useApprovalsStore = create<ApprovalsState>()(
  immer((set, get) => ({
    queue:      [],
    history:    [],
    remembered: {},

    request(req) {
      const full: ApprovalRequest = {
        ...req,
        id:        nanoid(),
        status:    'pending',
        createdAt: Date.now(),
      }
      set(state => { state.queue.push(full) })
      return full
    },

    resolve(id, approved, remember = false) {
      set(state => {
        const idx = state.queue.findIndex(r => r.id === id)
        if (idx === -1) return
        const req = state.queue[idx]
        req.status     = approved ? 'approved' : 'denied'
        req.resolvedAt = Date.now()

        if (remember) {
          const key = `${req.toolId}:${req.agentId}`
          state.remembered[key] = approved
        }

        state.queue.splice(idx, 1)
        state.history.push(req)
      })
    },

    getPending() {
      return get().queue.filter(r => r.status === 'pending')
    },

    isRemembered(toolId, agentId) {
      const key = `${toolId}:${agentId}`
      const val = get().remembered[key]
      return val === undefined ? undefined : val
    },
  }))
)
