import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Agent, AgentStatus, AgentMessage } from '@/types'

interface AgentsState {
  agents:   Record<string, Agent>
  messages: AgentMessage[]

  // Actions
  registerAgent:   (agent: Agent) => void
  setAgentStatus:  (agentId: string, status: AgentStatus, taskId?: string) => void
  updateAgent:     (agentId: string, patch: Partial<Agent>) => void
  sendMessage:     (message: Omit<AgentMessage, 'id' | 'timestamp'>) => AgentMessage
  getAgent:        (agentId: string) => Agent | undefined
  getAgentsByRole: (role: Agent['role']) => Agent[]
  getOrchestrator: () => Agent | undefined
}

export const useAgentsStore = create<AgentsState>()(
  immer((set, get) => ({
    agents:   {},
    messages: [],

    registerAgent(agent) {
      set(state => { state.agents[agent.id] = agent })
    },

    setAgentStatus(agentId, status, taskId) {
      set(state => {
        const agent = state.agents[agentId]
        if (!agent) return
        agent.status      = status
        agent.updatedAt   = Date.now()
        if (taskId !== undefined) agent.currentTaskId = taskId
      })
    },

    updateAgent(agentId, patch) {
      set(state => {
        const agent = state.agents[agentId]
        if (!agent) return
        Object.assign(agent, patch)
        agent.updatedAt = Date.now()
      })
    },

    sendMessage(message) {
      const full: AgentMessage = {
        ...message,
        id:        crypto.randomUUID(),
        timestamp: Date.now(),
      }
      set(state => { state.messages.push(full) })
      return full
    },

    getAgent(agentId) {
      return get().agents[agentId]
    },

    getAgentsByRole(role) {
      return Object.values(get().agents).filter(a => a.role === role)
    },

    getOrchestrator() {
      return Object.values(get().agents).find(a => a.role === 'orchestrator')
    },
  }))
)
