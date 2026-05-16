// ============================================================
// Shared Skills: save_action_summary + recall_project_context
// Used by ALL agents after every task completion.
// ============================================================
import { registerSkill, type Skill } from '../types'
import {
  save_action_summary,
  memory_retrieve,
  memory_store_project_context,
  decision_log,
} from '@/lib/memory/memory'

// ─── save_action_summary ──────────────────────────────────────

interface SaveSummaryParams {
  taskTitle:    string
  whatWasDone:  string
  whyItWasDone: string
  filesChanged?: string[]
  decisions?:   string[]
  nextSteps?:   string[]
}

const saveSummarySkill: Skill<SaveSummaryParams> = {
  id:          'save_action_summary',
  name:        'Save Action Summary',
  description: 'After completing a task, store a concise summary of what was done for future sessions.',
  agentRoles:  ['orchestrator', 'ui-designer', 'frontend-dev', 'reviewer'],
  risk:        'safe',

  async execute({ params, context, agent }) {
    const stepId = agent['emitStep'](context, 'memory-write', 'Saving action summary to memory')

    try {
      save_action_summary({
        workspaceId:  context.workspaceId,
        taskId:       context.taskId,
        agentId:      agent.id,
        taskTitle:    params.taskTitle,
        whatWasDone:  params.whatWasDone,
        whyItWasDone: params.whyItWasDone,
        filesChanged: params.filesChanged ?? [],
        decisions:    params.decisions    ?? [],
        nextSteps:    params.nextSteps    ?? [],
      })

      // Also log each decision separately for easy retrieval
      for (const decision of params.decisions ?? []) {
        decision_log({
          workspaceId: context.workspaceId,
          agentId:     agent.id,
          decision,
          reasoning:   params.whyItWasDone,
        })
      }

      agent['completeStep'](context, stepId, true, 'Summary saved to project memory')

      return {
        success: true,
        output:  `✓ Saved: "${params.taskTitle}" to memory`,
        metadata: { taskTitle: params.taskTitle, filesChanged: params.filesChanged },
      }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(saveSummarySkill)
export { saveSummarySkill }

// ─── recall_project_context ───────────────────────────────────

interface RecallContextParams {
  query:   string
  scope?:  'session' | 'project' | 'global'
  types?:  string[]
  limit?:  number
}

const recallContextSkill: Skill<RecallContextParams> = {
  id:          'recall_project_context',
  name:        'Recall Project Context',
  description: 'Retrieve relevant architectural decisions, code patterns, and past task history.',
  agentRoles:  ['orchestrator', 'ui-designer', 'frontend-dev', 'reviewer'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'memory-read',
      `Recalling: "${params.query.slice(0, 40)}"`)

    try {
      const results = memory_retrieve({
        workspaceId: context.workspaceId,
        agentId:     agent.id,
        scope:       params.scope ?? 'project',
        limit:       params.limit ?? 10,
      })

      agent['completeStep'](context, stepId, true,
        `Found ${results.entries.length} relevant memories`)

      if (results.entries.length === 0) {
        return { success: true, output: 'No relevant project context found for this query.' }
      }

      // Use AI to summarize the retrieved memories in context of the query
      const recallPrompt = `The user asked about: "${params.query}"

Here are relevant memories from previous sessions:

${results.entries.map(e => `[${e.type}] ${e.content}`).join('\n\n')}

Summarize what is relevant to the query in 3-5 sentences. Be specific — include file names, decisions, and patterns mentioned.`

      const summary = await agent['complete'](
        [...messages, { role: 'user' as const, content: recallPrompt }],
        context
      )

      return {
        success:  true,
        output:   summary,
        metadata: { entriesFound: results.entries.length, query: params.query },
      }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(recallContextSkill)
export { recallContextSkill }

// ─── store_code_pattern ───────────────────────────────────────
// Bonus skill: agents call this when they observe a reusable pattern

interface StorePatternParams {
  patternName:  string
  description:  string
  codeExample:  string
  whenToUse:    string
}

const storePatternSkill: Skill<StorePatternParams> = {
  id:          'store_code_pattern',
  name:        'Store Code Pattern',
  description: 'Save a reusable code pattern to project memory for consistency enforcement.',
  agentRoles:  ['frontend-dev', 'ui-designer', 'reviewer'],
  risk:        'safe',

  async execute({ params, context, agent }) {
    const stepId = agent['emitStep'](context, 'memory-write',
      `Storing pattern: ${params.patternName}`)

    const content = `Pattern: ${params.patternName}
When to use: ${params.whenToUse}
Description: ${params.description}
Example:
${params.codeExample.slice(0, 400)}`

    memory_store_project_context(
      context.workspaceId,
      `pattern:${params.patternName.toLowerCase().replace(/\s+/g, '-')}`,
      content,
      ['pattern', 'code-pattern']
    )

    agent['completeStep'](context, stepId, true, `Pattern "${params.patternName}" saved`)
    return { success: true, output: `Pattern "${params.patternName}" stored in project memory.` }
  },
}

registerSkill(storePatternSkill)
export { storePatternSkill }
