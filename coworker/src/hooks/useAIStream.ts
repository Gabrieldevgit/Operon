'use client'
// ============================================================
// useAIStream — React hook for streaming AI completions
// Connects to POST /api/ai/chat and streams the response.
// ============================================================
import { useState, useCallback, useRef } from 'react'
import type { AIMessage, AIModelProvider, TaskType, StreamEvent } from '@/lib/ai/types'

export interface UseAIStreamOptions {
  taskType?:    TaskType
  provider?:    AIModelProvider
  model?:       string
  maxTokens?:   number
  temperature?: number
  systemPrompt?: string
  onDone?:      (content: string) => void
  onError?:     (error: string) => void
}

export interface UseAIStreamState {
  content:    string
  streaming:  boolean
  error:      string | null
  provider?:  AIModelProvider
}

export function useAIStream(opts: UseAIStreamOptions = {}) {
  const [state, setState] = useState<UseAIStreamState>({
    content:   '',
    streaming: false,
    error:     null,
  })

  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (messages: AIMessage[]) => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ content: '', streaming: true, error: null })

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body:    JSON.stringify({
          messages,
          taskType:    opts.taskType,
          provider:    opts.provider,
          model:       opts.model,
          maxTokens:   opts.maxTokens,
          temperature: opts.temperature,
          systemPrompt: opts.systemPrompt,
        }),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   full    = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text  = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const jsonStr = line.slice(6) // strip "data: "
          try {
            const event = JSON.parse(jsonStr) as StreamEvent

            if (event.type === 'delta' && event.delta) {
              full += event.delta
              setState(prev => ({
                ...prev,
                content:  full,
                provider: event.provider,
              }))
            } else if (event.type === 'done') {
              setState(prev => ({
                ...prev,
                streaming: false,
                provider:  event.provider,
              }))
              opts.onDone?.(full)
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Stream error')
            }
          } catch {
            // malformed JSON line — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : String(err)
      setState(prev => ({ ...prev, streaming: false, error: msg }))
      opts.onError?.(msg)
    }
  }, [opts])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, streaming: false }))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ content: '', streaming: false, error: null })
  }, [])

  return { ...state, send, abort, reset }
}
