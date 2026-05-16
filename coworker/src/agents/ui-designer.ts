// ============================================================
// UI Designer Agent — Vela
// Specializes in React components, Tailwind, Framer Motion,
// shadcn/ui, responsive layouts, and the design system.
// ============================================================
import { BaseAgent } from './base'
import type { AIMessage }        from '@/lib/ai/types'
import type { AgentRunContext }  from './events'

const SYSTEM_PROMPT = `You are Vela, the UI/UX designer in the DTS Coworker platform.

Specialties:
- React 18 + Next.js 14 App Router component patterns
- Tailwind CSS v3 (utility-first, no custom CSS unless necessary)
- Framer Motion animations (spring physics, layout animations, presence)
- shadcn/ui component library
- Design systems: tokens, variants, accessibility
- Dark-mode-first: the project uses a dark futuristic aesthetic

Design system context:
- Background: hsl(220,13%,7%) to hsl(220,13%,15%)
- Accent: indigo/violet (#7C6FE0 range)
- Agent colors: orchestrator=#7C6FE0, ui=#34D399, dev=#60A5FA, reviewer=#F59E0B
- Font: Inter (sans), monospace for code/labels
- Borders: 1px solid rgba(255,255,255,0.07)
- Use Framer Motion for: enter/exit animations, hover states, layout shifts

Code standards:
- Always 'use client' directive for interactive components
- TypeScript: define Props interface above component
- Named exports only (no default exports for components)
- Use cn() utility from @/lib/utils for conditional classes
- Prefer Tailwind over inline styles; use inline styles only for dynamic values
- All components must be accessible (aria labels, keyboard nav, focus rings)

When given a design task:
1. Think about the component structure first (emit a thinking step)  
2. Write the full, working component code
3. Include all imports
4. Show hover/focus/active states
5. Make it responsive`

export class UIDesignerAgent extends BaseAgent {
  constructor() {
    super({
      id:            'agent_ui',
      name:          'Vela',
      role:          'ui-designer',
      modelProvider: 'groq',
      modelId:       'llama3-70b-8192',
      autonomyLevel: 'semi-auto',
      toolIds:       ['file_read', 'file_write', 'code_search'],
      systemPrompt:  SYSTEM_PROMPT,
    })
  }

  async process(messages: AIMessage[], ctx: AgentRunContext): Promise<string> {
    ctx.send({ type: 'agent_switch', agentId: this.id, agentName: this.name, role: this.role })

    // Phase 1: think about the design approach
    const planId = this.emitStep(ctx, 'thinking', 'Planning component architecture')

    const planMessages: AIMessage[] = [
      ...messages,
      {
        role:    'user',
        content: 'Before writing code, briefly describe: (1) component structure, (2) key visual decisions, (3) any design system tokens you will use. Keep it to 3 bullet points.',
      },
    ]

    const plan = await this.complete(planMessages, ctx)
    this.completeStep(ctx, planId, true, plan.slice(0, 120))

    ctx.send({ type: 'thinking', agentId: this.id, text: plan })

    // Phase 2: write the actual component
    const codeId = this.emitStep(ctx, 'file-write', 'Writing component code')

    const codeMessages: AIMessage[] = [
      ...messages,
      {
        role:    'assistant',
        content: `My design plan:\n${plan}`,
      },
      {
        role:    'user',
        content: 'Now write the full, production-ready component code. Include all imports, the Props interface, and the complete JSX. Use Tailwind and Framer Motion.',
      },
    ]

    const code = await this.stream(codeMessages, ctx)
    this.completeStep(ctx, codeId, true, 'Component written')

    // Save to memory
    this.saveActionSummary(ctx, {
      taskTitle:   messages.at(-1)?.content.slice(0, 60) ?? 'UI component',
      whatWasDone: 'Designed and wrote a React component',
      whyItWasDone: messages.at(-1)?.content ?? '',
      decisions:   [plan.slice(0, 200)],
    })

    return code
  }
}
