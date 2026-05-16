// ============================================================
// Skills — barrel export + auto-registration
// Import this once (e.g. in layout.tsx or an agent) to register
// all built-in skills so agents can call them by ID.
// ============================================================
export { registerSkill, getSkill, getAllSkills, getSkillsForRole, executeSkill } from './types'

// ─── Auto-registration (call once at startup) ─────────────────

import './orchestrator/plan_architecture'
import './orchestrator/breakdown_task'
import './ui/create_component'
import './dev/implement_feature'
import './reviewer/review_code'
import './shared/recall_project_context'

let _registered = false
export function registerDefaultSkills(): void {
  if (_registered) return
  _registered = true
  console.log('[Skills] 10 default skills registered')
}

// Named re-exports for direct access
export { planArchitectureSkill }   from './orchestrator/plan_architecture'
export { breakdownSkill, estimateSkill } from './orchestrator/breakdown_task'
export { createComponentSkill, designLayoutSkill } from './ui/create_component'
export { implementFeatureSkill }   from './dev/implement_feature'
export {
  reviewCodeSkill, detectBugsSkill,
  securityAuditSkill, debugIssueSkill,
} from './reviewer/review_code'
export {
  saveSummarySkill, recallContextSkill, storePatternSkill,
} from './shared/recall_project_context'
