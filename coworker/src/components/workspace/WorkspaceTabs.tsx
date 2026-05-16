'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, PanelLeft, PanelRight, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkspaceTab {
  id:   string
  name: string
  icon?: string
}

interface Props {
  tabs:            WorkspaceTab[]
  activeTabId:     string
  onTabChange:     (id: string) => void
  onTabClose:      (id: string) => void
  onNewTab:        () => void
  onToggleSidebar: () => void
  onToggleSteps:   () => void
  onToggleTask:    () => void
  sidebarOpen:     boolean
  stepsOpen:       boolean
}

export function WorkspaceTabs({
  tabs, activeTabId, onTabChange, onTabClose, onNewTab,
  onToggleSidebar, onToggleSteps, onToggleTask,
  sidebarOpen, stepsOpen,
}: Props) {
  return (
    <div
      className="flex items-center h-10 border-b border-white/[0.07] flex-shrink-0 px-1"
      style={{ background: 'rgba(8,10,16,0.98)' }}
    >
      {/* Left: panel toggle */}
      <button
        onClick={onToggleSidebar}
        className={cn(
          'p-1.5 rounded mr-1 transition-colors',
          sidebarOpen ? 'text-white/50 hover:text-white/80' : 'text-white/20 hover:text-white/50'
        )}
        title="Toggle sidebar (⌘B)"
      >
        <PanelLeft className="w-3.5 h-3.5" />
      </button>

      {/* Tabs */}
      <div className="flex items-center flex-1 overflow-x-auto scrollbar-none gap-px">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            layoutId={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 h-8 text-xs font-mono rounded-md transition-colors flex-shrink-0',
              tab.id === activeTabId
                ? 'bg-white/8 text-white/90'
                : 'text-white/30 hover:text-white/60 hover:bg-white/4'
            )}
          >
            {tab.id === activeTabId && (
              <motion.div
                layoutId="active-tab-bg"
                className="absolute inset-0 rounded-md bg-white/[0.07] border border-white/[0.1]"
              />
            )}
            <span className="relative z-10">{tab.name}</span>
            {tabs.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
                className="relative z-10 text-white/20 hover:text-white/60 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </motion.button>
        ))}

        <button
          onClick={onNewTab}
          className="flex items-center gap-1 px-2 h-8 text-white/20 hover:text-white/50 transition-colors font-mono text-xs"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Right: panel toggles */}
      <div className="flex items-center gap-0.5 ml-1">
        <button
          onClick={onToggleTask}
          className="p-1.5 rounded text-white/25 hover:text-white/60 transition-colors"
          title="Toggle tasks (⌘J)"
        >
          <ListChecks className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleSteps}
          className={cn(
            'p-1.5 rounded transition-colors',
            stepsOpen ? 'text-white/50 hover:text-white/80' : 'text-white/20 hover:text-white/50'
          )}
          title="Toggle AI steps (⌘\\)"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
