'use client'
// ============================================================
// useSkillTrigger — maps slash commands + natural language
// to specific skills. Agents can also trigger skills directly.
// ============================================================

// Slash command → skill ID mapping
export const SLASH_COMMANDS: Record<string, {
  skillId:     string
  label:       string
  description: string
  agentId:     string
}> = {
  '/plan':     { skillId: 'plan_architecture',    label: '/plan',     description: 'Plan architecture for a feature', agentId: 'agent_orc' },
  '/build':    { skillId: 'implement_feature',     label: '/build',    description: 'Implement a feature',            agentId: 'agent_dev' },
  '/design':   { skillId: 'create_component',      label: '/design',   description: 'Design a UI component',          agentId: 'agent_ui'  },
  '/layout':   { skillId: 'design_layout',         label: '/layout',   description: 'Design a page layout',           agentId: 'agent_ui'  },
  '/review':   { skillId: 'review_code',           label: '/review',   description: 'Review code for issues',         agentId: 'agent_rev' },
  '/bugs':     { skillId: 'detect_bugs',           label: '/bugs',     description: 'Detect bugs in code',            agentId: 'agent_rev' },
  '/security': { skillId: 'security_audit',        label: '/security', description: 'Run a security audit',           agentId: 'agent_rev' },
  '/debug':    { skillId: 'debug_issue',           label: '/debug',    description: 'Debug an error or issue',        agentId: 'agent_rev' },
  '/tasks':    { skillId: 'breakdown_task',        label: '/tasks',    description: 'Break down a task into steps',   agentId: 'agent_orc' },
  '/estimate': { skillId: 'estimate_effort',       label: '/estimate', description: 'Estimate development effort',    agentId: 'agent_orc' },
  '/recall':   { skillId: 'recall_project_context',label: '/recall',   description: 'Recall project context + history', agentId: 'agent_orc' },
  '/save':     { skillId: 'save_action_summary',   label: '/save',     description: 'Save current context to memory', agentId: 'agent_orc' },
}

export function parseSlashCommand(input: string): {
  command: string; skillId: string; agentId: string; params: string
} | null {
  const trimmed = input.trim()
  const cmd     = Object.keys(SLASH_COMMANDS).find(c => trimmed.toLowerCase().startsWith(c))
  if (!cmd) return null
  const info   = SLASH_COMMANDS[cmd]!
  return {
    command: cmd,
    skillId: info.skillId,
    agentId: info.agentId,
    params:  trimmed.slice(cmd.length).trim(),
  }
}

// Natural language → skill detection (fallback when no slash command)
export function detectNaturalSkill(text: string): string | null {
  const t = text.toLowerCase()
  if ((t.includes('build') || t.includes('implement') || t.includes('create') || t.includes('add')) &&
      (t.includes('feature') || t.includes('component') || t.includes('hook') || t.includes('page')))
    return 'implement_feature'
  if ((t.includes('review') || t.includes('check')) && (t.includes('code') || t.includes('this')))
    return 'review_code'
  if (t.includes('bug') || t.includes('error') || t.includes('broken') || t.includes('not working'))
    return 'debug_issue'
  if (t.includes('security') || t.includes('vulnerability') || t.includes('xss'))
    return 'security_audit'
  if (t.includes('design') || t.includes('layout') || t.includes('ui') || t.includes('component'))
    return 'create_component'
  if (t.includes('plan') || t.includes('architecture') || t.includes('structure'))
    return 'plan_architecture'
  if (t.includes('remember') || t.includes('recall') || t.includes('previous session'))
    return 'recall_project_context'
  return null
}
