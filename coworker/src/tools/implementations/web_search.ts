// ============================================================
// web_search — SAFE
// Searches the web and returns structured results.
// Uses DuckDuckGo JSON API — no API key required.
// ============================================================
import type { Tool, ToolResult } from '@/types'

export interface WebSearchInput {
  query:   string
  limit?:  number   // default 5
}

export interface WebSearchResult {
  title:   string
  url:     string
  snippet: string
}

export interface WebSearchOutput {
  query:   string
  results: WebSearchResult[]
}

export const webSearchTool: Tool = {
  id:              'web_search',
  name:            'Web Search',
  description:     'Search the web for current information',
  category:        'external-api',
  risk:            'safe',
  defaultApproval: 'auto',
  inputSchema: {
    query: { type: 'string', required: true,  description: 'Search query' },
    limit: { type: 'number', required: false, description: 'Max results (default 5)' },
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult<WebSearchOutput>> {
    const start = Date.now()
    const { query, limit = 5 } = input as WebSearchInput

    // DuckDuckGo Instant Answer API
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`
    const res  = await fetch(url, { headers: { 'User-Agent': 'DTS-Coworker/1.0' } })

    if (!res.ok) {
      return { success: false, error: `Search API error: ${res.status}`, executedAt: Date.now() }
    }

    const data = await res.json() as {
      Abstract?:      string
      AbstractURL?:   string
      AbstractSource?: string
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
      Results?:       Array<{ Text?: string; FirstURL?: string }>
    }

    const results: WebSearchResult[] = []

    // Add abstract if present
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title:   data.AbstractSource ?? 'Result',
        url:     data.AbstractURL,
        snippet: data.Abstract,
      })
    }

    // Add related topics
    const topics = [...(data.Results ?? []), ...(data.RelatedTopics ?? [])]
    for (const topic of topics.slice(0, limit - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title:   topic.FirstURL.split('/').pop()?.replace(/-/g, ' ') ?? 'Result',
          url:     topic.FirstURL,
          snippet: topic.Text,
        })
      }
    }

    return {
      success: true,
      output:  { query, results: results.slice(0, limit) },
      executedAt: Date.now(),
      durationMs: Date.now() - start,
    }
  },
}
