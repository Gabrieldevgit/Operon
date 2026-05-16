// ============================================================
// Skills: breakdown_task + estimate_effort
// Assigned: Orchestrator
// ============================================================
import { registerSkill, type Skill } from '../types'
import { nanoid } from 'nanoid'

// ─── breakdown_task ───────────────────────────────────────────

interface BreakdownParams { userRequest: string; workspaceId: string }

interface TaskItem {
  title:     string
  agent:     string
  checklist: string[]
  priority:  'low' | 'medium' | 'high'
  dependsOn: number[]   // indices into tasks array
}

interface BreakdownResult {
  intent: string
  tasks:  TaskItem[]
}

const breakdownSkill: Skill<BreakdownParams> = {
  id:          'breakdown_task',
  name:        'Break Down Task',
  description: 'Take a high-level request and break it into structured tasks with agent assignments.',
  agentRoles:  ['orchestrator'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'thinking', 'Breaking down task…')

    const prompt = `Break down this user request into specific, actionable tasks.

Request: "${params.userRequest}"

Respond ONLY with JSON:
{
  "intent": "one sentence summary of what the user wants",
  "tasks": [
    {
      "title": "short task title",
      "agent": "ui-designer|frontend-dev|reviewer|orchestrator",
      "checklist": ["step 1", "step 2", "step 3"],
      "priority": "low|medium|high",
      "dependsOn": []
    }
  ]
}

Rules:
- Max 5 tasks
- Each checklist item is 3-6 words
- dependsOn contains indices of tasks that must complete first
- Assign design tasks to ui-designer, code tasks to frontend-dev, review to reviewer`

    try {
      const raw    = await agent['complete']([...messages, { role: 'user' as const, content: prompt }], context)
      const result = agent['extractJson']<BreakdownResult>(raw)

      agent['completeStep'](context, stepId, true,
        result ? `${result.tasks.length} task(s) identified` : 'Breakdown complete')

      if (!result) return { success: true, output: raw }

      // Emit tasks to the client
      for (const task of result.tasks) {
        context.send({
          type: 'task_created',
          task: {
            title:           task.title,
            description:     task.checklist.join(', '),
            status:          'pending',
            priority:        task.priority,
            assignedAgentId: resolveAgentId(task.agent),
            createdBy:       agent.id,
            workspaceId:     params.workspaceId,
            subTaskIds:      [],
            tags:            [task.agent],
            checklist:       task.checklist.map(label => ({
              id: nanoid(6), label, status: 'pending' as const,
            })),
          },
        })
      }

      const output = `**${result.intent}**\n\n${result.tasks.map((t, i) =>
        `${i + 1}. **${t.title}** → ${t.agent}\n${t.checklist.map(c => `   - ${c}`).join('\n')}`
      ).join('\n\n')}`

      return { success: true, output, metadata: result }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

function resolveAgentId(role: string): string {
  return { 'ui-designer': 'agent_ui', 'frontend-dev': 'agent_dev', reviewer: 'agent_rev' }[role] ?? 'agent_orc'
}

registerSkill(breakdownSkill)
export { breakdownSkill }

// ─── estimate_effort ──────────────────────────────────────────

interface EstimateParams { taskDescription: string }

const estimateSkill: Skill<EstimateParams> = {
  id:          'estimate_effort',
  name:        'Estimate Effort',
  description: 'Provide a complexity/effort estimate using story points and reasoning.',
  agentRoles:  ['orchestrator'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'thinking', 'Estimating effort…')

    const prompt = `Estimate the development effort for this task.

Task: "${params.taskDescription}"

Respond with:
1. **Story points**: 1 (trivial) | 2 (simple) | 3 (moderate) | 5 (complex) | 8 (very complex) | 13 (epic)
2. **Reasoning**: 2-3 sentences explaining the estimate
3. **Risk factors**: what could make it take longer
4. **Suggested approach**: how to break it down if points > 5

Be concise and practical.`

    try {
      const estimate = await agent['complete']([...messages, { role: 'user' as const, content: prompt }], context)
      agent['completeStep'](context, stepId, true)
      return { success: true, output: estimate }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(estimateSkill)
export { estimateSkill }
