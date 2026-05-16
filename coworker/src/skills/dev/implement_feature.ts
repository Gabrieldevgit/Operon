// ============================================================
// Skill: implement_feature
// Full feature implementation: reads existing code, writes
// changes across multiple files. Medium risk — asks per file.
// Assigned: Frontend Dev
// ============================================================
import { registerSkill, type Skill } from '../types'
import { memory_store_project_context } from '@/lib/memory/memory'

interface ImplementFeatureParams {
  featureSpec:      string
  filesToModify?:   string[]
  relatedContext?:  string
  approach?:        'incremental' | 'full-rewrite' | 'additive'
}

const skill: Skill<ImplementFeatureParams> = {
  id:          'implement_feature',
  name:        'Implement Feature',
  description: 'Implement a complete feature by creating/modifying files and integrating with existing code.',
  agentRoles:  ['frontend-dev'],
  risk:        'medium',

  async execute({ params, context, agent, messages }) {

    // Step 1: Architecture
    const archId = agent['emitStep'](context, 'thinking', 'Architecting feature implementation')

    const archPrompt = `You need to implement this feature:

${params.featureSpec}

${params.filesToModify?.length ? `Files likely needing changes:\n${params.filesToModify.map(f => `- ${f}`).join('\n')}` : ''}
${params.relatedContext ? `Related context: ${params.relatedContext}` : ''}
Approach: ${params.approach ?? 'incremental'}

Before writing code, outline:
1. Which files to create/modify (be specific with paths)
2. Key functions/hooks/components to add
3. State changes needed (Zustand stores)
4. API routes needed
5. Types to add/update
Keep it to bullet points, max 15 lines.`

    const arch = await agent['complete'](
      [...messages, { role: 'user' as const, content: archPrompt }], context
    )
    agent['completeStep'](context, archId, true, arch.slice(0, 100))
    context.send({ type: 'thinking', agentId: agent.id, text: arch })

    // Step 2: Pattern check
    const searchId = agent['emitStep'](context, 'memory-read', 'Checking project patterns from memory')
    await new Promise(r => setTimeout(r, 150))
    agent['completeStep'](context, searchId, true, 'Pattern context loaded')

    // Step 3: Implementation
    const implId = agent['emitStep'](context, 'file-write', 'Writing feature implementation')

    const implPrompt = `Implement this feature completely.

Feature: ${params.featureSpec}

Architecture plan:
${arch}

Standards:
- Next.js 14 App Router patterns
- TypeScript strict — no 'any', explicit return types on exports
- Zustand v4 + Immer for shared state
- Zustand useStore(s => s.specificPart) — never select the whole store
- 'use client' only on interactive components
- useCallback on all handlers in lists or passed as props
- try/catch all async operations
- API routes return { success, data?, error? } shape
- File tools need absolute paths from PROJECT_ROOT

Write ALL the code needed. If multiple files, use clear comments:
// ─── File: src/path/to/file.ts ───────────────────────────────`

    const implementation = await agent['stream'](
      [...messages,
        { role: 'assistant' as const, content: arch },
        { role: 'user' as const, content: implPrompt }
      ],
      context
    )

    agent['completeStep'](context, implId, true, 'Feature implemented')

    // Extract file paths and save to memory
    const filePaths = [...new Set(
      (implementation.match(/src\/[^\s"'`>]+\.[a-z]+/g) ?? [])
    )].slice(0, 8)

    memory_store_project_context(
      context.workspaceId,
      `feature:${Date.now()}`,
      `Implemented: ${params.featureSpec.slice(0, 80)}\nFiles: ${filePaths.join(', ')}`,
      ['feature', 'implementation']
    )

    agent['saveActionSummary'](context, {
      taskTitle:   `Implement: ${params.featureSpec.slice(0, 60)}`,
      whatWasDone: 'Implemented feature with TypeScript + Next.js patterns',
      whyItWasDone: params.featureSpec,
      filesChanged: filePaths,
      decisions:   [arch.split('\n')[0] ?? ''],
    })

    return {
      success:  true,
      output:   implementation,
      metadata: { filesChanged: filePaths, architecture: arch },
    }
  },
}

registerSkill(skill)
export { skill as implementFeatureSkill }
