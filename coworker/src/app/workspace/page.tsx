'use client'
import { useEffect, useCallback }  from 'react'
import { nanoid }                  from 'nanoid'
import { WorkspaceProvider }       from '@/providers/WorkspaceProvider'
import { AgentSidebar }            from '@/components/layout/AgentSidebar'
import { StepsPanel }              from '@/components/layout/StepsPanel'
import { WorkspaceTabs, type WorkspaceTab } from '@/components/workspace/WorkspaceTabs'
import { ChatThread }              from '@/components/workspace/ChatThread'
import { ChatInput }               from '@/components/workspace/ChatInput'
import { TaskPanel }               from '@/components/workspace/TaskPanel'
import { StreamingBubble }         from '@/components/workspace/StreamingBubble'
import { AgentStatusBar }          from '@/components/agents/AgentStatusBar'
import { ApprovalModal }           from '@/components/ui/ApprovalModal'
import { usePanels }               from '@/hooks/usePanels'
import { usePersistentChat }       from '@/hooks/usePersistentChat'
import { useAgentStream }          from '@/hooks/useAgentStream'
import { useStepsStore }           from '@/store/steps.store'
import { useTasksStore }           from '@/store/tasks.store'
import { useAgentsStore }          from '@/store/agents.store'
import { useApprovalsStore }       from '@/store/approvals.store'
import { MOCK_WORKSPACE, MOCK_AGENTS } from '@/lib/mock/seed'
import { useState }                from 'react'
import type { Agent }              from '@/types'

const WORKSPACE_ID = 'ws_demo'

// ─── Inner page (inside provider context) ─────────────────────

function WorkspaceInner() {
  const panels         = usePanels()
  const stepsStore     = useStepsStore()
  const tasksStore     = useTasksStore()
  const agentsStore    = useAgentsStore()
  const approvalsStore = useApprovalsStore()

  const [agents,   setAgents]   = useState<Agent[]>([])
  const [tabs,     setTabs]     = useState<WorkspaceTab[]>([
    { id: WORKSPACE_ID, name: 'Coworker Platform' },
  ])
  const [activeTab, setActiveTab] = useState(WORKSPACE_ID)

  // Seed mock agents
  useEffect(() => {
    setAgents(MOCK_AGENTS)
    MOCK_AGENTS.forEach(a => agentsStore.registerAgent(a))
  }, [])

  const agentMap         = Object.fromEntries(agents.map(a => [a.id, a]))
  const steps            = useStepsStore(s => s.stepOrder.map(id => s.steps[id]).filter(Boolean) as NonNullable<typeof s.steps[string]>[])
  const tasks            = useTasksStore(s => Object.values(s.tasks))
  const pendingApproval  = approvalsStore.getPending()[0] ?? null

  // Persistent chat — loads history from Supabase on mount
  const chat = usePersistentChat()

  // Agent stream — now wires thinking events to steps store
  const stream = useAgentStream({
    workspaceId: WORKSPACE_ID,
    onMessage(msg) { chat.addMessage(msg) },
    onError(err) { console.error('[Agent error]', err) },
  })

  // Agent statuses reflect real stream activity
  const agentsWithStatus = agents.map(a => ({
    ...a,
    status: stream.activeAgent?.id === a.id
      ? ('working' as const)
      : stream.streaming && a.id === 'agent_orc'
        ? ('thinking' as const)
        : ('idle' as const),
  }))

  const handleSend = useCallback((content: string) => {
    const userMsg = chat.addMessage({ role: 'user', content })
    const allMsgs = [...chat.messages, userMsg]
    const aiMsgs  = allMsgs.map(m => ({
      role:    (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))
    stream.send(aiMsgs, allMsgs)
  }, [chat, stream])

  const handleNewTab = useCallback(() => {
    const id   = `ws_${nanoid(6)}`
    setTabs(prev => [...prev, { id, name: `Workspace ${prev.length + 1}` }])
    setActiveTab(id)
  }, [])

  const handleTabClose = useCallback((id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id))
    if (activeTab === id) setActiveTab(tabs[0]?.id ?? '')
  }, [activeTab, tabs])

  if (!chat.ready) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'hsl(220,13%,7%)' }}>
        <div className="text-center space-y-3">
          <div className="flex gap-1.5 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p className="text-xs font-mono text-white/30">Loading workspace memory…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'hsl(220,13%,7%)' }}>
      <AgentSidebar agents={agentsWithStatus} workspace={MOCK_WORKSPACE} open={panels.sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkspaceTabs
          tabs={tabs} activeTabId={activeTab}
          onTabChange={setActiveTab} onTabClose={handleTabClose} onNewTab={handleNewTab}
          onToggleSidebar={panels.toggleSidebar} onToggleSteps={panels.toggleSteps}
          onToggleTask={panels.toggleTaskPanel}
          sidebarOpen={panels.sidebarOpen} stepsOpen={panels.stepsOpen}
        />
        <TaskPanel tasks={tasks} agents={agentMap} open={panels.taskPanelOpen} />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatThread messages={chat.messages} agents={agentMap} />
          {stream.streaming && (
            <div className="px-4 pb-2 flex-shrink-0">
              <StreamingBubble
                agentName={stream.activeAgent?.name ?? 'Orion'}
                agentRole={(stream.activeAgent?.role ?? 'orchestrator') as Parameters<typeof StreamingBubble>[0]['agentRole']}
                content={stream.draft}
              />
            </div>
          )}
          {stream.error && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono flex-shrink-0">
              ⚠ {stream.error}
              <button onClick={stream.abort} className="ml-2 underline">dismiss</button>
            </div>
          )}
        </div>

        <AgentStatusBar />
        <ChatInput onSend={handleSend} disabled={stream.streaming} />
      </div>

      <StepsPanel steps={steps} open={panels.stepsOpen} onClear={() => stepsStore.clearAll()} />
      <ApprovalModal
        request={pendingApproval}
        onApprove={(id, r) => approvalsStore.resolve(id, true,  r)}
        onDeny={(id, r)    => approvalsStore.resolve(id, false, r)}
      />
    </div>
  )
}

// ─── Outer wrapper — provides memory context ───────────────────

export default function WorkspacePage() {
  return (
    <WorkspaceProvider workspaceId={WORKSPACE_ID}>
      <WorkspaceInner />
    </WorkspaceProvider>
  )
}
