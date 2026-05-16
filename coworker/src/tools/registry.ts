// ============================================================
// Tool Registry
// Central catalog of every tool in the system.
// Agents look up tools by ID. New tools are registered here.
// ============================================================
import type { Tool } from '@/types'

const _registry = new Map<string, Tool>()

export function registerTool(tool: Tool): void {
  _registry.set(tool.id, tool)
}

export function getTool(id: string): Tool | undefined {
  return _registry.get(id)
}

export function getAllTools(): Tool[] {
  return Array.from(_registry.values())
}

export function getToolsByCategory(category: Tool['category']): Tool[] {
  return getAllTools().filter(t => t.category === category)
}

export function getToolsForAgent(allowedIds: string[]): Tool[] {
  return allowedIds.map(id => _registry.get(id)).filter(Boolean) as Tool[]
}

export function isToolRegistered(id: string): boolean {
  return _registry.has(id)
}
