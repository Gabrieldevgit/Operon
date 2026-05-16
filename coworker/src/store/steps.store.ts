import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { AIStep, StepStatus, AgentThinkingPreview } from '@/types'
import { bus } from '@/lib/events/bus'

export type StepGranularity = 'summary' | 'standard' | 'verbose'

// Which step categories show at each granularity level
const GRANULARITY_VISIBLE: Record<StepGranularity, string[]> = {
  summary:  ['delegation', 'result', 'approval'],
  standard: ['thinking', 'tool-use', 'file-read', 'file-write', 'delegation', 'memory-read', 'result', 'approval', 'communication'],
  verbose:  ['thinking', 'tool-use', 'file-read', 'file-write', 'delegation', 'memory-read', 'memory-write', 'result', 'approval', 'communication'],
}

const MAX_STEPS = 500

interface ThinkingEvent {
  agentId:   string
  agentName: string
  text:      string
  timestamp: number
}

interface ReplayState {
  active:   boolean
  position: number   // index into stepOrder
  playing:  boolean
  speedMs:  number   // ms between replay ticks (default 600)
}

interface StepsState {
  steps:           Record<string, AIStep>
  stepOrder:       string[]
  thinkingPreview: Record<string, AgentThinkingPreview>
  thinkingEvents:  ThinkingEvent[]
  granularity:     StepGranularity
  replay:          ReplayState

  // Actions
  emit:              (step: Omit<AIStep, 'id' | 'timestamp'>) => AIStep
  updateStep:        (stepId: string, patch: Partial<AIStep>) => void
  setThinking:       (preview: AgentThinkingPreview) => void
  clearThinking:     (agentId: string) => void
  addThinkingEvent:  (agentId: string, agentName: string, text: string) => void
  setGranularity:    (g: StepGranularity) => void
  setReplay:         (patch: Partial<ReplayState>) => void
  getVisibleSteps:   () => AIStep[]
  getStepsForTask:   (taskId: string) => AIStep[]
  getStepsForAgent:  (agentId: string, limit?: number) => AIStep[]
  clearAll:          () => void
}

export const useStepsStore = create<StepsState>()(
  immer((set, get) => ({
    steps:           {},
    stepOrder:       [],
    thinkingPreview: {},
    thinkingEvents:  [],
    granularity:     'standard',
    replay:          { active: false, position: 0, playing: false, speedMs: 600 },

    emit(step) {
      const full: AIStep = { ...step, id: nanoid(), timestamp: Date.now() }
      set(state => {
        state.steps[full.id] = full
        state.stepOrder.push(full.id)
        if (state.stepOrder.length > MAX_STEPS) {
          const removed = state.stepOrder.splice(0, state.stepOrder.length - MAX_STEPS)
          removed.forEach(id => delete state.steps[id])
        }
      })
      // Notify event bus — decouples UI listeners from store internals
      bus.emit('step.emitted', {
        stepId:   full.id,
        category: full.category,
        agentId:  full.agentId,
        title:    full.title,
      })
      return full
    },

    updateStep(stepId, patch) {
      set(state => {
        const step = state.steps[stepId]
        if (!step) return
        Object.assign(step, patch)
        if (patch.status === 'completed' || patch.status === 'failed') {
          step.durationMs = Date.now() - step.timestamp
        }
      })
      // Emit completion / failure events for downstream listeners
      if (patch.status === 'completed') {
        const durationMs = get().steps[stepId]?.durationMs
        bus.emit('step.completed', { stepId, durationMs })
      } else if (patch.status === 'failed') {
        bus.emit('step.failed', { stepId, error: (patch as { error?: string }).error ?? 'Unknown error' })
      }
    },

    setThinking(preview) {
      set(state => { state.thinkingPreview[preview.agentId] = preview })
    },

    clearThinking(agentId) {
      set(state => { delete state.thinkingPreview[agentId] })
    },

    addThinkingEvent(agentId, agentName, text) {
      set(state => {
        state.thinkingEvents.push({ agentId, agentName, text, timestamp: Date.now() })
        if (state.thinkingEvents.length > 100) state.thinkingEvents.shift()
      })
    },

    setGranularity(g) {
      set(state => { state.granularity = g })
    },

    setReplay(patch) {
      set(state => { Object.assign(state.replay, patch) })
    },

    getVisibleSteps() {
      const { steps, stepOrder, granularity } = get()
      const allowed = GRANULARITY_VISIBLE[granularity]
      return stepOrder
        .map(id => steps[id])
        .filter((s): s is AIStep => !!s && allowed.includes(s.category))
    },

    getStepsForTask(taskId) {
      const { steps, stepOrder } = get()
      return stepOrder.map(id => steps[id]).filter((s): s is AIStep => !!s && s.taskId === taskId)
    },

    getStepsForAgent(agentId, limit = 50) {
      const { steps, stepOrder } = get()
      return stepOrder
        .map(id => steps[id])
        .filter((s): s is AIStep => !!s && s.agentId === agentId)
        .slice(-limit)
    },

    clearAll() {
      set(state => {
        state.steps           = {}
        state.stepOrder       = []
        state.thinkingPreview = {}
        state.thinkingEvents  = []
        state.replay          = { active: false, position: 0, playing: false, speedMs: 600 }
      })
    },
  }))
)
