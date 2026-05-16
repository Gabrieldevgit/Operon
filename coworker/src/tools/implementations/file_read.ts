// ============================================================
// file_read — SAFE
// Reads a file relative to the configured project root.
// No approval needed. Never reads outside project root.
// ============================================================
import type { Tool, ToolExecutionContext, ToolResult } from '@/types'

export interface FileReadInput {
  path:      string   // relative to project root
  encoding?: 'utf-8' | 'base64'
  maxBytes?: number   // default 50KB
}

export interface FileReadOutput {
  content:   string
  path:      string
  sizeBytes: number
  language?: string
}

const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  json: 'json', css: 'css', html: 'html', md: 'markdown',
  py: 'python', sql: 'sql', sh: 'bash', yaml: 'yaml', yml: 'yaml',
}

export const fileReadTool: Tool = {
  id:              'file_read',
  name:            'Read File',
  description:     'Read the contents of a file in the project',
  category:        'file-system',
  risk:            'safe',
  defaultApproval: 'auto',
  inputSchema: {
    path:      { type: 'string',  required: true,  description: 'File path relative to project root' },
    maxBytes:  { type: 'number',  required: false, description: 'Max bytes to read (default 50000)' },
    encoding:  { type: 'string',  required: false, description: 'utf-8 (default) or base64' },
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult<FileReadOutput>> {
    // This runs server-side via the API route
    const start = Date.now()
    const { path, encoding = 'utf-8', maxBytes = 50000 } = input as FileReadInput

    // Server-side execution — dynamic import of fs
    const { readFile, stat } = await import('fs/promises')
    const { join, resolve } = await import('path')

    const projectRoot = process.env.PROJECT_ROOT ?? process.cwd()
    const fullPath    = resolve(join(projectRoot, path))

    // Security: ensure the path is within project root
    if (!fullPath.startsWith(resolve(projectRoot))) {
      return {
        success:    false,
        error:      'Access denied: path is outside project root',
        executedAt: Date.now(),
      }
    }

    const stats   = await stat(fullPath)
    const content = await readFile(fullPath, { encoding: encoding === 'base64' ? 'base64' : 'utf-8' })
    const ext     = path.split('.').pop() ?? ''

    return {
      success: true,
      output: {
        content:   content.slice(0, maxBytes),
        path,
        sizeBytes: stats.size,
        language:  EXTENSION_LANGUAGE[ext],
      },
      executedAt: Date.now(),
      durationMs: Date.now() - start,
    }
  },
}
