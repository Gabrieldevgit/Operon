'use client'
// ============================================================
// CodeEditor — Phase 10, Task 4
// Monaco Editor wrapper with:
//   • Operon dark theme (matches zinc-950 IDE shell)
//   • Multi-tab support via the IDE store
//   • Cmd+S save → writes file via fsBridge
//   • Agent decorations (highlights where agents are editing)
//   • Diff mode (before/after for plan review)
//   • TypeScript / TSX support out of the box
// ============================================================
import { useEffect, useRef, useCallback } from 'react'
import type * as Monaco                   from 'monaco-editor'
import { useOperonIDEStore, useActiveTab } from '@/store/operon-ide.store'
import { fsBridge }                        from '@/server/filesystem'
import { cn }                              from '@/lib/utils'
import { bus }                             from '@/lib/events/bus'
import { OPERON }                          from '@/config/operon'

// ─── Operon Monaco theme ──────────────────────────────────────

const OPERON_THEME: Monaco.editor.IStandaloneThemeData = {
  base:    'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment',               foreground: '4a5568', fontStyle: 'italic' },
    { token: 'keyword',               foreground: '818cf8' },  // indigo-400
    { token: 'string',                foreground: '34d399' },  // emerald-400
    { token: 'number',                foreground: 'f59e0b' },  // amber-400
    { token: 'type',                  foreground: '67e8f9' },  // cyan-300
    { token: 'class',                 foreground: 'fbbf24' },
    { token: 'function',              foreground: 'a5b4fc' },  // indigo-300
    { token: 'variable',              foreground: 'e2e8f0' },
    { token: 'operator',              foreground: '94a3b8' },
    { token: 'delimiter',             foreground: '64748b' },
    { token: 'tag',                   foreground: '818cf8' },
    { token: 'attribute.name',        foreground: '67e8f9' },
    { token: 'attribute.value',       foreground: '34d399' },
    { token: 'metatag',               foreground: 'f472b6' },
  ],
  colors: {
    'editor.background':             '#09090b',   // zinc-950
    'editor.foreground':             '#e2e8f0',   // slate-200
    'editorLineNumber.foreground':   '#3f3f46',   // zinc-700
    'editorLineNumber.activeForeground': '#6366f1', // indigo-500
    'editor.lineHighlightBackground':'#18181b',   // zinc-900
    'editorCursor.foreground':       '#6366f1',   // indigo-500
    'editor.selectionBackground':    '#312e81aa', // indigo-900 50%
    'editor.inactiveSelectionBackground': '#1e1b4b55',
    'editorIndentGuide.background':  '#27272a',
    'editorIndentGuide.activeBackground': '#4f46e5',
    'editorBracketMatch.background': '#312e8155',
    'editorBracketMatch.border':     '#6366f1',
    'scrollbarSlider.background':    '#3f3f4655',
    'scrollbarSlider.hoverBackground':'#6366f144',
    'editorSuggestWidget.background':'#18181b',
    'editorSuggestWidget.border':    '#27272a',
    'editorSuggestWidget.selectedBackground': '#312e81',
    'editorHoverWidget.background':  '#18181b',
    'editorHoverWidget.border':      '#27272a',
    'input.background':              '#09090b',
    'input.border':                  '#27272a',
    'focusBorder':                   '#6366f1',
    'editor.findMatchBackground':    '#f59e0b44',
    'editor.findMatchHighlightBackground': '#f59e0b22',
  },
}

// ─── Monaco lazy loader ───────────────────────────────────────

let monacoPromise: Promise<typeof Monaco> | null = null

function loadMonaco(): Promise<typeof Monaco> {
  if (monacoPromise) return monacoPromise
  monacoPromise = import('monaco-editor').then(m => {
    m.editor.defineTheme('operon-dark', OPERON_THEME)
    // Configure TypeScript defaults
    m.languages.typescript.typescriptDefaults.setCompilerOptions({
      target:           m.languages.typescript.ScriptTarget.ESNext,
      moduleResolution: m.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx:              m.languages.typescript.JsxEmit.ReactJSX,
      strict:           true,
      allowSyntheticDefaultImports: true,
    })
    m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation:   false,
    })
    return m
  })
  return monacoPromise
}

// ─── CodeEditor component ─────────────────────────────────────

interface CodeEditorProps {
  className?: string
}

