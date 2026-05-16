// ============================================================
// file_write — MEDIUM risk
// Creates or overwrites a file. Requires user approval.
// Stores a backup before writing for rollback support.
// ============================================================
import type { Tool, ToolResult } from '@/types'

export interface FileWriteInput {
  path:     string   // relative to project root
  content:  string
  mode?:    'overwrite' | 'append' | 'create-only'
}

export interface FileWriteOutput {
  path:         string
  bytesWritten: number
  created:      boolean
  backupPath?:  string
}

export const fileWriteTool: Tool = {
  id:              'file_write',
  name:            'Write File',
  description:     'Create or update a file in the project',
  category:        'file-system',
  risk:            'medium',
  defaultApproval: 'ask',
  inputSchema: {
    path:    { type: 'string', required: true,  description: 'File path relative to project root' },
    content: { type: 'string', required: true,  description: 'File content to write' },
    mode:    { type: 'string', required: false, description: 'overwrite | append | create-only' },
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult<FileWriteOutput>> {
    const start = Date.now()
    const { path, content, mode = 'overwrite' } = input as FileWriteInput

    const fs        = await import('fs/promises')
    const nodePath  = await import('path')

    const projectRoot = process.env.PROJECT_ROOT ?? process.cwd()
    const fullPath    = nodePath.resolve(nodePath.join(projectRoot, path))

    // Security: must stay within project root
    if (!fullPath.startsWith(nodePath.resolve(projectRoot))) {
      return { success: false, error: 'Access denied: outside project root', executedAt: Date.now() }
    }

    // Check existence
    let existed  = false
    let backupPath: string | undefined

    try {
      await fs.access(fullPath)
      existed = true

      if (mode === 'create-only') {
        return { success: false, error: `File already exists: ${path}`, executedAt: Date.now() }
      }

      // Create a backup before overwriting
      backupPath = `${fullPath}.bak`
      await fs.copyFile(fullPath, backupPath)
    } catch {
      existed = false
    }

    // Ensure parent directory exists
    await fs.mkdir(nodePath.dirname(fullPath), { recursive: true })

    // Write the file
    if (mode === 'append' && existed) {
      await fs.appendFile(fullPath, content, 'utf-8')
    } else {
      await fs.writeFile(fullPath, content, 'utf-8')
    }

    return {
      success: true,
      output: {
        path,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
        created:      !existed,
        backupPath:   backupPath ? nodePath.relative(projectRoot, backupPath) : undefined,
      },
      executedAt: Date.now(),
      durationMs: Date.now() - start,
    }
  },
}
