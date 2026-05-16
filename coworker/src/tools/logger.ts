// ============================================================
// Tool Logger
// Every tool invocation — start, complete, fail, approve —
// is emitted as an AIStep to the live Steps feed.
// ============================================================
import { useStepsStore }    from '@/store/steps.store'
import { useApprovalsStore } from '@/store/approvals.store'
import type { Tool, ToolExecutionContext, ToolResult, ApprovalRequest } from '@/types'
import type { StepCategory } from '@/types/step'

function toolToStepCategory(toolId: string): StepCategory {
  if (toolId === 'file_read')   return 'file-read'
  if (toolId === 'file_write')  return 'file-write'
  if (toolId === 'terminal_run') return 'tool-use'
  return 'tool-use'
}

export interface ToolLogger {
  start:    (tool: Tool, context: ToolExecutionContext, input: Record<string, unknown>) => string
  complete: (stepId: string, result: ToolResult) => void
  fail:     (stepId: string, error: string) => void
  approval: (tool: Tool, context: ToolExecutionContext, request: ApprovalRequest) => string
}

export function createToolLogger(): ToolLogger {
  const { emit, updateStep } = useStepsStore.getState()

  return {
    start(tool, context, input) {
      const affectedFiles: string[] = []
      if (input.path && typeof input.path === 'string') affectedFiles.push(input.path)

      const step = emit({
        agentId:          context.callingAgentId,
        agentName:        context.callingAgentName,
        agentRole:        'frontend-dev',
        taskId:           context.taskId,
        category:         toolToStepCategory(tool.id),
        title:            `${tool.name}${input.path ? `: ${String(input.path).split('/').pop()}` : ''}`,
        detail:           JSON.stringify(input, null, 2).slice(0, 300),
        status:           'running',
        toolId:           tool.id,
        toolName:         tool.name,
        affectedFiles:    affectedFiles.length > 0 ? affectedFiles : undefined,
        risk:             tool.risk,
        requiresApproval: false,
      })
      return step.id
    },

    complete(stepId, result) {
      updateStep(stepId, {
        status:     result.success ? 'completed' : 'failed',
        durationMs: result.durationMs,
        detail:     result.success
          ? `Completed in ${result.durationMs}ms`
          : `Failed: ${result.error}`,
      })
    },

    fail(stepId, error) {
      updateStep(stepId, { status: 'failed', detail: error })
    },

    approval(tool, context, request) {
      const step = emit({
        agentId:          context.callingAgentId,
        agentName:        context.callingAgentName,
        agentRole:        'frontend-dev',
        taskId:           context.taskId,
        category:         'approval',
        title:            `Awaiting approval: ${tool.name}`,
        detail:           request.reason,
        status:           'awaiting-approval',
        toolId:           tool.id,
        toolName:         tool.name,
        risk:             tool.risk,
        requiresApproval: true,
        approvalId:       request.id,
      })
      return step.id
    },
  }
}
