// ============================================================
// Groq Provider Adapter
// Uses groq-sdk@0.5.0 — cloud inference, ultra-fast.
// ============================================================
import Groq from 'groq-sdk'
import type {
  AIProvider, AIMessage, AICompletionOptions,
  AICompletionResult, AIStreamChunk,
} from './types'

const GROQ_MODELS = [
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]

export class GroqProvider implements AIProvider {
  readonly id      = 'groq' as const
  readonly name    = 'Groq'
  readonly models  = GROQ_MODELS
  readonly defaultModel = 'llama3-70b-8192'

  private client: Groq

  constructor(apiKey?: string) {
    this.client = new Groq({
      apiKey: apiKey ?? process.env.GROQ_API_KEY ?? '',
    })
  }

  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const start = Date.now()
    const model = options.model ?? this.defaultModel

    const msgs = this.buildMessages(messages, options.systemPrompt)

    const res = await this.client.chat.completions.create({
      model,
      messages: msgs,
      max_tokens:  options.maxTokens  ?? 2048,
      temperature: options.temperature ?? 0.7,
      stream: false,
    })

    return {
      content:      res.choices[0]?.message?.content ?? '',
      model,
      provider:     'groq',
      inputTokens:  res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
      durationMs:   Date.now() - start,
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

    const streamRes = await this.client.chat.completions.create({
      model,
      messages: msgs,
      max_tokens:  options.maxTokens  ?? 2048,
      temperature: options.temperature ?? 0.7,
      stream: true,
    })

    for await (const chunk of streamRes) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        full += delta
        onChunk?.({ delta, done: false, model, provider: 'groq' })
      }
    }

    onChunk?.({ delta: '', done: true, model, provider: 'groq' })

    return {
      content:   full,
      model,
      provider:  'groq',
      durationMs: Date.now() - start,
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      })
      return true
    } catch {
      return false
    }
  }

  private buildMessages(
    messages: AIMessage[],
    systemPrompt?: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
    if (systemPrompt) result.push({ role: 'system', content: systemPrompt })
    result.push(...messages)
    return result
  }
}
