// ============================================================
// Agent Context Builder
// Assembles the "Project Memory" section injected into every
// agent system prompt. Pulls from Zustand (loaded from Firestore).
// ============================================================
import { useMemoryStore } from '@/store/memory.store'
import type { MemoryEntry } from '@/types'

export interface AgentContextOptions {
  workspaceId:  string
  agentId:      string
  maxDecisions: number  // default 5
  maxTasks:     number  // default 8
  maxContext:   number  // default 6
  maxConvTurns: number  // default 6
}

const DEFAULTS: Omit<AgentContextOptions, 'workspaceId' | 'agentId'> = {
  maxDecisions: 5,
  maxTasks:     8,
  maxContext:   6,
  maxConvTurns: 6,
}

export function buildAgentContext(opts: AgentContextOptions): string {
  const { workspaceId, agentId } = opts
  const o = { ...DEFAULTS, ...opts }
  const entries = Object.values(useMemoryStore.getState().entries)
  const now     = Date.now()

  function pick(type: MemoryEntry['type'], limit: number): MemoryEntry[] {
    return entries
      .filter(e =>
        e.workspaceId === workspaceId &&
        e.type === type &&
        (!e.expiresAt || e.expiresAt > now) &&
        (e.agentId === undefined || e.agentId === agentId)
      )
      .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt)
      .slice(0, limit)
  }

  const decisions = pick('decision',       o.maxDecisions)
  const tasks     = pick('task-history',   o.maxTasks)
  const context   = pick('project-context', o.maxContext)
  const conv      = pick('conversation',   o.maxConvTurns)

  if (!decisions.length && !tasks.length && !context.length && !conv.length) {
    return ''
  }

  const sections: string[] = ['## Memory from previous sessions\n']

  if (decisions.length) {
    sections.push('### Key decisions made')
    decisions.forEach(d => sections.push(`- ${d.content.split('\n')[0]}`))
  }

  if (context.length) {
    sections.push('\n### Project context')
    context.forEach(c => sections.push(`- ${c.content.slice(0, 180)}`))
  }

  if (tasks.length) {
    sections.push('\n### Recent task history')
    tasks.forEach(t => {
      const firstLine = t.content.split('\n')[0] ?? t.content
      sections.push(`- ${firstLine}`)
    })
  }

  if (conv.length) {
    sections.push('\n### Recent conversation context')
    conv.forEach(c => {
      // Each conv entry has "User: ...\nAgent: ..." format
      const preview = c.content.slice(0, 200).replace(/\n/g, ' ')
      sections.push(`- ${preview}`)
    })
  }

  sections.push('\nUse this context to maintain consistency. Do NOT repeat what was already done unless asked.')
  return sections.join('\n')
}

// Lighter version — just returns a one-paragraph summary for simple agents
export function buildShortContext(workspaceId: string, agentId: string): string {
  const entries = Object.values(useMemoryStore.getState().entries)
    .filter(e =>
      e.workspaceId === workspaceId &&
      e.importance >= 4 &&
      (!e.expiresAt || e.expiresAt > Date.now())
    )
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)

  if (!entries.length) return ''
  const bullets = entries.map(e => `• ${e.content.split('\n')[0]}`).join('\n')
  return `\n## Relevant project memory\n${bullets}\n`
}
