'use client'
import { usePanels } from '@/hooks/usePanels'
import { AgentSidebar } from './AgentSidebar'
import { StepsPanel } from './StepsPanel'
import type { Agent, Workspace } from '@/types'

interface Props {
  agents:    Record<string, Agent>
  workspace: Workspace
  children:  React.ReactNode
  rightPanel?: React.ReactNode
}

export function WorkspaceLayout({ agents, workspace, children, rightPanel }: Props) {
  const panels = usePanels()

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'hsl(220,13%,7%)' }}>
      {/* Left sidebar */}
      <AgentSidebar
        agents={Object.values(agents)}
        workspace={workspace}
        open={panels.sidebarOpen}
      />

      {/* Main center area — passed as children */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Inject panel controls via context — tabs use usePanels hook */}
        {children}
      </main>

      {/* Right steps panel */}
      <StepsPanel
        steps={[]}
        open={panels.stepsOpen}
        onClear={() => {}}
      />
    </div>
  )
}
