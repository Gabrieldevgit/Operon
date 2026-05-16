// ============================================================
// Skill Types + Registry
// Skills are parameterized agent behaviors that orchestrate
// tool calls and AI reasoning into reusable capabilities.
// ============================================================
import type { AIMessage }        from '@/lib/ai/types'
import type { AgentRunContext }  from '@/agents/events'
import type { BaseAgent }        from '@/agents/base'
import type { AgentRole }        from '@/types'

export interface SkillInput<T = Record<string, unknown>> {
  params:   T
  context:  AgentRunContext
  agent:    BaseAgent
  messages: AIMessage[]
}

export interface SkillResult {
  success:   boolean
  output:    string
  metadata?: Record<string, unknown>
  error?:    string
}

export interface Skill<T = Record<string, unknown>> {
  id:          string
  name:        string
  description: string
  agentRoles:  AgentRole[]
  risk:        'safe' | 'medium' | 'high'
  execute:     (input: SkillInput<T>) => Promise<SkillResult>
}

// ─── Registry ─────────────────────────────────────────────────

const _registry = new Map<string, Skill>()

export function registerSkill(skill: Skill): void {
  _registry.set(skill.id, skill)
}

export function getSkill(id: string): Skill | undefined {
  return _registry.get(id)
}

export function getAllSkills(): Skill[] {
  return Array.from(_registry.values())
}

export function getSkillsForRole(role: AgentRole): Skill[] {
  return getAllSkills().filter(s => s.agentRoles.includes(role))
}

// Execute a skill by ID — used by agents
export async function executeSkill<T = Record<string, unknown>>(
  skillId: string,
  input:   SkillInput<T>
): Promise<SkillResult> {
  const skill = _registry.get(skillId) as Skill<T> | undefined
  if (!skill) {
    return { success: false, output: '', error: `Skill not found: ${skillId}` }
  }
  try {
    return await skill.execute(input)
  } catch (err) {
    return { success: false, output: '', error: err instanceof Error ? err.message : String(err) }
  }
}
