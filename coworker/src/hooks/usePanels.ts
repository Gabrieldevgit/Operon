'use client'
import { useState, useEffect, useCallback } from 'react'

export interface PanelState {
  sidebarOpen: boolean
  stepsOpen:   boolean
  taskPanelOpen: boolean
  toggleSidebar: () => void
  toggleSteps:   () => void
  toggleTaskPanel: () => void
}

export function usePanels(): PanelState {
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [stepsOpen,     setStepsOpen]     = useState(true)
  const [taskPanelOpen, setTaskPanelOpen] = useState(true)

  const toggleSidebar    = useCallback(() => setSidebarOpen(v => !v), [])
  const toggleSteps      = useCallback(() => setStepsOpen(v => !v),   [])
  const toggleTaskPanel  = useCallback(() => setTaskPanelOpen(v => !v), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'b') { e.preventDefault(); toggleSidebar() }
      if (e.key === '\\') { e.preventDefault(); toggleSteps() }
      if (e.key === 'j') { e.preventDefault(); toggleTaskPanel() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar, toggleSteps, toggleTaskPanel])

  return { sidebarOpen, stepsOpen, taskPanelOpen, toggleSidebar, toggleSteps, toggleTaskPanel }
}
