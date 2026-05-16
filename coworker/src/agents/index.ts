// ============================================================
// Agent Registry
// Singleton instances of all agents. Import getAgentById()
// anywhere on the server to access agents without re-creating them.
// ============================================================
import { OrchestratorAgent } from './orchestrator'
import { UIDesignerAgent }   from './ui-designer'
import { FrontendDevAgent }  from './frontend-dev'
import { ReviewerAgent }     from './reviewer'
import type { BaseAgent }    from './base'

// ─── Singletons ───────────────────────────────────────────────
let _orchestrator: OrchestratorAgent | null = null
let _uiDesigner:   UIDesignerAgent   | null = null
let _frontendDev:  FrontendDevAgent  | null = null
let _reviewer:     ReviewerAgent     | null = null

export function getOrchestrator(): OrchestratorAgent {
  if (!_orchestrator) _orchestrator = new OrchestratorAgent()
  return _orchestrator
}

export function getUIDesigner(): UIDesignerAgent {
  if (!_uiDesigner) _uiDesigner = new UIDesignerAgent()
  return _uiDesigner
}

export function getFrontendDev(): FrontendDevAgent {
  if (!_frontendDev) _frontendDev = new FrontendDevAgent()
  return _frontendDev
}

export function getReviewer(): ReviewerAgent {
  if (!_reviewer) _reviewer = new ReviewerAgent()
  return _reviewer
}

export function getAgentById(id: string): BaseAgent | undefined {
  switch (id) {
    case 'agent_orc': return getOrchestrator()
    case 'agent_ui':  return getUIDesigner()
    case 'agent_dev': return getFrontendDev()
    case 'agent_rev': return getReviewer()
    default:          return undefined
  }
}

export function getAllAgents(): BaseAgent[] {
  return [getOrchestrator(), getUIDesigner(), getFrontendDev(), getReviewer()]
}

// Metadata for the client sidebar (mirrors MOCK_AGENTS structure)
export function getAgentMetadata() {
  return getAllAgents().map(a => ({
    id:            a.id,
    name:          a.name,
    role:          a.role,
    modelProvider: a.modelProvider,
    modelId:       a.modelId,
    autonomyLevel: a.autonomyLevel,
    toolIds:       a.toolIds,
  }))
}
