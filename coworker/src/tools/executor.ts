// ============================================================
// Tool Executor (client-side)
// Orchestrates the full lifecycle of a tool call:
//   1. Permission check
//   2. Approval request (if needed)
//   3. API call to /api/tools/execute
//   4. Step logging
// Agents call executor.run() — never fetch directly.
// ============================================================
import { getTool }          from './registry'
import { checkPermission, buildApprovalRequest } from './permissions'
import { createToolLogger } from './logger'
import { useApprovalsStore } from '@/store/approvals.store'
import type { ToolExecutionContext, ToolResult } from '@/types'

export interface ExecuteOptions {
  agentAutonomy?: string
  onApprovalNeeded?: (requestId: string) => void
}

export async function executeTool(
  toolId:  string,
  input:   Record<string, unknown>,
  context: ToolExecutionContext,
  opts:    ExecuteOptions = {}
): Promise<ToolResult> {
  const tool = getTool(toolId)
  if (!tool) {
    return { success: false, error: `Tool not found: ${toolId}`, executedAt: Date.now() }
  }

  const permission = checkPermission(tool, context, opts.agentAutonomy)
  const logger     = createToolLogger()

  // Blocked by remembered denial or disabled
  if (!permission.allowed && !permission.needsApproval) {
    return { success: false, error: permission.reason, executedAt: Date.now() }
  }

  // Needs approval — create request and wait
  if (permission.needsApproval) {
    const requestData  = buildApprovalRequest(tool, context, input, permission.reason)
    const approvalRequest = useApprovalsStore.getState().request(requestData)
    const stepId       = logger.approval(tool, context, approvalRequest)
    opts.onApprovalNeeded?.(approvalRequest.id)

    // Poll for resolution (Phase 05 agents will use a proper event system)
    const approved = await waitForApproval(approvalRequest.id)

    if (!approved) {
      return { success: false, error: 'User denied the action', executedAt: Date.now() }
    }
  }

  // Execute via API route
  const stepId = logger.start(tool, context, input)

  try {
    const res = await fetch('/api/tools/execute', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ toolId, input, context }),
    })

    const result: ToolResult = await res.json()
    logger.complete(stepId, result)
    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.fail(stepId, error)
    return { success: false, error, executedAt: Date.now() }
  }
}

// Wait up to 5 minutes for an approval modal to be resolved
function waitForApproval(requestId: string): Promise<boolean> {
  return new Promise(resolve => {
    const TIMEOUT = 5 * 60 * 1000
    const start   = Date.now()

    const check = () => {
      const store   = useApprovalsStore.getState()
      const history = store.history.find(r => r.id === requestId)

      if (history) {
        resolve(history.status === 'approved')
        return
      }

      if (Date.now() - start > TIMEOUT) {
        resolve(false)
        return
      }

      setTimeout(check, 200)
    }

    check()
  })
}
