// ============================================================
// Operon IDE Store — Phase 10, Task 8
// State for the IDE shell: tabs, layout, terminals, recent files.
// Separate from the agent stores — this is pure IDE chrome state.
// ============================================================
import { create }  from 'zustand'
import { immer }   from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { nanoid }  from 'nanoid'
import { OPERON, resolveLanguage } from '@/config/operon'

// ─── Editor tab ───────────────────────────────────────────────

export interface EditorTab {
  id:         string
  filePath:   string
  fileName:   string
  language:   string
  content:    string
  isDirty:    boolean
  isPreview:  boolean   // single-click preview tab (replaces on next open)
  scrollTop:  number
  cursorLine: number
  cursorCol:  number
}

// ─── Terminal session ─────────────────────────────────────────

export interface TerminalSession {
  id:     string
  title:  string
  cwd:    string
  pid?:   number
  isActive: boolean
}

// ─── Panel layout ─────────────────────────────────────────────

export interface PanelLayout {
  // Sidebar (left)
  sidebarVisible:    boolean
  sidebarWidth:      number   // px

  // Bottom panel (terminal / output)
  bottomVisible:     boolean
  bottomHeight:      number   // px

  // Right panel (Operon agents / AI Steps)
  rightVisible:      boolean
  rightWidth:        number   // px

  // Active bottom tab
  bottomTab:         'terminal' | 'output' | 'problems' | 'steps'

  // Active right tab
  rightTab:          'agents' | 'steps' | 'memory' | 'diff'
}

// ─── State ───────────────────────────────────────────────────

interface OperonIDEState {
  // Project
  workspaceRoot:    string
  projectName:      string
  recentFiles:      string[]

  // Editor
  tabs:             EditorTab[]
  activeTabId:      string | null

  // Terminals
  terminals:        TerminalSession[]
  activeTermId:     string | null

  // Layout
  layout:           PanelLayout

  // Status bar
  statusMessage:    string
  isLoading:        boolean

  // Actions — project
  openWorkspace:    (rootPath: string) => void

  // Actions — tabs
  openTab:          (filePath: string, content: string, preview?: boolean) => string
  closeTab:         (tabId: string) => void
  closeOtherTabs:   (tabId: string) => void
  setActiveTab:     (tabId: string) => void
  updateTabContent: (tabId: string, content: string) => void
  markTabSaved:     (tabId: string) => void
  updateCursor:     (tabId: string, line: number, col: number) => void
  getTabByPath:     (filePath: string) => EditorTab | undefined

  // Actions — terminals
  createTerminal:   (cwd?: string, title?: string) => string
  closeTerminal:    (termId: string) => void
  setActiveTerminal:(termId: string) => void
  updateTerminalCwd:(termId: string, cwd: string) => void

  // Actions — layout
  setLayout:        (patch: Partial<PanelLayout>) => void
  toggleSidebar:    () => void
  toggleBottom:     () => void
  toggleRight:      () => void
  setBottomTab:     (tab: PanelLayout['bottomTab']) => void
  setRightTab:      (tab: PanelLayout['rightTab']) => void

  // Actions — status
  setStatus:        (msg: string, clear?: boolean) => void
  setLoading:       (v: boolean) => void
}

// ─── Defaults ─────────────────────────────────────────────────

const DEFAULT_LAYOUT: PanelLayout = {
  sidebarVisible: true,
  sidebarWidth:   240,
  bottomVisible:  true,
  bottomHeight:   240,
  rightVisible:   true,
  rightWidth:     320,
  bottomTab:      'terminal',
  rightTab:       'agents',
}

// ─── Store ───────────────────────────────────────────────────

