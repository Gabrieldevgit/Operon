'use client'
import { useState, useCallback, useRef } from 'react'
import { nanoid }            from 'nanoid'
import { useStepsStore }     from '@/store/steps.store'
import { useTasksStore }     from '@/store/tasks.store'
import { useAgentsStore }    from '@/store/agents.store'
import type { AgentStreamEvent } from '@/agents/events'
import type { AIMessage }        from '@/lib/ai/types'
import type { ChatMessage }      from '@/types'

interface UseAgentStreamOptions {
  workspaceId: string
  onMessage?:  (msg: ChatMessage) => void
  onError?:    (error: string) => void
}

interface AgentStreamState {
  draft:        string
  streaming:    boolean
  activeAgent?: { id: string; name: string; role: string }
  error:        string | null
}

type TempIdMap = Map<string, string>

export function useAgentStream({ workspaceId, onMessage, onError }: UseAgentStreamOptions) {
  const [state, setState] = useState<AgentStreamState>({
    draft: '', streaming: false, error: null,
  })

  const abortRef  = useRef<AbortController | null>(null)
  const tempIds   = useRef<TempIdMap>(new Map())

  const send = useCallback(async (messages: AIMessage[], _history: ChatMessage[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    tempIds.current.clear()

    setState({ draft: '', streaming: true, error: null })

    try {
      const res = await fetch('/api/agents/orchestrate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body:    JSON.stringify({ messages, workspaceId }),
      })

      if (!res.ok) throw new Error(`Agent API error: ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   full    = ''
      let   currentAgentId   = 'agent_orc'
      let   currentAgentName = 'Orion'
      let   currentAgentRole = 'orchestrator'

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          let event: AgentStreamEvent
          try { event = JSON.parse(line.slice(6)) as AgentStreamEvent }
          catch { continue }

          const stepsStore  = useStepsStore.getState()
          const tasksStore  = useTasksStore.getState()
          const agentsStore = useAgentsStore.getState()

          switch (event.type) {

            case 'delta':
              full += event.delta ?? ''
              setState(prev => ({ ...prev, draft: full }))
              break

            case 'agent_switch':
              currentAgentId   = event.agentId
              currentAgentName = event.agentName
              currentAgentRole = event.role
              setState(prev => ({
                ...prev,
                activeAgent: { id: event.agentId, name: event.agentName, role: event.role },
              }))
              agentsStore.setAgentStatus(event.agentId, 'working')
              break

            case 'thinking':
              // Wire thinking events to the steps store for ThinkingFeed
              stepsStore.addThinkingEvent(event.agentId, currentAgentName, event.text)
              agentsStore.setAgentStatus(event.agentId, 'thinking')
              break

            case 'step_start': {
              const step = stepsStore.emit({
                ...event.step,
                agentId:   event.step.agentId   ?? currentAgentId,
                agentName: event.step.agentName ?? currentAgentName,
                agentRole: event.step.agentRole ?? currentAgentRole,
                taskId:    event.step.taskId    ?? nanoid(),
              } as Parameters<typeof stepsStore.emit>[0])
              tempIds.current.set(event.tempId, step.id)
              break
            }

            case 'step_update': {
              const realId = tempIds.current.get(event.tempId)
              if (realId) stepsStore.updateStep(realId, event.patch)
              break
            }

            case 'task_created':
              tasksStore.createTask({
                ...event.task,
                status:   'active',
                priority: event.task.priority ?? 'medium',
                tags:     event.task.tags ?? [],
              })
              break

            case 'done':
              if (event.agentId) agentsStore.setAgentStatus(event.agentId, 'idle')
              // Clear thinking events for done agent
              if (event.agentId) stepsStore.clearThinking(event.agentId)

              if (full.trim()) {
                onMessage?.({
                  id: nanoid(), role: 'agent',
                  agentId:   currentAgentId,
                  agentName: currentAgentName,
                  content:   full, timestamp: Date.now(),
                })
              }
              full = ''
              setState({ draft: '', streaming: false, error: null, activeAgent: undefined })
              for (const id of ['agent_orc', 'agent_ui', 'agent_dev', 'agent_rev']) {
                agentsStore.setAgentStatus(id, 'idle')
              }
              break

            case 'error':
              onError?.(event.error)
              setState(prev => ({ ...prev, streaming: false, error: event.error }))
              break
          }
        }
      }

    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : String(err)
      setState(prev => ({ ...prev, streaming: false, error: msg }))
      onError?.(msg)
    }
  }, [workspaceId, onMessage, onError])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, streaming: false }))
    for (const id of ['agent_orc', 'agent_ui', 'agent_dev', 'agent_rev']) {
      useAgentsStore.getState().setAgentStatus(id, 'idle')
    }
  }, [])

  return { ...state, send, abort }
}
