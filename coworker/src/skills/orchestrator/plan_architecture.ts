// ============================================================
// Skill: plan_architecture
// Analyzes requirements and produces a file architecture,
// component tree, data flow, and route design.
// Assigned: Orchestrator, Dev Agent
// ============================================================
import { registerSkill, type Skill } from '../types'
import { memory_store_project_context } from '@/lib/memory/memory'

interface PlanArchitectureParams {
  requirements:      string
  existingCodebase?: boolean
  framework?:        string
}

const skill: Skill<PlanArchitectureParams> = {
  id:          'plan_architecture',
  name:        'Plan Architecture',
  description: 'Analyze requirements and propose project/file architecture, component tree, data flow, and route design.',
  agentRoles:  ['orchestrator', 'frontend-dev'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'thinking', 'Planning architecture…')

    const prompt = `You are producing a technical architecture plan for the following requirements:

${params.requirements}

${params.existingCodebase ? 'This builds on an existing Next.js 14 + TypeScript + Tailwind + Zustand codebase.' : ''}
${params.framework ? `Framework: ${params.framework}` : ''}

Produce a structured architecture plan covering:

1. **Folder structure** — list every new file/directory needed
2. **Component tree** — parent → children hierarchy
3. **Data flow** — where state lives, how it moves between components
4. **API routes** — any new Next.js route handlers needed
5. **Types** — new TypeScript interfaces required
6. **Implementation order** — which pieces to build first (dependencies first)

Be specific. Use the existing patterns: Zustand stores in src/store/, components in src/components/, hooks in src/hooks/, API routes in src/app/api/.`

    try {
      const plan = await agent['complete'](
        [...messages, { role: 'user' as const, content: prompt }],
        context
      )

      agent['completeStep'](context, stepId, true, 'Architecture plan complete')

      // Save to project context memory
      memory_store_project_context(
        context.workspaceId,
        `arch:${Date.now()}`,
        `Architecture plan for: ${params.requirements.slice(0, 100)}\n${plan.slice(0, 500)}`,
        ['architecture', 'plan']
      )

      return { success: true, output: plan, metadata: { requirements: params.requirements } }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(skill)
export { skill as planArchitectureSkill }
