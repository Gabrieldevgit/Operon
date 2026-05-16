// POST /api/agents/orchestrate
// Main entry point for all user messages.
// Runs the Orchestrator, which may spawn worker agents.
// Returns multiplexed SSE: text deltas + step events + task events.

import { type NextRequest } from 'next/server'
import { nanoid }           from 'nanoid'
import { getOrchestrator }  from '@/agents/index'
import { encodeEvent }      from '@/agents/events'
import type { AIMessage }   from '@/lib/ai/types'
import type { AgentStreamEvent, AgentRunContext } from '@/agents/events'

export const runtime = 'nodejs'
export const maxDuration = 120  // 2 min max for complex orchestration

interface RequestBody {
  messages:    AIMessage[]
  workspaceId: string
  userId?:     string
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const { messages, workspaceId, userId = 'local' } = body

  if (!messages?.length) {
    return new Response('messages is required', { status: 400 })
  }

  const sessionId = nanoid()
  const taskId    = nanoid()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentStreamEvent) => {
        try {
          controller.enqueue(new TextEncoder().encode(encodeEvent(event)))
        } catch {
          // controller may be closed if client disconnected
        }
      }

      const ctx: AgentRunContext = {
        workspaceId,
        sessionId,
        userId,
        taskId,
        send,
      }

      try {
        const orchestrator = getOrchestrator()
        await orchestrator.process(messages, ctx)
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        console.error('[Orchestrate] Error:', error)
        send({ type: 'error', error })
      } finally {
        try { controller.close() } catch { /* already closed */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
