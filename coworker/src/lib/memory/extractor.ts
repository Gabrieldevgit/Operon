// ============================================================
// Memory Auto-Extractor
// After each AI response, this scans for facts worth remembering:
// file paths, tech decisions, user preferences, agent patterns.
// Runs as a lightweight post-processing step, not a separate LLM call.
// ============================================================
import { memory_store } from './index'

export interface ExtractionResult {
  stored: number
  entries: Array<{ key: string; type: string; snippet: string }>
}

// ─── Pattern matchers ─────────────────────────────────────────

const PATTERNS = {
  // File paths mentioned in code discussions
  filePaths: /(?:src\/|app\/|components\/|lib\/|hooks\/|store\/|types\/|pages\/)\S+\.[a-z]+/g,

  // Tech stack decisions: "we'll use X for Y", "using X", "decided to use X"
  techDecision: /(?:we(?:'ll| will| are)?\s+use|using|decided to use|going with|prefer)\s+([A-Za-z][A-Za-z0-9_\-./]+)/gi,

  // "must/should/always/never…" — constraints (Bug 4: tightened min/max length)
  // Min 10 chars after keyword, max 60 — avoids "must be" (too short) and runaway sentences
  constraint: /(?:must|should|always|never|don't|do not)\s+\w.{10,60}(?=[.!?\n]|$)/gi,

  // Package names: @scope/package or package-name
  packages: /(?:npm install|yarn add|install)\s+([@\w\-./]+)/g,
}

// Bug 4: words that produce useless constraint memories
const CONSTRAINT_STOP_WORDS = new Set([
  'be', 'have', 'do', 'get', 'make', 'use', 'take', 'go', 'come', 'see',
  'know', 'think', 'look', 'want', 'give', 'say', 'tell', 'ask',
])

function isQualityConstraint(raw: string): boolean {
  const lower = raw.toLowerCase()
  // Must contain at least one meaningful noun/verb after the keyword
  const words = lower.split(/\s+/)
  const afterKeyword = words.slice(1)
  if (afterKeyword.length < 3) return false
  // Reject if the first content word is a stop word
  const firstContent = afterKeyword[0]?.replace(/[^a-z]/g, '')
  if (CONSTRAINT_STOP_WORDS.has(firstContent ?? '')) return false
  return true
}

// ─── Extract from a single agent response ────────────────────

export function extractFromResponse(
  text: string,
  context: {
    workspaceId: string
    agentId:     string
    taskId?:     string
  }
): ExtractionResult {
  const results: ExtractionResult['entries'] = []
  const { workspaceId, agentId } = context

  // 1. File paths — store as project context
  const filePaths = [...new Set(text.match(PATTERNS.filePaths) ?? [])]
  if (filePaths.length > 0) {
    const content = `Files referenced: ${filePaths.join(', ')}`
    memory_store({
      workspaceId,
      agentId,
      key:        `files:${Date.now()}`,
      content,
      type:       'project-context',
      scope:      'project',
      importance: 2,
      tags:       ['files', 'auto-extracted'],
      ttlMs:      7 * 24 * 60 * 60 * 1000, // 7 days
    })
    results.push({ key: 'files', type: 'project-context', snippet: content.slice(0, 80) })
  }

  // 2. Tech decisions (deduplicated by normalised text)
  const techMatches = [...text.matchAll(PATTERNS.techDecision)]
  const seenTech    = new Set<string>()
  techMatches.slice(0, 3).forEach((match, i) => {
    const snippet   = match[0].slice(0, 100)
    const key       = snippet.toLowerCase().replace(/\s+/g, ' ')
    if (seenTech.has(key)) return
    seenTech.add(key)
    memory_store({
      workspaceId,
      agentId,
      key:        `tech:${Date.now()}-${i}`,
      content:    snippet,
      type:       'project-context',
      scope:      'project',
      importance: 3,
      tags:       ['tech-decision', 'auto-extracted'],
    })
    results.push({ key: `tech-${i}`, type: 'project-context', snippet })
  })

  // 3. Constraints — quality-filtered (Bug 4 fix)
  //    Only store if they pass the isQualityConstraint check, and deduplicate by normalised text.
  const constraintMatches = [...(text.match(PATTERNS.constraint) ?? [])]
  const seenConstraints   = new Set<string>()
  constraintMatches.slice(0, 5).forEach((raw, i) => {
    if (!isQualityConstraint(raw)) return
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ')
    if (seenConstraints.has(normalized)) return
    seenConstraints.add(normalized)
    const snippet = raw.trim().slice(0, 100)
    memory_store({
      workspaceId,
      agentId,
      key:        `constraint:${Date.now()}-${i}`,
      content:    snippet,
      type:       'preference',
      scope:      'project',
      importance: 4,
      tags:       ['constraint', 'auto-extracted'],
    })
    results.push({ key: `constraint-${i}`, type: 'preference', snippet })
  })

  // 4. Package installs
  const pkgMatches = [...text.matchAll(PATTERNS.packages)]
  if (pkgMatches.length > 0) {
    const packages = pkgMatches.map(m => m[1]).join(', ')
    const content  = `Packages installed: ${packages}`
    memory_store({
      workspaceId,
      agentId,
      key:        `packages:${Date.now()}`,
      content,
      type:       'project-context',
      scope:      'project',
      importance: 3,
      tags:       ['packages', 'auto-extracted'],
    })
    results.push({ key: 'packages', type: 'project-context', snippet: content.slice(0, 80) })
  }

  return { stored: results.length, entries: results }
}

// ─── Build a context string for the system prompt ─────────────

import { memory_retrieve } from './index'

export function buildMemoryContext(
  workspaceId: string,
  agentId:     string,
  maxEntries = 10
): string {
  const result = memory_retrieve({
    workspaceId,
    agentId,
    scope:  'project',
    limit:  maxEntries,
  })

  if (result.entries.length === 0) return ''

  const lines = result.entries.map(e => `- [${e.type}] ${e.content.slice(0, 200)}`)
  return `\n\n## Project Memory\n${lines.join('\n')}`
}

// ─── Summarize memory stats ────────────────────────────────────

import { useMemoryStore } from '@/store/memory.store'

export function getMemoryStats(workspaceId: string) {
  const entries = Object.values(useMemoryStore.getState().entries).filter(
    e => e.workspaceId === workspaceId
  )

  const byType: Record<string, number> = {}
  const byScope: Record<string, number> = {}

  entries.forEach(e => {
    byType[e.type]   = (byType[e.type]   ?? 0) + 1
    byScope[e.scope] = (byScope[e.scope] ?? 0) + 1
  })

  return {
    total:   entries.length,
    byType,
    byScope,
    oldest:  entries.reduce((a, b) => (a.createdAt < b.createdAt ? a : b), entries[0]),
    newest:  entries.reduce((a, b) => (a.createdAt > b.createdAt ? a : b), entries[0]),
  }
}
