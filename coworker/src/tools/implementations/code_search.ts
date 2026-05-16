// ============================================================
// code_search — SAFE
// Searches files for symbols, patterns, or text.
// Uses ripgrep if available, falls back to Node.js glob+regex.
// ============================================================
import type { Tool, ToolResult } from '@/types'

export interface CodeSearchInput {
  query:      string          // text or regex pattern
  path?:      string          // directory to search (default: project root)
  fileGlob?:  string          // e.g. '**/*.ts' (default: all text files)
  isRegex?:   boolean
  maxResults?: number         // default 20
}

export interface CodeSearchMatch {
  file:    string
  line:    number
  col:     number
  text:    string             // the matching line
  context: string[]           // 1 line before + after
}

export interface CodeSearchOutput {
  query:   string
  matches: CodeSearchMatch[]
  total:   number
}

export const codeSearchTool: Tool = {
  id:              'code_search',
  name:            'Code Search',
  description:     'Search for symbols, patterns, or text in project files',
  category:        'code-editing',
  risk:            'safe',
  defaultApproval: 'auto',
  inputSchema: {
    query:      { type: 'string',  required: true },
    path:       { type: 'string',  required: false },
    fileGlob:   { type: 'string',  required: false },
    isRegex:    { type: 'boolean', required: false },
    maxResults: { type: 'number',  required: false },
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult<CodeSearchOutput>> {
    const start = Date.now()
    const { query, path: searchPath = '', fileGlob = '**/*.{ts,tsx,js,jsx,json,css,md}', isRegex = false, maxResults = 20 } = input as CodeSearchInput

    const nodePath    = await import('path')
    const { glob }    = await import('fs/promises')
    const fs          = await import('fs/promises')
    const projectRoot = process.env.PROJECT_ROOT ?? process.cwd()
    const searchDir   = nodePath.resolve(nodePath.join(projectRoot, searchPath))

    if (!searchDir.startsWith(nodePath.resolve(projectRoot))) {
      return { success: false, error: 'Search path outside project root', executedAt: Date.now() }
    }

    const pattern  = isRegex ? new RegExp(query, 'gi') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const matches: CodeSearchMatch[] = []

    // Walk files using glob
    try {
      const files = await Array.fromAsync(glob(fileGlob, { cwd: searchDir }))

      for (const relFile of files) {
        if (matches.length >= maxResults) break

        const fullFile = nodePath.join(searchDir, relFile)
        let content: string
        try {
          content = await fs.readFile(fullFile, 'utf-8')
        } catch {
          continue
        }

        const lines = content.split('\n')
        pattern.lastIndex = 0

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!
          if (pattern.test(line)) {
            matches.push({
              file:    nodePath.relative(projectRoot, fullFile),
              line:    i + 1,
              col:     line.search(pattern) + 1,
              text:    line.trim(),
              context: [
                lines[i - 1]?.trim() ?? '',
                lines[i + 1]?.trim() ?? '',
              ],
            })
            if (matches.length >= maxResults) break
          }
          pattern.lastIndex = 0
        }
      }
    } catch (err) {
      return { success: false, error: String(err), executedAt: Date.now() }
    }

    return {
      success: true,
      output:  { query, matches, total: matches.length },
      executedAt: Date.now(),
      durationMs: Date.now() - start,
    }
  },
}
