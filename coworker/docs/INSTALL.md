# DTS Coworker — Complete Installation Guide
### Phase 00–05 Checkpoint Edition

> This document is auto-versioned. The next checkpoint edition is published at Phase 10.

---

## Table of contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Testing each phase](#4-testing-each-phase)
5. [Known issues & fixes](#5-known-issues--fixes)
6. [Architecture reference](#6-architecture-reference)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Overview

DTS Coworker is a multi-agent AI development workspace. Four specialist agents — each with specific roles, tool access, and memory — collaborate in real time to help you build software.

**Stack at a glance**

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5.x (strict mode) |
| Styling | Tailwind CSS 3.x + custom design tokens |
| Animation | Framer Motion 11.x |
| State | Zustand 4.x + Immer middleware |
| Auth + DB | Supabase (Postgres + RLS) |
| Realtime | Firebase (Firestore + Realtime DB) |
| AI — Cloud | Groq (`llama3-70b`, `mixtral-8x7b`) |
| AI — Local | Ollama (any model, auto-fallback) |

**Build status**

| Phase | Focus | Status |
|---|---|---|
| 00 | Scaffold · Types · Stores · Firebase · Supabase | ✅ Complete |
| 01 | Core UI Shell · Sidebar · Chat · Steps Panel · Approval Modal | ✅ Complete |
| 02 | AI Provider Layer · Groq · Ollama · Streaming · Failover | ✅ Complete |
| 03 | Memory System · Firestore Persistence · Auto-extraction | ✅ Complete |
| 04 | Tool System · Permissions · 5 Built-in Tools | ✅ Complete |
| 05 | Agent System · Orchestrator · 3 Specialists · Delegation | ✅ Complete |
| 06 | AI Steps Observability · Thinking Preview | ✅ Complete |
| 07 | Skills Implementation · 8 Core Skills | ✅ Complete |
| 08 | IDE Features · Live Diff · Project Tree | ✅ Complete |
| 09 | Settings System · Control Center | ✅ Complete |

---

## 2. Prerequisites

### Node.js v18+ (v20+ recommended)

```bash
node --version   # must be ≥ 18.0.0
npm --version    # must be ≥ 9.x
```

> This project uses the native `fetch()` API and ESM syntax. Node v18 is the minimum. Node v24 (used during development) works perfectly.

### External services

All services have a **free tier** that is sufficient for development.

#### Supabase — Database + Auth

1. Create a free account at https://supabase.com
2. Click **New project** → name it (e.g. `dts-coworker`) → choose a region → set a DB password
3. Wait ~2 minutes for provisioning
4. Go to **Settings → API** — copy the **Project URL** and **anon public** key

#### Firebase — Realtime + Firestore

1. Go to https://console.firebase.google.com → **Add project** → name it → disable Analytics → Create
2. Click the **web icon** `</>` → register a web app → copy the `firebaseConfig` object
3. **Build → Firestore Database** → Create database → **Start in test mode** → choose region
4. **Build → Realtime Database** → Create database → **Start in test mode**

#### Groq — Cloud AI

1. Create a free account at https://console.groq.com
2. Go to **API Keys** → Create API key → copy and save it

> Groq free tier: 30 req/min, 14,400 req/day. More than enough for development.

#### Ollama — Local AI (optional but recommended)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows — download installer from https://ollama.com

# Start the server
ollama serve

# Pull a model
ollama pull llama3
```

> If Ollama is not running, all AI requests automatically route to Groq. Ollama is purely optional.

---

## 3. Installation

### Step 1 — Get the project files

Download all phase zips (`phase-00` through `phase-05`) and extract them into the **same folder**. Each phase adds new files — they do not replace each other.

Your final root should contain:

```
coworker/
├── src/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js         ← must be .js (not .ts)
├── postcss.config.js
├── components.json
├── .env.local.example
├── .gitignore
├── README.md
└── supabase/
    └── migrations/
        └── 001_memory.sql
```

> **Important:** If your `next.config` is named `.ts`, rename it to `.js` and change the last line from `export default nextConfig` to `module.exports = nextConfig`.

### Step 2 — Remove the broken package

Open `package.json` and delete this line before running `npm install`:

```json
"@radix-ui/react-badge": "^1.0.0",
```

This package does not exist on npm and will cause a hard 404 error during install.

### Step 3 — Install dependencies

```bash
cd coworker
npm install
```

Expected: several hundred packages install with some deprecation warnings. These warnings are from transitive dependencies (`inflight`, `glob`, `rimraf` from Next.js/ESLint) and **do not affect functionality**.

### Step 4 — Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in every value:

```bash
# ── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ── Firebase ──────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── AI Providers ──────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key

# Ollama runs locally — no key needed
NEXT_PUBLIC_OLLAMA_BASE_URL=http://localhost:11434

# ── Optional: tool system project root ───────────────────────
# Absolute path to your project root (used by file_read, file_write tools)
# PROJECT_ROOT=/absolute/path/to/coworker

# ── App ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

> ⚠️ **Never commit `.env.local`** to version control. The `.gitignore` already excludes it.

### Step 5 — Run the Supabase migration

In your Supabase dashboard go to **SQL Editor** and paste + run the contents of:

```
supabase/migrations/001_memory.sql
```

This creates two tables with indexes and Row Level Security:
- `memory_entries` — persistent agent memory
- `task_history` — completed task summaries

### Step 6 — Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000** — it redirects automatically to `/workspace`.

**You should see:**
- Left sidebar with 4 agents: **Orion, Vela, Kael, Lyra** (all Idle)
- Center chat area ready for input
- Right **AI Steps** panel (empty until you send a message)
- No console errors in the browser

---

## 4. Testing Each Phase

### Phase 00 — Scaffold

```bash
npm run typecheck   # should complete with 0 errors
```

The dev server starts and `/workspace` loads without errors.

### Phase 01 — UI Shell

| Action | Expected |
|---|---|
| `⌘B` (or `Ctrl+B`) | Sidebar collapses/opens with animation |
| `⌘\` | AI Steps panel toggles |
| `⌘J` | Task panel toggles |
| Type `/` in chat | Slash command picker appears |
| Click `+` tab | New workspace tab opens |

### Phase 02 — AI Providers

```bash
# Check provider availability
curl http://localhost:3000/api/ai/health
# → {"providers":{"groq":true,"ollama":false},"timestamp":...}
```

Type a message in chat — you should see a **streaming response** from Orion with a blinking cursor.

### Phase 03 — Memory

After sending several messages mentioning file paths or technology names, the `MemoryPanel` component (if added to the layout) shows auto-extracted project context entries.

### Phase 04 — Tools

```bash
# Test the web_search tool
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolId": "web_search",
    "input": { "query": "Next.js 14 App Router" },
    "context": {
      "callingAgentId": "agent_orc",
      "callingAgentName": "Orion",
      "taskId": "test-01",
      "workspaceId": "ws_demo",
      "sessionId": "s1"
    }
  }'
```

Expected: JSON with `success: true` and search results.

### Phase 05 — Agents

Test each delegation path by sending these messages:

| Message | Expected behaviour |
|---|---|
| `"What is useCallback used for?"` | Orion answers directly (no delegation) |
| `"Build a dark tooltip component"` | Orion → Vela → streams full React code |
| `"Add a useLocalStorage hook"` | Orion → Kael → streams TypeScript implementation |
| `"Review this for bugs: [paste code]"` | Orion → Lyra → structured review with severity scores |

**Watch in real time:**
- AI Steps panel fills with step events as agents work
- Agent status dots in the sidebar animate: `idle → working → idle`
- Task panel populates when Orion delegates multi-step work

---

## 5. Known Issues & Fixes

All issues below have been identified and patched across the phase zips.

| Issue | Fix applied | Phase |
|---|---|---|
| `Module not found: geist/font/sans` | Replaced with `next/font/google` (Inter) | 01 |
| `@radix-ui/react-badge` 404 on npm | Removed from `package.json` | 00 |
| `next.config.ts` not loading in some environments | Rename to `.js`, use `module.exports` | 00 |
| AgentCard accent bar not visible | Added `relative` + `top-1/2 -translate-y-1/2` to parent | 03 |
| `ChevronRight` imported but unused in AgentSidebar | Removed unused import | 03 |
| Inline `import('./agent')` types in `workspace.ts` + `step.ts` | Converted to top-level `import type` | 04 |
| `useMemory` causing re-render loops | Fixed Zustand v4 selector pattern | 04 |
| `typeof MOCK_AGENTS[0][]` invalid TypeScript | Replaced with `Agent[]` | 03 |
| Deprecated npm packages on install | Transitive deps from Next.js/ESLint — informational only | N/A |

---

## 6. Architecture Reference

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/agents/orchestrate` | `POST` + SSE | Main agent entry point — multiplexed event stream |
| `/api/ai/chat` | `POST` + SSE | Direct AI streaming (bypasses agent layer) |
| `/api/ai/health` | `GET` | Provider availability check |
| `/api/tools/execute` | `POST` | Server-side tool execution |

### Agent system data flow

```
User types message
  ↓
handleSend() in workspace/page.tsx
  ↓
useAgentStream.send() → POST /api/agents/orchestrate
  ↓
OrchestratorAgent.process()
  ├── emits: agent_switch, step_start, thinking, step_update
  ├── if simple → streams answer directly
  └── if complex → creates tasks → delegates to workers
        ├── UIDesignerAgent.process()     (plan → stream code)
        ├── FrontendDevAgent.process()    (architect → search → implement)
        └── ReviewerAgent.process()       (scan → format report)
  ↓
Orchestrator synthesizes → streams final delta → done event
  ↓
Client: message → chat, steps → feed, agents → idle
```

### SSE event types (Phase 05 protocol)

| Event type | Payload | Effect on client |
|---|---|---|
| `delta` | `{ delta, agentId }` | Appends to streaming draft bubble |
| `step_start` | `{ tempId, step }` | Adds new step to AI Steps feed |
| `step_update` | `{ tempId, patch }` | Updates existing step (status, duration) |
| `task_created` | `{ task }` | Adds task to TaskPanel with checklist |
| `agent_switch` | `{ agentId, name, role }` | Updates active agent in sidebar + bubble |
| `thinking` | `{ agentId, text }` | Agent inner reasoning (displayed in steps) |
| `done` | `{ agentId }` | Commits draft → message, resets all statuses |
| `error` | `{ error }` | Shows error banner, resets streaming state |

### Memory scopes

| Scope | Persists to | Cleared when |
|---|---|---|
| `session` | Zustand only | Page refresh |
| `project` | Zustand + Firestore | Manual clear or `memory_clear_scope()` |
| `global` | Zustand + Firestore | Manual clear only |

---

## 7. Troubleshooting

### "Failed to compile" on startup

1. Check for `geist/font/sans` error → use Phase 01 `layout.tsx` with `next/font/google`
2. Check for `@radix-ui/react-badge` → remove from `package.json`, re-run `npm install`
3. Check `next.config.js` is `.js` not `.ts`

### AI Steps panel stays empty after sending a message

- Make sure you are using the Phase 05 `workspace/page.tsx` (uses `useAgentStream`)
- Check browser console for SSE parsing errors
- Verify the route returns `Content-Type: text/event-stream`

### Groq returns 401 Unauthorized

- Check `GROQ_API_KEY` in `.env.local` — no trailing spaces
- Restart `npm run dev` after editing `.env.local`
- Verify at https://console.groq.com that the key is active

### Firebase connection errors in console

- All six `NEXT_PUBLIC_FIREBASE_*` values must be set
- Firestore and Realtime Database must be created in **test mode**
- The project ID must match exactly

### Ollama not responding

```bash
# Test if Ollama is running
curl http://localhost:11434/api/tags

# If not running
ollama serve

# If no models
ollama pull llama3
```

### TypeScript errors after install

```bash
npm run typecheck
```

Common causes: missing return types on exported functions (strict mode), or a type file from an earlier phase zip overwriting a newer one. Re-extract the latest phase zips in order.

### Agents respond but no delegation happens

- Check the Groq response is returning valid JSON for the breakdown prompt
- Add `console.log` in `OrchestratorAgent.process()` to inspect the `plan` variable
- The fallback (`canHandleDirectly: true` when JSON parse fails) keeps things working but skips delegation

---

*DTS Coworker Installation Guide · Phase 00–05 Checkpoint · Next edition: Phase 10*