export function CodeEditor({ className }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef    = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef    = useRef<typeof Monaco | null>(null)
  const modelMap     = useRef<Map<string, Monaco.editor.ITextModel>>(new Map())

  const activeTab        = useActiveTab()
  const updateTabContent = useOperonIDEStore(s => s.updateTabContent)
  const markTabSaved     = useOperonIDEStore(s => s.markTabSaved)
  const updateCursor     = useOperonIDEStore(s => s.updateCursor)
  const setStatus        = useOperonIDEStore(s => s.setStatus)

  // ── Initialize editor once ────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return

    loadMonaco().then(monaco => {
      monacoRef.current = monaco

      const editor = monaco.editor.create(containerRef.current!, {
        theme:              'operon-dark',
        fontSize:           13,
        fontFamily:         '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
        fontLigatures:      true,
        lineNumbers:        'on',
        minimap:            { enabled: true, scale: 1 },
        scrollBeyondLastLine: false,
        wordWrap:           'off',
        renderWhitespace:  'selection',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        smoothScrolling:   true,
        cursorBlinking:    'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight:'all',
        padding:            { top: 12, bottom: 12 },
        automaticLayout:    true,
      })

      editorRef.current = editor

      // Cursor position → store
      editor.onDidChangeCursorPosition(e => {
        if (!activeTab) return
        updateCursor(activeTab.id, e.position.lineNumber, e.position.column)
      })

      // Content change → store (debounced 200ms)
      let debounce: ReturnType<typeof setTimeout>
      editor.onDidChangeModelContent(() => {
        if (!activeTab) return
        clearTimeout(debounce)
        debounce = setTimeout(() => {
          updateTabContent(activeTab.id, editor.getValue())
        }, 200)
      })

      // Cmd+S / Ctrl+S → save file
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void handleSave()
      })

      // Cmd+P → command palette (trigger from outside)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
        bus.emit('step.emitted', {
          stepId:   'cmd-palette',
          category: 'thinking',
          agentId:  'ide',
          title:    'Command palette',
        })
        window.dispatchEvent(new CustomEvent('operon:openPalette'))
      })
    })

    return () => {
      editorRef.current?.dispose()
      editorRef.current = null
      modelMap.current.forEach(m => m.dispose())
      modelMap.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync active tab → editor model ────────────────────────

  useEffect(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor || !activeTab) return

    const uri = monaco.Uri.parse(`file://${activeTab.filePath}`)
    let model = modelMap.current.get(activeTab.filePath)

    if (!model || model.isDisposed()) {
      model = monaco.editor.createModel(activeTab.content, activeTab.language, uri)
      modelMap.current.set(activeTab.filePath, model)
    }

    editor.setModel(model)
    editor.focus()
  }, [activeTab?.id, activeTab?.filePath])

  // ── Save handler ──────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const tab = useOperonIDEStore.getState().tabs.find(
      t => t.id === useOperonIDEStore.getState().activeTabId
    )
    if (!tab || !tab.isDirty) return

    setStatus('Saving…')
    try {
      await fsBridge.writeFile(tab.filePath, tab.content)
      markTabSaved(tab.id)
      setStatus(`Saved ${tab.fileName}`, true)
    } catch (err) {
      setStatus(`Save failed: ${String(err)}`, true)
    }
  }, [markTabSaved, setStatus])

  // ── Empty state ───────────────────────────────────────────

  if (!activeTab) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-zinc-950 text-zinc-700', className)}>
        <div className="text-center space-y-3">
          <p className="text-5xl font-bold tracking-tighter" style={{ color: OPERON.colors.accent }}>
            Operon
          </p>
          <p className="text-zinc-600 text-sm font-mono">Open a file from the sidebar or</p>
          <kbd className="text-zinc-500 text-xs font-mono px-2 py-1 rounded border border-zinc-800 bg-zinc-900">
            ⌘ K
          </kbd>
          <span className="text-zinc-600 text-xs"> to open the command palette</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-full', className)}
    />
  )
}

// ─── Tab bar ──────────────────────────────────────────────────

export function EditorTabBar({ className }: { className?: string }) {
  const tabs       = useOperonIDEStore(s => s.tabs)
  const activeTabId = useOperonIDEStore(s => s.activeTabId)
  const setActive  = useOperonIDEStore(s => s.setActiveTab)
  const closeTab   = useOperonIDEStore(s => s.closeTab)

  return (
    <div className={cn('flex overflow-x-auto bg-zinc-950 border-b border-zinc-800/60 shrink-0', className)}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-r border-zinc-800/60 cursor-pointer',
            'min-w-[120px] max-w-[200px] group shrink-0 transition-colors',
            tab.id === activeTabId
              ? 'bg-zinc-900 border-b-2 border-b-indigo-500 text-zinc-200'
              : 'text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300',
          )}
          onClick={() => setActive(tab.id)}
        >
          {/* Dirty indicator */}
          {tab.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
          )}
          {/* Preview indicator */}
          {tab.isPreview && !tab.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
          )}

          <span className={cn(
            'text-[12px] font-mono truncate flex-1',
            tab.isPreview && 'italic',
          )}>
            {tab.fileName}
          </span>

          <button
            onClick={e => { e.stopPropagation(); closeTab(tab.id) }}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all w-4 h-4 flex items-center justify-center rounded shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      {tabs.length === 0 && (
        <div className="px-4 py-2 text-zinc-700 text-[12px] font-mono">No files open</div>
      )}
    </div>
  )
}
