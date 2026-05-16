// ============================================================
// Permission Checker
// Determines approval requirements before any tool executes.
// Agents call needsApproval() — the executor enforces the result.
// ============================================================
import type { Tool, ToolRisk, ToolApproval, ToolExecutionContext } from '@/types'
import { useApprovalsStore } from '@/store/approvals.store'

export interface PermissionResult {
  allowed:        boolean
  needsApproval:  boolean
  reason:         string
}

// Autonomy level → maximum risk that can auto-execute
const AUTONOMY_AUTO_THRESHOLD: Record<string, ToolRisk> = {
  passive:    'safe',    // only read-only, safe tools
  assisted:   'safe',    // same — always ask for anything risky
  'semi-auto':'medium',  // can auto-run safe + medium
  autonomous: 'high',    // can auto-run up to high risk (critical still asks)
}

export function checkPermission(
  tool: Tool,
  context: ToolExecutionContext,
  agentAutonomy = 'assisted'
): PermissionResult {
  // CRITICAL tools always require explicit approval, no exceptions
  if (tool.risk === 'critical') {
    return { allowed: false, needsApproval: true, reason: 'Critical risk — always requires user approval' }
  }

  // Tool-level override
  if (tool.defaultApproval === 'disabled') {
    return { allowed: false, needsApproval: false, reason: 'Tool is disabled for this agent' }
  }

  if (tool.defaultApproval === 'always-ask') {
    return { allowed: false, needsApproval: true, reason: 'Tool always requires approval' }
  }

  // Check remembered decisions
  const remembered = useApprovalsStore.getState().isRemembered(tool.id, context.callingAgentId)
  if (remembered === true)  return { allowed: true,  needsApproval: false, reason: 'User previously approved' }
  if (remembered === false) return { allowed: false, needsApproval: false, reason: 'User previously denied' }

  // Check autonomy threshold
  const threshold = AUTONOMY_AUTO_THRESHOLD[agentAutonomy] ?? 'safe'
  const riskOrder: ToolRisk[] = ['safe', 'medium', 'high', 'critical']
  const toolRiskIdx = riskOrder.indexOf(tool.risk)
  const thresholdIdx = riskOrder.indexOf(threshold)

  if (toolRiskIdx <= thresholdIdx) {
    return { allowed: true, needsApproval: false, reason: `Auto-approved at ${agentAutonomy} autonomy` }
  }

  return { allowed: false, needsApproval: true, reason: `${tool.risk} risk exceeds ${agentAutonomy} autonomy threshold` }
}

// Helper: build an approval request from a tool + context
export function buildApprovalRequest(
  tool:    Tool,
  context: ToolExecutionContext,
  input:   Record<string, unknown>,
  reason:  string
) {
  const affectedFiles: string[] = []
  if (input.path && typeof input.path === 'string')   affectedFiles.push(input.path)
  if (input.paths && Array.isArray(input.paths))      affectedFiles.push(...input.paths as string[])
  if (input.command && typeof input.command === 'string') {
    // Don't expose the full command in the file list
  }

  return {
    toolId:        tool.id,
    toolName:      tool.name,
    agentId:       context.callingAgentId,
    agentName:     context.callingAgentName,
    taskId:        context.taskId,
    action:        buildActionDescription(tool, input),
    reason,
    risk:          tool.risk,
    reversible:    tool.risk === 'safe' || tool.risk === 'medium',
    affectedFiles: affectedFiles.length > 0 ? affectedFiles : undefined,
    input,
  }
}

function buildActionDescription(tool: Tool, input: Record<string, unknown>): string {
  switch (tool.id) {
    case 'file_read':    return `Read file: ${input.path}`
    case 'file_write':   return `Write to: ${input.path}`
    case 'code_lint':    return `Lint: ${input.path}`
    case 'code_search':  return `Search for: "${input.query}" in ${input.path ?? 'project'}`
    case 'web_search':   return `Search the web for: "${input.query}"`
    case 'terminal_run': return `Run command: ${input.command}`
    default:             return `Execute ${tool.name}`
  }
}
