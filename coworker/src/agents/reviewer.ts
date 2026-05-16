// ============================================================
// Reviewer Agent — Lyra
// Performs code review, detects bugs, security issues,
// type violations, and performance problems.
// Critical — never auto-approves, always reports.
// ============================================================
import { BaseAgent } from './base'
import type { AIMessage }        from '@/lib/ai/types'
import type { AgentRunContext }  from './events'

interface ReviewIssue {
  severity:    'critical' | 'high' | 'medium' | 'low' | 'info'
  category:    'security' | 'bug' | 'performance' | 'types' | 'style' | 'accessibility'
  location?:   string   // e.g. "AgentCard.tsx:34"
  description: string
  suggestion:  string
}

interface ReviewReport {
  summary:    string
  score:      number       // 0-100
  issues:     ReviewIssue[]
  approved:   boolean
}

const SEVERITY_EMOJI: Record<ReviewIssue['severity'], string> = {
  critical: '🔴',
  high:     '🟠',
  medium:   '🟡',
  low:      '🔵',
  info:     '⚪',
}

const SYSTEM_PROMPT = `You are Lyra, the code reviewer in the DTS Coworker platform.

You perform rigorous code review with focus on:

SECURITY (critical priority):
- XSS vulnerabilities (dangerouslySetInnerHTML, eval, innerHTML)
- Injection attacks (SQL injection in Supabase queries, command injection in terminal_run)
- Hardcoded secrets, API keys, or passwords
- Insecure dependencies or deprecated packages
- Path traversal attacks (in file tools)
- Missing authentication checks on API routes

BUGS (high priority):
- Null/undefined dereferences
- Off-by-one errors in loops
- Async/await mistakes (missing await, unhandled rejections)
- Race conditions in state updates
- Memory leaks (unsubscribed listeners, uncleaned intervals)
- Incorrect dependency arrays in useEffect/useCallback/useMemo

TYPES (medium priority):
- TypeScript 'any' usage
- Missing return types on exported functions
- Type assertions (as any, as unknown as X) without justification
- Missing null checks

PERFORMANCE (medium priority):
- Missing React.memo, useMemo, useCallback where beneficial
- Expensive operations in render body
- Missing key props or unstable keys in lists
- Unnecessary re-renders

ACCESSIBILITY (medium priority):
- Missing aria labels on interactive elements
- Non-semantic HTML
- Missing keyboard navigation support

Output format: respond with a JSON review report, then a plain text summary.`

const REVIEW_FORMAT = `
Respond with a JSON block followed by a plain text summary:

\`\`\`json
{
  "summary": "one sentence overall assessment",
  "score": 0-100,
  "approved": true/false,
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "security|bug|performance|types|style|accessibility",
      "location": "filename:line (optional)",
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}
\`\`\`

Then write a 2-3 sentence plain English summary.`

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super({
      id:            'agent_rev',
      name:          'Lyra',
      role:          'reviewer',
      modelProvider: 'groq',
      modelId:       'mixtral-8x7b-32768',  // larger context for reviewing code
      autonomyLevel: 'semi-auto',
      toolIds:       ['file_read', 'code_search'],
      systemPrompt:  SYSTEM_PROMPT,
    })
  }

  async process(messages: AIMessage[], ctx: AgentRunContext): Promise<string> {
    ctx.send({ type: 'agent_switch', agentId: this.id, agentName: this.name, role: this.role })

    // Phase 1: scan
    const scanId = this.emitStep(ctx, 'thinking', 'Scanning for issues…')

    const reviewMessages: AIMessage[] = [
      ...messages,
      { role: 'user', content: `Please review the code above. ${REVIEW_FORMAT}` },
    ]

    const reviewText = await this.complete(reviewMessages, ctx)
    const report = this.extractJson<ReviewReport>(reviewText)

    this.completeStep(ctx, scanId, true,
      report ? `Score: ${report.score}/100 · ${report.issues.length} issue(s)` : 'Scan complete'
    )

    // Phase 2: format and stream the review
    const reportId = this.emitStep(ctx, 'result', 'Writing review report')

    let output: string

    if (report) {
      output = this.formatReport(report)
      // Stream it
      for (const chunk of this.chunkString(output, 40)) {
        ctx.send({ type: 'delta', delta: chunk, agentId: this.id })
        await new Promise(r => setTimeout(r, 10))
      }
    } else {
      // Fallback: stream raw response
      output = await this.stream(reviewMessages, ctx)
    }

    this.completeStep(ctx, reportId, true,
      report?.approved ? 'Approved ✓' : 'Changes requested'
    )

    // Memory: save review outcome
    this.saveActionSummary(ctx, {
      taskTitle:   'Code review',
      whatWasDone: `Reviewed code: score ${report?.score ?? '?'}/100, ${report?.issues.length ?? 0} issues`,
      whyItWasDone: 'Ensure code quality and catch bugs before they reach production',
      decisions:   report?.issues.slice(0, 2).map(i => `${i.severity}: ${i.description}`) ?? [],
    })

    ctx.send({ type: 'done', agentId: this.id })
    return output
  }

  private formatReport(report: ReviewReport): string {
    const lines: string[] = []

    // Header
    const badge  = report.approved ? '✅ Approved' : '🔄 Changes Requested'
    const score  = `${report.score}/100`
    lines.push(`### Review Report — ${badge} (${score})`)
    lines.push('')
    lines.push(report.summary)
    lines.push('')

    if (report.issues.length === 0) {
      lines.push('No issues found. Clean code! 🎉')
      return lines.join('\n')
    }

    // Group by severity
    const bySeverity = ['critical', 'high', 'medium', 'low', 'info'] as const
    for (const sev of bySeverity) {
      const issues = report.issues.filter(i => i.severity === sev)
      if (issues.length === 0) continue

      lines.push(`#### ${SEVERITY_EMOJI[sev]} ${sev.charAt(0).toUpperCase() + sev.slice(1)} (${issues.length})`)
      lines.push('')

      for (const issue of issues) {
        lines.push(`**${issue.category}** ${issue.location ? `\`${issue.location}\`` : ''}`)
        lines.push(`${issue.description}`)
        lines.push(`> Fix: ${issue.suggestion}`)
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  private *chunkString(str: string, size: number): Generator<string> {
    for (let i = 0; i < str.length; i += size) {
      yield str.slice(i, i + size)
    }
  }
}
