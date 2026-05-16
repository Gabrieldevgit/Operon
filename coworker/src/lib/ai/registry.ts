// ============================================================
// AI Provider Registry + Failover
// Single source of truth for provider instances.
// Agents never instantiate providers directly.
// ============================================================
import { GroqProvider }   from './groq'
import { OllamaProvider } from './ollama'
import type { AIProvider, AIModelProvider } from './types'

// ─── Provider singletons ──────────────────────────────────────
let _groq:   GroqProvider   | null = null
let _ollama: OllamaProvider | null = null

export function getProvider(id: AIModelProvider): AIProvider {
  switch (id) {
    case 'groq':
      if (!_groq) _groq = new GroqProvider()
      return _groq
    case 'ollama':
      if (!_ollama) _ollama = new OllamaProvider()
      return _ollama
    default:
      throw new Error(`Unknown provider: ${id}`)
  }
}

export function getAllProviders(): AIProvider[] {
  return [getProvider('groq'), getProvider('ollama')]
}

// ─── Availability cache (checked once per session) ────────────
const _availability = new Map<AIModelProvider, boolean>()
const _checked      = new Set<AIModelProvider>()

export async function checkAvailability(
  id: AIModelProvider
): Promise<boolean> {
  if (_checked.has(id)) return _availability.get(id) ?? false
  const available = await getProvider(id).isAvailable()
  _availability.set(id, available)
  _checked.add(id)
  return available
}

export async function checkAllProviders(): Promise<
  Record<AIModelProvider, boolean>
> {
  const [groqOk, ollamaOk] = await Promise.all([
    checkAvailability('groq'),
    checkAvailability('ollama'),
  ])
  return { groq: groqOk, ollama: ollamaOk }
}

// ─── Failover: try primary, fall back on error ────────────────
export async function withFailover<T>(
  primaryId:  AIModelProvider,
  fallbackId: AIModelProvider,
  fn: (provider: AIProvider) => Promise<T>,
  onFallback?: (reason: string) => void
): Promise<T> {
  try {
    const primary = getProvider(primaryId)
    return await fn(primary)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    onFallback?.(`Primary ${primaryId} failed (${reason}), falling back to ${fallbackId}`)

    const fallback = getProvider(fallbackId)
    return await fn(fallback)
  }
}
