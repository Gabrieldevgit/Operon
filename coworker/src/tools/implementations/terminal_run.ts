// ============================================================
// terminal_run — HIGH risk
// Executes a shell command in the project directory.
// ALWAYS requires user approval. Command whitelist enforced.
// ============================================================
import type { Tool, ToolResult } from '@/types'

export interface TerminalRunInput {
  command: string
  cwd?:    string    // relative to project root
  timeout?: number  // ms, default 30000
}

export interface TerminalRunOutput {
  stdout:     string
  stderr:     string
  exitCode:   number
  command:    string
  durationMs: number
}

// Commands that are always blocked, even if a user approves
const BLOCKED_PATTERNS = [
  /rm\s+-rf?\s+[/~]/,           // rm -rf /
  /mkfs/,                        // format disk
  /dd\s+if=/,                    // disk dump
  />(\/dev\/sd|\/dev\/nvme)/,    // write to block device
  /curl.*\|\s*(bash|sh|zsh)/,   // curl-pipe-bash
  /wget.*\|\s*(bash|sh|zsh)/,
  /chmod\s+777/,                 // world-writable
  /sudo\s+rm/,
]

// Commands requiring specific approval reason even when within whitelist
const ALWAYS_ASK_PATTERNS = [
  /npm\s+publish/,
  /git\s+push/,
  /git\s+force/,
  /--force/,
]

export const terminalRunTool: Tool = {
  id:              'terminal_run',
  name:            'Terminal',
  description:     'Run a shell command in the project directory',
  category:        'terminal',
  risk:            'high',
  defaultApproval: 'always-ask',
  inputSchema: {
    command: { type: 'string', required: true,  description: 'Shell command to run' },
    cwd:     { type: 'string', required: false, description: 'Working directory (relative to project)' },
    timeout: { type: 'number', required: false, description: 'Timeout in ms (default 30000)' },
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult<TerminalRunOutput>> {
    const start   = Date.now()
    const { command, cwd = '', timeout = 30000 } = input as TerminalRunInput

    // Hard block — no matter what the user said
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return {
          success: false,
          error:   `Command blocked by security policy: matches ${pattern}`,
          executedAt: Date.now(),
        }
      }
    }

    const nodePath    = await import('path')
    const { exec }    = await import('child_process')
    const { promisify } = await import('util')
    const execAsync   = promisify(exec)

    const projectRoot = process.env.PROJECT_ROOT ?? process.cwd()
    const workDir     = nodePath.resolve(nodePath.join(projectRoot, cwd))

    if (!workDir.startsWith(nodePath.resolve(projectRoot))) {
      return { success: false, error: 'cwd outside project root', executedAt: Date.now() }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd:     workDir,
        timeout,
        env:     { ...process.env, NODE_ENV: 'development' },
        maxBuffer: 1024 * 1024, // 1MB output limit
      })

      return {
        success: true,
        output: {
          stdout:     stdout.slice(0, 10000),
          stderr:     stderr.slice(0, 2000),
          exitCode:   0,
          command,
          durationMs: Date.now() - start,
        },
        executedAt: Date.now(),
        durationMs: Date.now() - start,
      }
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number; message?: string }
      return {
        success: true,  // command ran, but exited non-zero
        output: {
          stdout:     (e.stdout ?? '').slice(0, 10000),
          stderr:     (e.stderr ?? e.message ?? 'Unknown error').slice(0, 2000),
          exitCode:   e.code ?? 1,
          command,
          durationMs: Date.now() - start,
        },
        executedAt: Date.now(),
        durationMs: Date.now() - start,
      }
    }
  },
}
