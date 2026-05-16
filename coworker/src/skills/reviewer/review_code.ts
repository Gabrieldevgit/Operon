// ============================================================
// Skills: review_code, detect_bugs, security_audit, debug_issue
// Assigned: Reviewer Agent
// ============================================================
import { registerSkill, type Skill } from '../types'

// ─── review_code ──────────────────────────────────────────────

interface ReviewCodeParams {
  code?:      string   // inline code to review
  filePath?:  string   // or a file path (Phase 08: will read via tool)
  focus?:     Array<'security' | 'performance' | 'types' | 'bugs' | 'style'>
}

const reviewCodeSkill: Skill<ReviewCodeParams> = {
  id:          'review_code',
  name:        'Review Code',
  description: 'Perform a thorough code review: logic, security, performance, and best practices.',
  agentRoles:  ['reviewer'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const scanId = agent['emitStep'](context, 'thinking', 'Scanning code for issues…')

    const focusAreas = params.focus?.join(', ') ?? 'security, bugs, performance, types, style'

    const prompt = `Perform a thorough code review focusing on: ${focusAreas}

${params.code ? `Code to review:\n\`\`\`\n${params.code}\n\`\`\`` : 'Review the code from our conversation above.'}

For each issue found, provide:
- **Severity**: critical | high | medium | low | info
- **Category**: security | bug | performance | types | style | accessibility
- **Location**: filename:line if known
- **Problem**: what is wrong
- **Fix**: exact code or clear instruction to fix it

Format as a structured markdown report. End with an overall score (0-100) and approved/changes-requested verdict.`

    try {
      const report = await agent['stream']([...messages, { role: 'user' as const, content: prompt }], context)
      agent['completeStep'](context, scanId, true, 'Review complete')
      return { success: true, output: report }
    } catch (err) {
      agent['failStep'](context, scanId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(reviewCodeSkill)
export { reviewCodeSkill }

// ─── detect_bugs ──────────────────────────────────────────────

interface DetectBugsParams {
  code?:       string
  errorLog?:   string
  language?:   string
}

const detectBugsSkill: Skill<DetectBugsParams> = {
  id:          'detect_bugs',
  name:        'Detect Bugs',
  description: 'Scan code for runtime errors, edge cases, and type mismatches.',
  agentRoles:  ['reviewer', 'frontend-dev'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'thinking', 'Scanning for bugs…')

    const prompt = `Find all bugs, runtime errors, and edge cases in the following code.

${params.code ? `\`\`\`${params.language ?? 'typescript'}\n${params.code}\n\`\`\`` : 'Use the code from the conversation above.'}
${params.errorLog ? `\nError log to diagnose:\n\`\`\`\n${params.errorLog}\n\`\`\`` : ''}

For each bug, provide:
1. **Bug**: describe what is wrong
2. **Why**: why it causes an error or incorrect behavior
3. **When**: under what conditions it triggers
4. **Fix**: the corrected code

Categories to check:
- Null/undefined access
- Async errors (missing await, unhandled rejections)
- Off-by-one errors
- React hook violations (deps array, conditional hooks)
- TypeScript type errors at runtime
- Memory leaks (listeners, intervals, subscriptions not cleaned up)
- Race conditions in state updates`

    try {
      const bugs = await agent['stream']([...messages, { role: 'user' as const, content: prompt }], context)
      agent['completeStep'](context, stepId, true, 'Bug scan complete')
      return { success: true, output: bugs }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(detectBugsSkill)
export { detectBugsSkill }

// ─── security_audit ───────────────────────────────────────────

interface SecurityAuditParams {
  scope:      'component' | 'api-route' | 'full-project' | 'specific'
  code?:      string
  focus?:     string
}

const securityAuditSkill: Skill<SecurityAuditParams> = {
  id:          'security_audit',
  name:        'Security Audit',
  description: 'Check for XSS, injection, hardcoded secrets, and insecure dependencies.',
  agentRoles:  ['reviewer'],
  risk:        'medium',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'thinking',
      `Security audit (${params.scope})…`, undefined, { risk: 'medium' })

    const prompt = `Perform a security audit on the ${params.scope}.

${params.code ? `\`\`\`\n${params.code}\n\`\`\`` : 'Audit the code discussed in the conversation.'}
${params.focus ? `Focus area: ${params.focus}` : ''}

Check for all of the following:

**Critical**
- XSS vulnerabilities (dangerouslySetInnerHTML, eval, document.write)
- SQL/NoSQL injection (Supabase RLS bypass, raw queries with user input)
- Path traversal (file tools accepting user-controlled paths)
- Hardcoded secrets, API keys, passwords in source

**High**
- Insecure API routes (missing authentication checks)
- CSRF vulnerabilities
- Exposed sensitive data in client-side bundles (NEXT_PUBLIC_ misuse)
- Command injection in terminal_run tool calls

**Medium**
- Missing input validation/sanitization
- Insecure dependencies (npm audit findings)
- Overly permissive CORS settings
- Missing rate limiting on API routes

Report each finding with: severity, location, description, and remediation steps.
End with a security score and a recommended action list.`

    try {
      const audit = await agent['stream']([...messages, { role: 'user' as const, content: prompt }], context)
      agent['completeStep'](context, stepId, true, 'Security audit complete')
      return { success: true, output: audit }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(securityAuditSkill)
export { securityAuditSkill }

// ─── debug_issue ──────────────────────────────────────────────

interface DebugIssueParams {
  errorReport:   string
  contextFiles?: string[]
  stackTrace?:   string
}

const debugIssueSkill: Skill<DebugIssueParams> = {
  id:          'debug_issue',
  name:        'Debug Issue',
  description: 'Given a bug description or error log, trace the root cause and suggest a fix.',
  agentRoles:  ['reviewer', 'frontend-dev'],
  risk:        'medium',

  async execute({ params, context, agent, messages }) {
    const stepId = agent['emitStep'](context, 'thinking', 'Tracing root cause…')

    const prompt = `Debug this issue and find the root cause.

**Error / Bug Report:**
${params.errorReport}

${params.stackTrace ? `**Stack Trace:**\n\`\`\`\n${params.stackTrace}\n\`\`\`` : ''}
${params.contextFiles?.length ? `**Related files:** ${params.contextFiles.join(', ')}` : ''}

Provide:
1. **Root Cause**: the exact reason this error occurs (be specific)
2. **Why it happens**: the chain of events leading to the bug
3. **Where to look**: file paths and line numbers (approximate if unsure)
4. **Fix**: the complete corrected code
5. **Prevention**: how to avoid this class of bug in the future

If you need more context, say what information would help you debug further.`

    try {
      const diagnosis = await agent['stream']([...messages, { role: 'user' as const, content: prompt }], context)
      agent['completeStep'](context, stepId, true, 'Root cause identified')
      return { success: true, output: diagnosis }
    } catch (err) {
      agent['failStep'](context, stepId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(debugIssueSkill)
export { debugIssueSkill }
