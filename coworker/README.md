# DTS Coworker

> AI Co-Worker Workspace — multi-agent development platform built by DTS.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5.x (strict) |
| Styling | Tailwind CSS 3.x + custom design tokens |
| Animation | Framer Motion 11.x |
| State | Zustand 4.x + Immer |
| Auth + DB | Supabase (Postgres + Auth) |
| Realtime | Firebase (Firestore + Realtime DB) |
| AI — Cloud | Groq (`llama3-70b`, `mixtral-8x7b`) |
| AI — Local | Ollama (any local model) |

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

> If you get a `404` for any `@radix-ui/react-badge` — remove that line from `package.json`, it doesn't exist on npm.

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project settings |
| `GROQ_API_KEY` | https://console.groq.com |
| `NEXT_PUBLIC_OLLAMA_BASE_URL` | `http://localhost:11434` (default) |

### 3. Run the database migration

In your Supabase project → SQL Editor, paste and run:

```
supabase/migrations/001_memory.sql
```

### 4. Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000** — it redirects to `/workspace`.

---

## Known issues + fixes applied

| Issue | Fix |
|---|---|
| `geist/font/sans` module not found | Replaced with `next/font/google` (Inter) — no extra install |
| `@radix-ui/react-badge` 404 on npm | Package doesn't exist — removed from `package.json` |
| `next.config.ts` not loading | Rename to `next.config.js` and convert to CommonJS (`module.exports`) |
| `AgentCard` accent bar invisible | Added `relative` + `top-1/2 -translate-y-1/2` to parent button |
| Inline `import('./agent')` in types | Converted to top-level `import type` statements |
| `useMemory` re-render loop | Removed Zustand selector issue (stable array reference) |
| Deprecated packages on install | Normal npm warnings — does not affect functionality |

---

## Config files

> **Important:** Next.js 14.2.5 supports `next.config.ts` but some environments require `.js`.
> If your dev server won't start, rename `next.config.ts` → `next.config.js` and replace:
> ```js
> // next.config.js
> /** @type {import('next').NextConfig} */
> const nextConfig = { /* ... */ }
> module.exports = nextConfig
> ```

`tailwind.config.ts` — works as-is (Tailwind uses `jiti` internally to process TS configs).

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── chat/route.ts       # SSE streaming endpoint
│   │   │   └── health/route.ts     # Provider availability check
│   │   └── tools/
│   │       └── execute/route.ts    # Tool execution endpoint
│   ├── workspace/page.tsx          # Main workspace page
│   ├── layout.tsx
│   └── globals.css
├── types/                          # Core TypeScript interfaces
│   ├── agent.ts                    # Agent, AgentRole, AgentStatus
│   ├── task.ts                     # Task, ChecklistItem
│   ├── tool.ts                     # Tool, ToolRisk, ApprovalRequest
│   ├── memory.ts                   # MemoryEntry, ActionSummary
│   ├── step.ts                     # AIStep, AgentThinkingPreview
│   └── workspace.ts                # Workspace, ChatMessage
├── store/                          # Zustand state stores
│   ├── workspace.store.ts
│   ├── agents.store.ts
│   ├── tasks.store.ts
│   ├── memory.store.ts
│   ├── steps.store.ts
│   └── approvals.store.ts
├── lib/
│   ├── ai/                         # AI provider layer (Phase 02)
│   │   ├── groq.ts                 # Groq adapter
│   │   ├── ollama.ts               # Ollama adapter
│   │   ├── router.ts               # Task → model routing
│   │   └── registry.ts             # Provider singletons + failover
│   ├── memory/                     # Memory system (Phase 03)
│   │   ├── index.ts                # memory_store, memory_retrieve, etc.
│   │   ├── persistence.ts          # Firestore sync
│   │   └── extractor.ts            # Auto-extraction from responses
│   ├── firebase/client.ts
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── agent-config.ts             # Agent colors, labels, icons
│   └── utils.ts
├── tools/                          # Tool system (Phase 04)
│   ├── registry.ts                 # Tool catalog
│   ├── executor.ts                 # Permission → approval → execute
│   ├── permissions.ts              # Risk / autonomy checks
│   ├── logger.ts                   # Emits to AI Steps feed
│   └── implementations/
│       ├── file_read.ts            # SAFE
│       ├── file_write.ts           # MEDIUM — asks user
│       ├── web_search.ts           # SAFE
│       ├── code_search.ts          # SAFE
│       └── terminal_run.ts         # HIGH — always asks
├── components/
│   ├── layout/
│   │   ├── WorkspaceLayout.tsx
│   │   ├── AgentSidebar.tsx
│   │   └── StepsPanel.tsx
│   ├── workspace/
│   │   ├── WorkspaceTabs.tsx
│   │   ├── ChatThread.tsx
│   │   ├── ChatInput.tsx
│   │   ├── TaskPanel.tsx
│   │   ├── MemoryPanel.tsx
│   │   └── StreamingBubble.tsx
│   ├── agents/
│   │   ├── AgentCard.tsx
│   │   ├── AgentAvatar.tsx
│   │   └── AgentStatusDot.tsx
│   ├── steps/StepItem.tsx
│   └── ui/ApprovalModal.tsx
├── hooks/
│   ├── usePanels.ts                # Panel collapse + keyboard shortcuts
│   ├── useAIStream.ts              # SSE streaming hook
│   ├── useChat.ts                  # Chat + memory integration
│   └── useMemory.ts                # Memory CRUD hook
└── lib/mock/seed.ts                # Mock data for development
```

---

## Build phases

| Phase | Focus | Status |
|---|---|---|
| 00 | Scaffold · Types · Stores · Firebase · Supabase | ✅ Done |
| 01 | Core UI Shell · Sidebar · Chat · Steps · Approval modal | ✅ Done |
| 02 | AI Provider Layer · Groq · Ollama · Streaming · Failover | ✅ Done |
| 03 | Memory System · Persistence · Auto-extraction · `useMemory` | ✅ Done |
| 04 | Tool System · Permissions · Executor · 5 built-in tools | ✅ Done |
| 05 | Agent System · Orchestrator · 3 worker agents | 🔜 Next |
| 06 | AI Steps · Observability · Thinking preview | ⬜ |
| 07 | Skills implementation (plan, create, review, debug…) | ⬜ |
| 08 | IDE-like features · Live diff · Project tree | ⬜ |
| 09 | Settings system · Control center | ⬜ |

---

## AI provider health check

```bash
curl http://localhost:3000/api/ai/health
# → { "providers": { "groq": true, "ollama": false }, "timestamp": ... }
```

## Ollama local setup (optional)

```bash
# Install: https://ollama.com
ollama serve
ollama pull llama3   # or any model you want
```

The Groq → Ollama failover is automatic. If Groq is unavailable, requests route to your local Ollama instance.
