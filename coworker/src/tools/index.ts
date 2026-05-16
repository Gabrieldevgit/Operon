// ============================================================
// Tools — barrel export + default registration
// Import this once (e.g. in layout or a provider) to register
// all built-in tools so the client executor can look them up.
// ============================================================
export { registerTool, getTool, getAllTools, getToolsByCategory, getToolsForAgent } from './registry'
export { executeTool }  from './executor'
export { createToolLogger } from './logger'
export { checkPermission }  from './permissions'

// Tool implementations (for direct import if needed)
export { fileReadTool }    from './implementations/file_read'
export { fileWriteTool }   from './implementations/file_write'
export { webSearchTool }   from './implementations/web_search'
export { codeSearchTool }  from './implementations/code_search'
export { terminalRunTool } from './implementations/terminal_run'

// ─── Default registration ─────────────────────────────────────
// Call this once in your app root (e.g. layout.tsx or a provider).

import { registerTool as _register } from './registry'
import { fileReadTool }    from './implementations/file_read'
import { fileWriteTool }   from './implementations/file_write'
import { webSearchTool }   from './implementations/web_search'
import { codeSearchTool }  from './implementations/code_search'
import { terminalRunTool } from './implementations/terminal_run'

let _registered = false

export function registerDefaultTools(): void {
  if (_registered) return
  _registered = true

  _register(fileReadTool)
  _register(fileWriteTool)
  _register(webSearchTool)
  _register(codeSearchTool)
  _register(terminalRunTool)

  console.log('[Tools] Registered 5 default tools')
}