export const useOperonIDEStore = create<OperonIDEState>()(
  persist(
    immer((set, get) => ({
      workspaceRoot:  '',
      projectName:    'Operon',
      recentFiles:    [],
      tabs:           [],
      activeTabId:    null,
      terminals:      [],
      activeTermId:   null,
      layout:         DEFAULT_LAYOUT,
      statusMessage:  '',
      isLoading:      false,

      // ── Project ────────────────────────────────────────────

      openWorkspace(rootPath) {
        const name = rootPath.split('/').pop() ?? rootPath
        set(s => {
          s.workspaceRoot = rootPath
          s.projectName   = name
        })
        // Update title bar via Electron IPC
        if (IS_ELECTRON) window.operon.window.setTitle(name)
      },

      // ── Tabs ───────────────────────────────────────────────

      openTab(filePath, content, preview = false) {
        const existing = get().tabs.find(t => t.filePath === filePath)

        // If already open, just activate it
        if (existing) {
          set(s => {
            s.activeTabId = existing.id
            // If the existing tab was a preview, make it permanent
            if (preview === false) {
              const t = s.tabs.find(t => t.id === existing.id)
              if (t) t.isPreview = false
            }
          })
          return existing.id
        }

        // If a preview tab exists, replace it
        const previewTab = get().tabs.find(t => t.isPreview)
        const id = previewTab?.id ?? nanoid()
        const tab: EditorTab = {
          id,
          filePath,
          fileName:   filePath.split('/').pop() ?? filePath,
          language:   resolveLanguage(filePath),
          content,
          isDirty:    false,
          isPreview:  preview,
          scrollTop:  0,
          cursorLine: 1,
          cursorCol:  1,
        }

        set(s => {
          if (previewTab) {
            const idx = s.tabs.findIndex(t => t.id === previewTab.id)
            if (idx !== -1) s.tabs[idx] = tab
          } else {
            s.tabs.push(tab)
          }
          s.activeTabId = id

          // Track recent files (cap at 20)
          s.recentFiles = [filePath, ...s.recentFiles.filter(f => f !== filePath)].slice(0, 20)
        })

        return id
      },

      closeTab(tabId) {
        set(s => {
          const idx = s.tabs.findIndex(t => t.id === tabId)
          if (idx === -1) return
          s.tabs.splice(idx, 1)

          // Pick new active tab
          if (s.activeTabId === tabId) {
            s.activeTabId = s.tabs[Math.max(0, idx - 1)]?.id ?? null
          }
        })
      },

      closeOtherTabs(tabId) {
        set(s => {
          s.tabs       = s.tabs.filter(t => t.id === tabId)
          s.activeTabId = tabId
        })
      },

      setActiveTab(tabId) {
        set(s => { s.activeTabId = tabId })
      },

      updateTabContent(tabId, content) {
        set(s => {
          const tab = s.tabs.find(t => t.id === tabId)
          if (!tab) return
          tab.content  = content
          tab.isDirty  = true
          tab.isPreview = false
        })
      },

      markTabSaved(tabId) {
        set(s => {
          const tab = s.tabs.find(t => t.id === tabId)
          if (tab) tab.isDirty = false
        })
      },

      updateCursor(tabId, line, col) {
        set(s => {
          const tab = s.tabs.find(t => t.id === tabId)
          if (!tab) return
          tab.cursorLine = line
          tab.cursorCol  = col
        })
      },

      getTabByPath(filePath) {
        return get().tabs.find(t => t.filePath === filePath)
      },

      // ── Terminals ─────────────────────────────────────────

      createTerminal(cwd, title) {
        const id: string    = nanoid()
        const rootCwd = cwd ?? get().workspaceRoot || process.env.HOME || '/'
        const session: TerminalSession = {
          id,
          title:    title ?? `zsh — ${rootCwd.split('/').pop()}`,
          cwd:      rootCwd,
          isActive: true,
        }

        set(s => {
          s.terminals.forEach(t => { t.isActive = false })
          s.terminals.push(session)
          s.activeTermId   = id
          s.layout.bottomVisible = true
          s.layout.bottomTab     = 'terminal'
        })

        return id
      },

      closeTerminal(termId) {
        set(s => {
          const idx = s.terminals.findIndex(t => t.id === termId)
          if (idx === -1) return
          s.terminals.splice(idx, 1)
          if (s.activeTermId === termId) {
            s.activeTermId = s.terminals.at(-1)?.id ?? null
          }
        })
      },

      setActiveTerminal(termId) {
        set(s => {
          s.terminals.forEach(t => { t.isActive = t.id === termId })
          s.activeTermId = termId
        })
      },

      updateTerminalCwd(termId, cwd) {
        set(s => {
          const t = s.terminals.find(t => t.id === termId)
          if (t) t.cwd = cwd
        })
      },

      // ── Layout ────────────────────────────────────────────

      setLayout(patch) {
        set(s => { Object.assign(s.layout, patch) })
      },

      toggleSidebar() {
        set(s => { s.layout.sidebarVisible = !s.layout.sidebarVisible })
      },

      toggleBottom() {
        set(s => { s.layout.bottomVisible = !s.layout.bottomVisible })
      },

      toggleRight() {
        set(s => { s.layout.rightVisible = !s.layout.rightVisible })
      },

      setBottomTab(tab) {
        set(s => {
          s.layout.bottomTab     = tab
          s.layout.bottomVisible = true
        })
      },

      setRightTab(tab) {
        set(s => {
          s.layout.rightTab     = tab
          s.layout.rightVisible = true
        })
      },

      // ── Status ────────────────────────────────────────────

      setStatus(msg, clear = false) {
        set(s => { s.statusMessage = msg })
        if (clear) setTimeout(() => set(s => { s.statusMessage = '' }), 3000)
      },

      setLoading(v) {
        set(s => { s.isLoading = v })
      },
    })),
    {
      name:        OPERON.storageKeys.layout,
      version:     1,
      partialize:  s => ({
        workspaceRoot: s.workspaceRoot,
        projectName:   s.projectName,
        recentFiles:   s.recentFiles,
        layout:        s.layout,
        // Don't persist tab content — reloaded from disk on open
        tabs:          s.tabs.map(t => ({ ...t, content: '' })),
      }),
    }
  )
)

// ─── Convenience ─────────────────────────────────────────────

import { IS_ELECTRON } from '@/config/operon'

export function useActiveTab(): EditorTab | null {
  return useOperonIDEStore(s =>
    s.activeTabId ? s.tabs.find(t => t.id === s.activeTabId) ?? null : null
  )
}

export function useDirtyCount(): number {
  return useOperonIDEStore(s => s.tabs.filter(t => t.isDirty).length)
}
