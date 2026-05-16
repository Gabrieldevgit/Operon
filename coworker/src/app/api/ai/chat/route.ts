// POST /api/ai/chat
// Accepts messages + options, streams back Server-Sent Events.
// The frontend useAIStream hook consumes this endpoint.

import { type NextRequest } from 'next/server'
import { getProvider, withFailover } from '@/lib/ai/registry'
import { getEffectiveRoute } from '@/lib/ai/router'
import type {
  AIMessage, AIModelProvider, TaskType, StreamEvent,
} from '@/lib/ai/types'

export const runtime = 'nodejs'

interface RequestBody {
  messages:    AIMessage[]
  taskType?:   TaskType
  provider?:   AIModelProvider
  model?:      string
  maxTokens?:  number
  temperature?: number
  systemPrompt?: string
}

function encode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const {
    messages,
    taskType  = 'simple',
    provider: forceProvider,
    model:    forceModel,
    maxTokens,
    temperature,
    systemPrompt,
  } = body

  if (!messages?.length) {
    return new Response('messages is required', { status: 400 })
  }

  // Resolve provider + model
  const route      = getEffectiveRoute(taskType)
  const providerId: AIModelProvider = forceProvider ?? route.provider
  const modelId    = forceModel ?? route.modelId
  const fallbackId: AIModelProvider = providerId === 'groq' ? 'ollama' : 'groq'

  // Build a readable stream of SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(new TextEncoder().encode(encode(event)))
      }

      try {
        await withFailover(
          providerId,
          fallbackId,
          async (provider) => {
            await provider.stream(
              messages,
              { model: modelId, maxTokens, temperature, systemPrompt },
              (chunk) => {
                if (chunk.done) {
                  send({ type: 'done', model: chunk.model, provider: chunk.provider })
                } else {
                  send({ type: 'delta', delta: chunk.delta, provider: chunk.provider })
                }
              }
            )
          },
          (reason) => {
            // Log fallback but keep streaming
            console.warn('[AI Route] Failover:', reason)
          }
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        send({ type: 'error', error: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
