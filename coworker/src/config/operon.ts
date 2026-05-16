// ============================================================
// Operon — Brand & Runtime Config
// Single source of truth. Replace every "Coworker" reference
// in the codebase with imports from here.
//
// Migration map:
//   'Coworker'          → OPERON.name
//   'coworker'          → OPERON.id
//   'coworker:settings' → OPERON.storageKeys.settings
//   'coworker:sync'     → OPERON.storageKeys.syncChannel
// ============================================================

export const OPERON = {
  // Identity
  name:        'Operon',
  fullName:    'Operon IDE',
  id:          'operon',
  version:     '1.0.0',
  description: 'AI-powered IDE where your co-workers live.',

  // Electron window
  window: {
    title:      'Operon IDE',
    minWidth:   1024,
    minHeight:  680,
    defaultWidth:  1440,
    defaultHeight: 900,
    icon:       'assets/operon-icon.png',
  },

  // Theme tokens
  colors: {
    accent:     '#6366f1',   // indigo-500
    accentDark: '#4f46e5',   // indigo-600
    cyan:       '#06b6d4',
    emerald:    '#10b981',
    surface:    '#09090b',   // zinc-950
    border:     '#27272a',   // zinc-800
  },

  // Zustand / localStorage keys (all migrated from "coworker:")
  storageKeys: {
    settings:    'operon:settings',
    workspace:   'operon:workspace',
    recentFiles: 'operon:recent-files',
    layout:      'operon:ide-layout',
    syncChannel: 'operon:sync',
  },

  // Electron IPC channel names
  ipc: {
    // File system
    FS_READ_FILE:    'fs:readFile',
    FS_WRITE_FILE:   'fs:writeFile',
    FS_READ_DIR:     'fs:readDir',
    FS_STAT:         'fs:stat',
    FS_DELETE:       'fs:delete',
    FS_RENAME:       'fs:rename',
    FS_WATCH:        'fs:watch',
    FS_UNWATCH:      'fs:unwatch',
    FS_WATCH_EVENT:  'fs:watchEvent',

    // Terminal (node-pty)
    TERM_CREATE:     'term:create',
    TERM_INPUT:      'term:input',
    TERM_RESIZE:     'term:resize',
    TERM_KILL:       'term:kill',
    TERM_OUTPUT:     'term:output',

    // Shell / OS
    SHELL_EXEC:      'shell:exec',
    SHELL_OPEN_DIR:  'shell:openDir',
    SHELL_WHICH:     'shell:which',

    // Window
    WIN_MAXIMIZE:    'win:maximize',
    WIN_MINIMIZE:    'win:minimize',
    WIN_CLOSE:       'win:close',
    WIN_FULLSCREEN:  'win:fullscreen',
    WIN_TITLE:       'win:setTitle',

    // App
    APP_VERSION:     'app:version',
    APP_READY:       'app:ready',
  },

  // Agent roles (previously "coworker" roles)
  agents: {
    orchestrator: { id: 'orchestrator', displayName: 'Orchestrator', color: '#6366f1' },
    dev:          { id: 'dev',          displayName: 'Dev Agent',    color: '#f59e0b' },
    ui:           { id: 'ui',           displayName: 'UI Agent',     color: '#06b6d4' },
    reviewer:     { id: 'reviewer',     displayName: 'Reviewer',     color: '#10b981' },
  },

  // Default file associations → Monaco language IDs
  languageMap: {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', jsonc: 'json', md: 'markdown', mdx: 'markdown',
    css: 'css', scss: 'scss', html: 'html', xml: 'xml',
    py: 'python', sh: 'shell', bash: 'shell', zsh: 'shell',
    sql: 'sql', yaml: 'yaml', yml: 'yaml', toml: 'ini',
    env: 'plaintext', gitignore: 'plaintext', lock: 'plaintext',
    rs: 'rust', go: 'go', java: 'java', c: 'c', cpp: 'cpp',
  } as Record<string, string>,
} as const

/** Resolve Monaco language from file path */
export function resolveLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return OPERON.languageMap[ext] ?? 'plaintext'
}

/** Check if the code is running inside Electron */
export const IS_ELECTRON =
  typeof window !== 'undefined' &&
  typeof (window as Window & { operon?: unknown }).operon !== 'undefined'
