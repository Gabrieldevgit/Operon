// ============================================================
// Plan Executor — Phase 08, Task 3
// Implements the Action → Plan → Approve → Execute loop.
//
// Core rule: NO silent execution. Every meaningful action must:
//   1. Produce a visible ExecutionPlan with intent + steps
//   2. Surface to the user for approval (unless safe + auto-allowed)
//   3. Only proceed after approval.resolved event fires
//   4. Log every step to the AI Steps system via the EventBus
// ============================================================
import { nanoid }          from 'nanoid'
import { useIDEStore }     from '@/store/ide.store'
import { useStepsStore }   from '@/store/steps.store'
import { useApprovalsStore } from '@/store/approvals.store'
import { bus }             from '@/lib/events/bus'
import type { ExecutionPlan, PlanStep } from '@/store/ide.store'
import type { ToolRisk }   from '@/types'

// ─── Plan request ─────────────────────────────────────────────

export interface PlanRequest {
  taskId:     string
  agentId:    string
  agentName:  string
  title:      string
  intent:     string        // "I will refactor the component structure"
  strategy:   string        // "Extract logic into hooks, simplify JSX tree"
  riskLevel:  ToolRisk
  confidence: number        // 0–100
  steps: Array<{
    title:       string
    description: string
    toolId?:     string
    filePath?:   string
  }>
}

// ─── Executor options ─────────────────────────────────────────

export interface ExecutorOptions {
  /** If true, auto-approve safe plans without waiting for user */
  autoApproveSafe?: boolean
  /** Timeout (ms) to wait for user approval before auto-rejecting */
  approvalTimeoutMs?: number
}

const DEFAULT_OPTIONS: Required<ExecutorOptions> = {
  autoApproveSafe:    false,   // conservative default — always ask
  approvalTimeoutMs:  5 * 60 * 1000, // 5 minutes
}

// ─── Plan executor ───────────────────────────────────────────

export class PlanExecutor {
  private opts: Required<ExecutorOptions>

  constructor(opts: ExecutorOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts }
  }

  // ── 1. Create and surface the plan ───────────────────────

  propose(request: PlanRequest): ExecutionPlan {
    const steps: PlanStep[] = request.steps.map(s => ({
      id:          nanoid(),
      title:       s.title,
      description: s.description,
      toolId:      s.toolId,
      filePath:    s.filePath,
      status:      'pending',
    }))

    const plan = useIDEStore.getState().addPlan({
      taskId:     request.taskId,
      agentId:    request.agentId,
      title:      request.title,
      intent:     request.intent,
      strategy:   request.strategy,
      steps,
      riskLevel:  request.riskLevel,
      confidence: request.confidence,
      status:     'pending',
    })

    // Surface approval request via EventBus
    bus.emit('approval.pending', {
      requestId: plan.id,
      toolId:    request.steps[0]?.toolId ?? 'plan',
      agentId:   request.agentId,
      risk:      request.riskLevel,
    })

    // If safe + autoApproveSafe, skip the approval wait
    if (this.opts.autoApproveSafe && request.riskLevel === 'safe') {
      useIDEStore.getState().approvePlan(plan.id)
    }

    return plan
  }

  // ── 2. Wait for user approval ────────────────────────────

  waitForApproval(planId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        off()
        resolve(false)   // auto-reject on timeout
      }, this.opts.approvalTimeoutMs)

      const off = bus.on('approval.resolved', ({ requestId, approved }) => {
        if (requestId !== planId) return
        clearTimeout(timeout)
        off()
        resolve(approved)
      })
    })
  }

  // ── 3. Execute approved steps ────────────────────────────
  // Calls the provided step runner for each step.
  // Marks steps as active → done/failed, updates plan status.

  async execute(
    planId: string,
    stepRunner: (step: PlanStep, planId: string) => Promise<void>
  ): Promise<void> {
    const { plans, updatePlan } = useIDEStore.getState()
    const plan = plans[planId]
    if (!plan || plan.status !== 'approved') return

    updatePlan(planId, { status: 'executing' })

    for (const step of plan.steps) {
      // Mark step active
      this._patchStep(planId, step.id, { status: 'active' })

      // Emit to AI Steps
      useStepsStore.getState().emit({
        taskId:   plan.taskId,
        agentId:  plan.agentId,
        category: step.toolId ? 'tool-use' : 'thinking',
        title:    step.title,
        status:   'running',
        detail:   step.description,
        files:    step.filePath ? [step.filePath] : [],
      })

      try {
        await stepRunner(step, planId)
        this._patchStep(planId, step.id, { status: 'done' })
      } catch (err) {
        this._patchStep(planId, step.id, { status: 'failed' })
        updatePlan(planId, { status: 'done' })   // plan done (with failure)
        throw err
      }
    }

    updatePlan(planId, { status: 'done' })

    bus.emit('task.completed', {
      taskId:  plan.taskId,
      agentId: plan.agentId,
      result:  `Plan "${plan.title}" executed successfully.`,
    })
  }

  // ── Full lifecycle helper ────────────────────────────────

  async proposeAndExecute(
    request: PlanRequest,
    stepRunner: (step: PlanStep, planId: string) => Promise<void>
  ): Promise<{ approved: boolean; planId: string }> {
    const plan    = this.propose(request)
    const approved = await this.waitForApproval(plan.id)

    if (!approved) {
      return { approved: false, planId: plan.id }
    }

    await this.execute(plan.id, stepRunner)
    return { approved: true, planId: plan.id }
  }

  // ─── Internal helpers ────────────────────────────────────

  private _patchStep(
    planId: string,
    stepId: string,
    patch:  Partial<PlanStep>
  ) {
    const { plans, updatePlan } = useIDEStore.getState()
    const plan = plans[planId]
    if (!plan) return

    const updatedSteps = plan.steps.map(s =>
      s.id === stepId ? { ...s, ...patch } : s
    )
    updatePlan(planId, { steps: updatedSteps })
  }
}

// ─── Singleton export ─────────────────────────────────────────

export const planExecutor = new PlanExecutor()
