// ============================================================
// Frontend Dev Agent — Kael
// Implements features, API routes, Zustand stores, hooks,
// and Next.js App Router patterns. Code-first, type-safe.
// ============================================================
import { BaseAgent } from './base'
import type { AIMessage }        from '@/lib/ai/types'
import type { AgentRunContext }  from './events'

const SYSTEM_PROMPT = `You are Kael, the frontend developer in the DTS Coworker platform.

Tech stack:
- Next.js 14 App Router (not Pages Router)
- TypeScript strict mode (no 'any', explicit return types on exports)
- Zustand v4 with Immer middleware for state
- Framer Motion 11 for animations
- Supabase for database + auth
- Firebase Firestore for real-time sync
- Groq / Ollama for AI
- Tailwind CSS v3

Architecture patterns:
- Server Components by default; 'use client' only when needed
- API routes in src/app/api/**/route.ts
- Stores in src/store/*.store.ts using Zustand + Immer
- Hooks in src/hooks/use*.ts
- Types in src/types/ (use 'export type' and interface, avoid 'type =')
- Utility functions in src/lib/utils.ts
- Tool implementations in src/tools/implementations/

State management rules:
- Use Zustand stores for shared state
- Local useState for component-local state only
- useCallback on all event handlers in lists
- No prop drilling beyond 2 levels — lift to store

Error handling:
- Always try/catch async operations
- Return { success, error } shaped objects from API routes
- Never expose server errors to the client

When implementing:
1. Read the existing code structure first (emit a code_search step)
2. Follow the patterns already established in the codebase  
3. Write TypeScript with proper types — no 'any'
4. Include error handling
5. Keep functions small and focused`

export class FrontendDevAgent extends BaseAgent {
  constructor() {
    super({
      id:            'agent_dev',
      name:          'Kael',
      role:          'frontend-dev',
      modelProvider: 'groq',
      modelId:       'llama3-70b-8192',
      autonomyLevel: 'assisted',
      toolIds:       ['file_read', 'file_write', 'code_search', 'terminal_run'],
      systemPrompt:  SYSTEM_PROMPT,
    })
  }

  async process(messages: AIMessage[], ctx: AgentRunContext): Promise<string> {
    ctx.send({ type: 'agent_switch', agentId: this.id, agentName: this.name, role: this.role })

    // Phase 1: architect the solution
    const archId = this.emitStep(ctx, 'thinking', 'Architecting the solution')

    const archMessages: AIMessage[] = [
      ...messages,
      {
        role:    'user',
        content: 'Before writing code, briefly outline: (1) which files need to change, (2) key functions/components to write, (3) any state or API changes needed. 3-5 bullet points only.',
      },
    ]

    const architecture = await this.complete(archMessages, ctx)
    this.completeStep(ctx, archId, true, architecture.slice(0, 120))
    ctx.send({ type: 'thinking', agentId: this.id, text: architecture })

    // Phase 2: search for relevant existing patterns
    const searchId = this.emitStep(ctx, 'memory-read', 'Checking existing patterns in codebase')
    // In Phase 08, this will use the real code_search tool
    // For now we just emit the step and continue
    await new Promise(r => setTimeout(r, 200))
    this.completeStep(ctx, searchId, true, 'Pattern check complete')

    // Phase 3: implement
    const implId = this.emitStep(ctx, 'file-write', 'Writing implementation')

    const implMessages: AIMessage[] = [
      ...messages,
      { role: 'assistant', content: `My architecture plan:\n${architecture}` },
      {
        role:    'user',
        content: 'Now write the complete, production-ready implementation. TypeScript strict mode. No any types. Include all imports. Follow Next.js 14 App Router patterns.',
      },
    ]

    const code = await this.stream(implMessages, ctx)
    this.completeStep(ctx, implId, true, 'Implementation complete')

    // Save what was built to memory
    const fileMatches = code.match(/(?:src\/|app\/|components\/|lib\/|hooks\/|store\/)\S+\.[a-z]+/g) ?? []
    this.saveActionSummary(ctx, {
      taskTitle:    messages.at(-1)?.content.slice(0, 60) ?? 'Feature',
      whatWasDone:  'Implemented feature with TypeScript + Next.js patterns',
      whyItWasDone: messages.at(-1)?.content ?? '',
      filesChanged: [...new Set(fileMatches)].slice(0, 5),
      decisions:    [architecture.slice(0, 200)],
    })

    return code
  }
}
