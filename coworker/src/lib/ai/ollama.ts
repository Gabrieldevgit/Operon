// ============================================================
// Ollama Provider Adapter
// Talks to a local Ollama server (default http://localhost:11434).
// No SDK needed — plain fetch + NDJSON streaming.
// ============================================================
import type {
  AIProvider, AIMessage, AICompletionOptions,
  AICompletionResult, AIStreamChunk,
} from './types'

const DEFAULT_BASE_URL = 'http://localhost:11434'

const OLLAMA_MODELS = [
  'llama3',
  'llama3:8b',
  'llama3:70b',
  'mistral',
  'codellama',
  'deepseek-coder',
  'phi3',
]

interface OllamaStreamChunk {
  model:   string
  message: { role: string; content: string }
  done:    boolean
}

export class OllamaProvider implements AIProvider {
  readonly id      = 'ollama' as const
  readonly name    = 'Ollama (Local)'
  readonly models  = OLLAMA_MODELS
  readonly defaultModel = 'llama3'

  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl
      ?? process.env.NEXT_PUBLIC_OLLAMA_BASE_URL
      ?? DEFAULT_BASE_URL
  }

  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const start = Date.now()
    const model = options.model ?? this.defaultModel
    const msgs  = this.buildMessages(messages, options.systemPrompt)

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: msgs, stream: false }),
    })

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json() as OllamaStreamChunk
    return {
      content:   data.message.content,
      model,
      provider:  'ollama',
      durationMs: Date.now() - start,
    }
  }

  async stream(
    messages: AIMessage[],
    options: AICompletionOptions = {},
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult> {
    const start = Date.now()
    const model = options.model ?? this.defaultModel
    const msgs  = this.buildMessages(messages, options.systemPrompt)
    let   full  = ''

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: msgs, stream: true }),
    })

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    if (!res.body) throw new Error('Ollama: no response body')

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      // Ollama streams newline-delimited JSON
      const lines = decoder.decode(value).split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as OllamaStreamChunk
          const delta  = parsed.message?.content ?? ''

          if (delta) {
            full += delta
            onChunk?.({ delta, done: false, model, provider: 'ollama' })
          }

          if (parsed.done) {
            onChunk?.({ delta: '', done: true, model, provider: 'ollama' })
          }
        } catch {
          // incomplete JSON line — skip
        }
      }
    }

    return {
      content:   full,
      model,
      provider:  'ollama',
      durationMs: Date.now() - start,
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  // List models currently pulled in Ollama
  async listLocalModels(): Promise<string[]> {
    try {
      const res  = await fetch(`${this.baseUrl}/api/tags`)
      const data = await res.json() as { models: Array<{ name: string }> }
      return data.models.map(m => m.name)
    } catch {
      return []
    }
  }

  private buildMessages(
    messages: AIMessage[],
    systemPrompt?: string
  ): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = []
    if (systemPrompt) result.push({ role: 'system', content: systemPrompt })
    result.push(...messages)
    return result
  }
}
