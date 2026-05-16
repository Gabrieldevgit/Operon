// ============================================================
// Model Router
// Maps task types to the optimal provider + model combo.
// Agents call getRouteForTask() instead of hardcoding models.
// ============================================================
import type { TaskType, ModelRoute, AIModelProvider } from './types'

// ─── Route table ──────────────────────────────────────────────
const ROUTES: ModelRoute[] = [
  {
    taskType: 'orchestration',
    provider: 'groq',
    modelId:  'llama3-70b-8192',
    reason:   'Best reasoning for planning and task breakdown',
    fallback: { provider: 'ollama', modelId: 'llama3' },
  },
  {
    taskType: 'coding',
    provider: 'groq',
    modelId:  'llama3-70b-8192',
    reason:   'Strong code generation and architecture',
    fallback: { provider: 'ollama', modelId: 'codellama' },
  },
  {
    taskType: 'ui-design',
    provider: 'groq',
    modelId:  'mixtral-8x7b-32768',
    reason:   'Long context for design systems and component trees',
    fallback: { provider: 'ollama', modelId: 'llama3' },
  },
  {
    taskType: 'review',
    provider: 'groq',
    modelId:  'mixtral-8x7b-32768',
    reason:   'Analytical reasoning across large code surfaces',
    fallback: { provider: 'ollama', modelId: 'mistral' },
  },
  {
    taskType: 'simple',
    provider: 'groq',
    modelId:  'llama3-8b-8192',
    reason:   'Fast and cheap for short, simple tasks',
    fallback: { provider: 'ollama', modelId: 'phi3' },
  },
  {
    taskType: 'background',
    provider: 'ollama',
    modelId:  'llama3',
    reason:   'Local model for background / scheduled work',
    fallback: { provider: 'groq', modelId: 'llama3-8b-8192' },
  },
]

// ─── Role → task type mapping ─────────────────────────────────
const ROLE_TASK_MAP: Record<string, TaskType> = {
  orchestrator:   'orchestration',
  'ui-designer':  'ui-design',
  'frontend-dev': 'coding',
  reviewer:       'review',
}

// ─── Public API ───────────────────────────────────────────────

export function getRouteForTask(taskType: TaskType): ModelRoute {
  return ROUTES.find(r => r.taskType === taskType) ?? ROUTES[0]!
}

export function getRouteForRole(role: string): ModelRoute {
  const taskType = ROLE_TASK_MAP[role] ?? 'simple'
  return getRouteForTask(taskType)
}

export function getAllRoutes(): ModelRoute[] {
  return [...ROUTES]
}

// Override a specific route at runtime (e.g. from Settings)
const overrides = new Map<TaskType, Partial<ModelRoute>>()

export function overrideRoute(
  taskType: TaskType,
  patch: Partial<Pick<ModelRoute, 'provider' | 'modelId'>>
) {
  overrides.set(taskType, patch)
}

export function getEffectiveRoute(taskType: TaskType): ModelRoute {
  const base     = getRouteForTask(taskType)
  const override = overrides.get(taskType)
  if (!override) return base
  return {
    ...base,
    provider: override.provider ?? base.provider,
    modelId:  override.modelId  ?? base.modelId,
    reason:   `[overridden] ${base.reason}`,
  }
}
