// POST /api/tools/execute
// Server-side tool runner. Client sends toolId + input + context,
// this route runs the actual implementation and returns the result.
import { type NextRequest, NextResponse } from 'next/server'
import { fileReadTool }   from '@/tools/implementations/file_read'
import { fileWriteTool }  from '@/tools/implementations/file_write'
import { webSearchTool }  from '@/tools/implementations/web_search'
import { codeSearchTool } from '@/tools/implementations/code_search'
import { terminalRunTool } from '@/tools/implementations/terminal_run'
import type { Tool, ToolExecutionContext } from '@/types'

export const runtime = 'nodejs'

// Server-side tool registry (separate from client registry)
const SERVER_TOOLS: Record<string, Tool> = {
  file_read:    fileReadTool,
  file_write:   fileWriteTool,
  web_search:   webSearchTool,
  code_search:  codeSearchTool,
  terminal_run: terminalRunTool,
}

interface RequestBody {
  toolId:  string
  input:   Record<string, unknown>
  context: ToolExecutionContext
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { toolId, input, context } = body

  if (!toolId || !input || !context) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: toolId, input, context' },
      { status: 400 }
    )
  }

  const tool = SERVER_TOOLS[toolId]
  if (!tool) {
    return NextResponse.json(
      { success: false, error: `Unknown tool: ${toolId}` },
      { status: 404 }
    )
  }

  try {
    const result = await tool.execute(input, context)
    return NextResponse.json(result)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error, executedAt: Date.now() },
      { status: 500 }
    )
  }
}
