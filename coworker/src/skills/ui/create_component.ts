// ============================================================
// Skills: create_component + design_layout
// Assigned: UI Designer, Dev Agent
// ============================================================
import { registerSkill, type Skill } from '../types'
import { memory_store_project_context } from '@/lib/memory/memory'

// ─── create_component ─────────────────────────────────────────

interface CreateComponentParams {
  componentName:  string
  props?:         string[]
  styling?:       'tailwind' | 'css' | 'both'
  includeTests?:  boolean
  variants?:      string[]
  stateRequired?: string[]
  description:    string
}

const createComponentSkill: Skill<CreateComponentParams> = {
  id:          'create_component',
  name:        'Create Component',
  description: 'Generate a reusable React/Next.js component with proper types, styling, and minimal logic.',
  agentRoles:  ['ui-designer', 'frontend-dev'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const planId = agent['emitStep'](context, 'thinking',
      `Designing ${params.componentName} component`)

    const planPrompt = `Plan a React component: ${params.componentName}

Description: ${params.description}
${params.props?.length    ? `Props needed: ${params.props.join(', ')}` : ''}
${params.variants?.length ? `Variants: ${params.variants.join(', ')}` : ''}
${params.stateRequired?.length ? `State: ${params.stateRequired.join(', ')}` : ''}
Styling: ${params.styling ?? 'tailwind'}

Briefly outline (3 bullets max): component structure, key design decisions, Tailwind classes to use.`

    const plan = await agent['complete']([...messages, { role: 'user' as const, content: planPrompt }], context)
    agent['completeStep'](context, planId, true, plan.slice(0, 100))
    context.send({ type: 'thinking', agentId: agent.id, text: plan })

    const codeId = agent['emitStep'](context, 'file-write',
      `Writing ${params.componentName}.tsx`)

    const codePrompt = `Write the complete React component: ${params.componentName}

Design plan:
${plan}

Requirements:
- 'use client' directive (if interactive)
- Props interface named ${params.componentName}Props
- Named export: export function ${params.componentName}
- Tailwind CSS classes only (no inline styles unless for dynamic values)
- Framer Motion for animations if there are hover/enter states
- Use cn() from @/lib/utils for conditional classes
- Full accessibility: aria labels, keyboard navigation, focus rings
- TypeScript strict — no any types
${params.includeTests ? '- Add a basic Jest test file below the component' : ''}

Write production-ready code. Include all imports.`

    const code = await agent['stream']([...messages, { role: 'user' as const, content: codePrompt }], context)
    agent['completeStep'](context, codeId, true, 'Component written')

    memory_store_project_context(
      context.workspaceId,
      `component:${params.componentName}`,
      `Created component ${params.componentName}: ${params.description}`,
      ['component', params.componentName.toLowerCase()]
    )

    agent['saveActionSummary'](context, {
      taskTitle:   `Create ${params.componentName} component`,
      whatWasDone: `Wrote ${params.componentName} React component with TypeScript + Tailwind`,
      whyItWasDone: params.description,
      filesChanged: [`src/components/${params.componentName}.tsx`],
    })

    return { success: true, output: code, metadata: { componentName: params.componentName } }
  },
}

registerSkill(createComponentSkill)
export { createComponentSkill }

// ─── design_layout ────────────────────────────────────────────

interface DesignLayoutParams {
  description:   string
  breakpoints?:  string[]
  designSystem?: string
  pageType?:     'page' | 'section' | 'modal' | 'sidebar'
}

const designLayoutSkill: Skill<DesignLayoutParams> = {
  id:          'design_layout',
  name:        'Design Layout',
  description: 'Create a responsive page layout based on a description or wireframe.',
  agentRoles:  ['ui-designer'],
  risk:        'safe',

  async execute({ params, context, agent, messages }) {
    const planId = agent['emitStep'](context, 'thinking', 'Planning responsive layout')

    const prompt = `Design a responsive ${params.pageType ?? 'section'} layout.

Description: ${params.description}
${params.breakpoints?.length ? `Breakpoints: ${params.breakpoints.join(', ')}` : 'Breakpoints: mobile (375px), tablet (768px), desktop (1280px)'}
${params.designSystem ? `Design system: ${params.designSystem}` : 'Design system: dark futuristic (matching DTS Coworker theme)'}

Deliver:
1. The complete JSX layout with Tailwind grid/flex classes
2. Mobile-first responsive classes (sm:, md:, lg: prefixes)
3. Comments explaining each layout region
4. Any Framer Motion layout animations (AnimatePresence, layout prop)

Use CSS Grid for page-level layouts, Flexbox for component-level.
All spacing in Tailwind units (p-4, gap-6 etc). No arbitrary values unless necessary.`

    try {
      const layout = await agent['stream'](
        [...messages, { role: 'user' as const, content: prompt }], context
      )
      agent['completeStep'](context, planId, true, 'Layout designed')
      return { success: true, output: layout }
    } catch (err) {
      agent['failStep'](context, planId, String(err))
      return { success: false, output: '', error: String(err) }
    }
  },
}

registerSkill(designLayoutSkill)
export { designLayoutSkill }
