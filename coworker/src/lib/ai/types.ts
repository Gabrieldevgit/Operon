// ============================================================
// AI Provider Abstraction Layer — Types
// All agents call these interfaces. Never the SDKs directly.
// ============================================================

export type AIModelProvider = 'groq' | 'ollama'

export interface AIMessage {
  role:    'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  model?:        string
  maxTokens?:    number
  temperature?:  number
  systemPrompt?: string
}

export interface AICompletionResult {
  content:       string
  model:         string
  provider:      AIModelProvider
  inputTokens?:  number
  outputTokens?: number
  durationMs:    number
}

export interface AIStreamChunk {
  delta:     string
  done:      boolean
  model?:    string
  provider?: AIModelProvider
}

export interface AIProvider {
  id:           AIModelProvider
  name:         string
  models:       string[]
  defaultModel: string

  complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>

  stream(
    messages: AIMessage[],
    options?: AICompletionOptions,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult>

  isAvailable(): Promise<boolean>
}

export type TaskType =
  | 'orchestration'
  | 'coding'
  | 'ui-design'
  | 'review'
  | 'simple'
  | 'background'

export interface ModelRoute {
  taskType:  TaskType
  provider:  AIModelProvider
  modelId:   string
  reason:    string
  fallback?: { provider: AIModelProvider; modelId: string }
}

export interface StreamEvent {
  type:     'delta' | 'done' | 'error'
  delta?:   string
  model?:   string
  provider?: AIModelProvider
  error?:   string
  usage?: {
    inputTokens:  number
    outputTokens: number
    durationMs:   number
  }
}
