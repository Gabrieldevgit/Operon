# Operon IDE — Complete Installation Guide
### Full Build · Phases 00–10 · All Files Included

> **Previously called "DTS Coworker".** The project was renamed to **Operon** at Phase 10.
> This document reflects the complete build including the desktop IDE, all bug fixes, and all phases.

---

## Table of Contents

1. [Overview](#1-overview)
2. [What's in this ZIP](#2-whats-in-this-zip)
3. [Prerequisites](#3-prerequisites)
4. [Installation — Web App](#4-installation--web-app)
5. [Installation — Operon Desktop IDE (Electron)](#5-installation--operon-desktop-ide-electron)
6. [Environment variables](#6-environment-variables)
7. [Database setup](#7-database-setup)
8. [Testing each phase](#8-testing-each-phase)
9. [Architecture reference](#9-architecture-reference)
10. [Known issues & fixes applied](#10-known-issues--fixes-applied)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

**Operon** is a multi-agent AI development platform and desktop IDE. Four specialist agents — each with their own role, tool access, memory scope, and autonomy level — collaborate in real time to help you build software. The desktop IDE (Phase 10) gives Operon full access to your file system, terminal, and editor via Electron + Monaco + xterm.js.

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.5 (App Router) |
| Desktop | Electron 29 + node-pty |
| Language | TypeScript 5.x (strict mode) |
| Editor | Monaco Editor 0.47 (VS Code engine) |
| Terminal | xterm.js 5.4 + FitAddon |
| Styling | Tailwind CSS 3.x + custom design tokens |
| Animation | Framer Motion 11.x |
| State | Zustand 4.x + Immer middleware |
| Auth + DB | Supabase (Postgres + RLS) |
| Realtime | Firebase (Firestore — agent memory) |
| AI — Cloud | Groq, Gemini, OpenRouter (configurable) |
| AI — Local | Ollama (auto-fallback) |
| Events | Internal EventBus (typed pub/sub) |
| Sync | SyncEngine (BroadcastChannel + adapters) |

### Build status

| Phase | Focus | Status |
|---|---|---|
| 00 | Scaffold · Types · Stores · Firebase · Supabase | ✅ Complete |
| 01 | Core UI Shell · Sidebar · Chat · Steps Panel · Approval Modal | ✅ Complete |
| 02 | AI Provider Layer · Groq · Ollama · Streaming · Failover | ✅ Complete |
| 03 | Memory System · Firestore Persistence · Auto-extraction | ✅ Complete |
| 04 | Tool System · Permissions · 5 Built-in Tools | ✅ Complete |
| 05 | Agent System · Orchestrator · 3 Specialists · Delegation | ✅ Complete |
| 06 | AI Steps Observability · Thinking Preview | ✅ Complete |
| 07 | Skills System · 8 Core Skills per Agent | ✅ Complete |
| Bug fixes | EventBus · Memory perf · Regex dedup · Firebase/Supabase clarity | ✅ Applied |
| 08 | IDE Features · Live Diff · Plan→Approve→Execute · Conflict Detection | ✅ Complete |
| 09 | Settings System · Control Center · 8 Panels | ✅ Complete |
| 10 | **Operon IDE** · Electron · Monaco · xterm.js · Command Palette | ✅ Complete |
| **Final** | Bug diagnosis & fixes | ✅ Complete |

---

## 2. What's in this ZIP

This is the **complete project** — every file from every phase, merged and up to date. You do not need any previous zips.

```
operon/
├── electron/
│   ├── main.ts                     ← Electron main process (Phase 10)
│   └── preload.ts                  ← Secure context bridge (Phase 10)
├── src/
│   ├── agents/                     ← Agent implementations (Phase 05)
│   │   ├── base.ts
│   │   ├── events.ts
│   │   ├── frontend-dev.ts
│   │   ├── orchestrator.ts
│   │   ├── reviewer.ts
│   │   └── ui-designer.ts
│   ├── app/                        ← Next.js App Router
│   │   ├── api/
│   │   │   ├── agents/orchestrate/route.ts
│   │   │   ├── ai/chat/route.ts
│   │   │   ├── ai/health/route.ts
│   │   │   └── tools/execute/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── workspace/page.tsx
│   ├── components/
│   │   ├── agents/                 ← Agent avatar, card, status (Phase 01)
│   │   ├── ide/                    ← DiffViewer, PlanCard, ProjectTree (Phase 08)
│   │   ├── layout/                 ← Sidebar, Steps panel, Workspace layout
│   │   ├── operon-ide/             ← Full IDE shell (Phase 10)
│   │   │   ├── CodeEditor.tsx      ← Monaco editor
│   │   │   ├── CommandPalette.tsx  ← Cmd+K palette
│   │   │   ├── OperonIDE.tsx       ← IDE shell layout
│   │   │   └── TerminalPanel.tsx   ← xterm.js terminal
│   │   ├── settings/               ← Settings modal + 4 panel files (Phase 09)
│   │   ├── steps/                  ← AI Steps feed (Phase 06)
│   │   ├── ui/                     ← Approval modal
│   │   └── workspace/              ← Chat, tasks, memory (Phase 01–03)
│   ├── config/
│   │   └── operon.ts               ← Brand config, IPC channels, language map (Phase 10)
│   ├── hooks/                      ← useAIStream, useAgentStream, useChat, etc.
│   ├── lib/
│   │   ├── ai/                     ← Provider router, Groq, Ollama (Phase 02)
│   │   ├── events/
│   │   │   └── bus.ts              ← Central EventBus — Bug fix #5
│   │   ├── firebase/               ← Firebase client
│   │   ├── ide/                    ← Plan executor, sandbox, conflict detector, sync (Phase 08)
│   │   ├── memory/                 ← Extractor, persistence (Firestore + Supabase) (Phase 03)
│   │   ├── mock/                   ← Seed data
│   │   └── supabase/               ← Supabase client + server
│   ├── providers/
│   │   └── WorkspaceProvider.tsx
│   ├── server/
│   │   └── filesystem.ts           ← Electron↔Browser filesystem bridge (Phase 10)
│   ├── skills/                     ← Agent skills (Phase 07)
│   ├── store/                      ← All Zustand stores
│   │   ├── agents.store.ts
│   │   ├── approvals.store.ts
│   │   ├── ide.store.ts            ← Shared project state (Phase 08)
│   │   ├── memory.store.ts         ← Bug fix #3 (memoized selector)
│   │   ├── operon-ide.store.ts     ← IDE tabs, terminals, layout (Phase 10)
│   │   ├── settings.store.ts       ← Full settings state (Phase 09)
│   │   ├── steps.store.ts          ← Bug fix #5 (EventBus wired)
│   │   ├── tasks.store.ts
│   │   └── workspace.store.ts
│   ├── tools/                      ← Tool registry, executor, 5 implementations (Phase 04)
│   └── types/                      ← Shared TypeScript types
├── supabase/
│   └── migrations/
│       ├── 001_memory.sql          ← Memory tables + RLS
│       └── 002_conversations.sql   ← Conversation archive table
├── .env.local.example
├── .gitignore
├── components.json
├── electron-builder.config.js      ← Desktop build config (Phase 10)
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Prerequisites

### Node.js

```bash
node --version   # must be ≥ 18.0.0  (v20 LTS recommended)
npm --version    # must be ≥ 9.x
```

### For the Desktop IDE only

```bash
# node-gyp (required to build native node-pty)
# macOS
xcode-select --install

# Ubuntu / Debian
sudo apt install build-essential python3

# Windows
npm install -g windows-build-tools
```

### External services

All services have a **free tier** sufficient for development.

#### Supabase — Database + Auth

1. Create a free account at https://supabase.com
2. **New project** → name it (e.g. `operon`) → set a DB password
3. Wait ~2 minutes for provisioning
4. **Settings → API** — copy the **Project URL** and **anon public** key
5. Also copy the **service_role** key (used server-side only)

#### Firebase — Realtime agent memory (Firestore)

> Operon uses Firebase exclusively for **realtime agent memory** (project + global scope).
> Long-term conversation history and analytics go to Supabase. Never write the same data to both.

1. https://console.firebase.google.com → **Add project** → disable Analytics
2. Click `</>` web icon → register app → copy the `firebaseConfig` object
3. **Build → Firestore Database** → Create → **Start in test mode** → pick region
4. **Build → Realtime Database** → Create → **Start in test mode**

#### Groq — Cloud AI (primary)

1. https://console.groq.com → **API Keys** → Create → copy key
2. Free tier: 30 req/min, 14,400 req/day — more than enough for development

#### Gemini — Cloud AI (optional, used by Orchestrator by default)

1. https://aistudio.google.com/app/apikey → Create API key → copy it

#### Ollama — Local AI (optional but recommended)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start server
ollama serve

# Pull a model
ollama pull llama3
```

> If Ollama is not running, AI requests fall back to Groq automatically.

---

## 4. Installation — Web App

### Step 1 — Extract the ZIP

Extract `operon-complete.zip` to a folder. All files are already merged — no phase ordering needed.

```
operon/
├── src/
├── electron/
├── package.json
...
```

### Step 2 — Install dependencies

```bash
cd operon
npm install
```

> **Expected:** several hundred packages with some deprecation warnings from Next.js transitive deps. These are informational only and do not affect functionality.

### Step 3 — Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` — see [Section 6](#6-environment-variables) for the complete reference.

### Step 4 — Run Supabase migrations

In the Supabase dashboard → **SQL Editor**, run both files in order:

```
supabase/migrations/001_memory.sql
supabase/migrations/002_conversations.sql
```

### Step 5 — Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000** → auto-redirects to `/workspace`.

**You should see:**
- Left sidebar with 4 agents: **Orion, Vela, Kael, Lyra** (all Idle)
- Center chat area ready for input
- Right **AI Steps** panel (fills when you send a message)
- No red errors in the browser console

---

## 5. Installation — Operon Desktop IDE (Electron)

### Step 1 — Compile the Electron main process

```bash
# Install TypeScript compiler if you don't have it
npm install -g typescript

# Compile electron/main.ts and electron/preload.ts
npx tsc -p electron/tsconfig.json
```

Create `electron/tsconfig.json` if it doesn't exist:

```json
{
  "compilerOptions": {
    "target":            "ES2020",
    "module":            "CommonJS",
    "outDir":            "../electron-dist",
    "rootDir":           ".",
    "strict":            true,
    "esModuleInterop":   true,
    "skipLibCheck":      true
  },
  "include": ["*.ts"]
}
```

### Step 2 — Install native dependencies

```bash
npm install electron node-pty @xterm/xterm @xterm/addon-fit @xterm/addon-web-links monaco-editor concurrently wait-on
```

> **node-pty** requires native compilation. If it fails, ensure `xcode-select --install` (macOS) or `build-essential` (Linux) is installed.

### Step 3 — Run in development mode

```bash
# Terminal 1 — Next.js dev server (renderer)
npm run dev

# Terminal 2 — Electron (waits for Next.js to be ready)
npx wait-on http://localhost:3000 && npx electron electron-dist/main.js
```

Or use the combined script after adding it to `package.json`:

```json
"scripts": {
  "electron:dev": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron electron-dist/main.js\""
}
```

Then:

```bash
npm run electron:dev
```

### Step 4 — Build for distribution

```bash
# Export Next.js as static files
npm run build

# Build Electron app (macOS DMG, Windows NSIS, Linux AppImage)
npx electron-builder build
```

Output lands in `dist-electron/`.

> **macOS arm64 + x64 universal builds** are configured in `electron-builder.config.js`.
> Code signing requires an Apple Developer account. For local testing, skip signing by setting:
> ```bash
> export CSC_IDENTITY_AUTO_DISCOVERY=false
> ```

---

## 6. Environment Variables

Full `.env.local` reference:

```bash
# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Firebase (Firestore = realtime agent memory) ───────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:abc123

# ── AI Providers ──────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...           # Optional — used by Orchestrator
OPENROUTER_API_KEY=sk-or-...     # Optional — fallback provider

# ── Ollama (local AI — no key needed) ─────────────────────────────────────────
NEXT_PUBLIC_OLLAMA_BASE_URL=http://localhost:11434

# ── App ───────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ── Tool system (optional) ────────────────────────────────────────────────────
# Absolute path used by file_read / file_write tools
# PROJECT_ROOT=/absolute/path/to/your/project
```

> ⚠️ **Never commit `.env.local`** to version control. It's already in `.gitignore`.
> API keys in the Settings UI (Phase 09) are stored in localStorage with the `apiKey` field
> stripped before serialisation — they are runtime-only.

---

## 7. Database Setup

### Supabase migrations

Run in order in the **SQL Editor** (Supabase dashboard):

#### `001_memory.sql` — Agent memory tables

Creates:
- `memory_entries` — persistent agent memory with scope, type, importance, tags
- `task_history` — completed task records
- Indexes on `workspace_id`, `scope`, `type`, `importance`
- Row Level Security enabled

#### `002_conversations.sql` — Long-term conversation archive

Creates:
- `conversations` — full message history (role, content, timestamp)
- `memories_archive` — aged-out Firestore memories promoted to Supabase

**Storage rule:** Firestore holds **live agent memory** (hours → days). Supabase holds **permanent records** (conversations, analytics, aged memories). Never write the same entry to both.

### Firebase setup

After creating Firestore in test mode, add these **security rules** when you're ready for production:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{workspaceId}/memories/{memoryId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 8. Testing Each Phase

### Phase 00 — Scaffold

```bash
npm run typecheck   # 0 errors
```

### Phase 01 — UI Shell

| Action | Expected |
|---|---|
| `⌘B` | Sidebar collapses/opens |
| `⌘\` | AI Steps panel toggles |
| `⌘J` | Task panel toggles |
| Type `/` in chat | Slash command picker appears |

### Phase 02 — AI Providers

```bash
curl http://localhost:3000/api/ai/health
# → {"providers":{"groq":true,"ollama":false},...}
```

Send a chat message — you should see a **streaming response** with a blinking cursor.

### Phase 03 — Memory

After several messages mentioning file paths or tech names, the Memory Panel shows auto-extracted entries. The constraint regex now deduplicates and quality-filters results (Bug fix #4).

### Phase 04 — Tools

```bash
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
# → {"success":true,"result":{...}}
```

### Phase 05 — Agents

| Message | Expected |
|---|---|
| `"What is useCallback?"` | Orion answers directly |
| `"Build a dark tooltip component"` | Orion → Vela → React code |
| `"Add a useLocalStorage hook"` | Orion → Kael → TypeScript |
| `"Review this: [code]"` | Orion → Lyra → severity report |

Watch AI Steps fill in real time. Agent dots animate `idle → working → idle`.

### Phase 06 — AI Steps Observability

- AI Steps feed shows thinking previews before responses
- Collapsible thought lines appear in chat (ThinkingLayer component)
- Step replay timeline is accessible in the Steps panel

### Phase 07 — Skills

Agents now use structured skills with `execute(input, context)`. Each skill logs to AI Steps, retrieves memory context, and saves a summary on completion.

### Bug fixes applied (between 07 and 08)

| Bug | Verify |
|---|---|
| EventBus missing | `import { bus } from '@/lib/events/bus'` resolves ✓ |
| Memory rerenders | Use `useWorkspaceMemories(workspaceId)` hook instead of `Object.values(s.entries)` |
| Constraint regex noise | Constraints now require ≥3 meaningful words and pass stop-word check |
| Supabase/Firebase clarity | See `persistence.ts` and `persistence-supabase.ts` headers |

### Phase 08 — IDE Features

- Open the workspace and look for the **Plan card** when an agent proposes an action
- The **DiffViewer** appears in the right panel (Diff tab) showing before/after hunks
- The **ProjectTree** sidebar shows file locks when agents edit files
- Check `useIDEStore.getState().plans` for pending plan records

### Phase 09 — Settings

- Click **⚙ Settings** in the top bar (or use `SettingsButton` component)
- All 8 panels are navigable: General, AI Behavior, Agents, Tools, Memory, AI Steps, Integrations, Security
- Settings auto-save to `localStorage` under `operon:ide-layout`
- API keys are stripped from localStorage serialisation

### Phase 10 — Operon IDE (Desktop)

```bash
npm run electron:dev
```

**Expected:**
- Operon IDE window opens (1440×900, zinc-950 background)
- Monaco editor loads with the Operon dark theme (indigo cursor, emerald strings)
- Terminal panel shows Operon ASCII art + spawns a real shell
- `⌘K` opens the command palette (file search, `>` actions, `@` agents)
- File tree loads the workspace root
- Cmd+S saves the active file to disk via `node-pty` IPC

---

## 9. Architecture Reference

### Data flow — agent request

```
User types message in chat / Operon IDE
  ↓
handleSend() → useAgentStream.send() → POST /api/agents/orchestrate
  ↓
OrchestratorAgent.process()
  ├── emits: agent_switch, step_start, thinking, step_update  →  EventBus
  ├── simple query → streams answer directly
  └── complex task → breaks down → delegates to worker agents
        ├── UIDesignerAgent.process()    (plan → stream JSX)
        ├── FrontendDevAgent.process()   (architect → search → implement)
        └── ReviewerAgent.process()      (scan → severity report)
  ↓
Orchestrator synthesizes → streams final delta → done event
  ↓
Client:
  message   → ChatThread
  steps     → AI Steps feed (via EventBus subscribers)
  memory    → auto-extracted → Zustand + Firestore
  agents    → back to idle
```

### EventBus — typed pub/sub (Bug fix #5)

All cross-system communication goes through `bus` from `@/lib/events/bus`.
No direct store-to-store calls. Every agent action, tool execution, and memory write emits an event.

```typescript
import { bus } from '@/lib/events/bus'

// Subscribe
const off = bus.on('task.completed', ({ taskId, agentId, result }) => { ... })

// Emit (done from stores/agents automatically)
bus.emit('tool.executed', { toolId, agentId, success: true, durationMs: 42 })

// React hook
useEvent('approval.pending', ({ requestId, risk }) => { ... })
```

### Storage layers

| Store | What lives here | Lifetime |
|---|---|---|
| **Zustand** | All in-memory state — tabs, steps, agent status, UI | Session |
| **localStorage** | IDE layout, settings (no secrets), recent files | Persistent |
| **Firestore** | Active agent memory (project + global scope) | Days → weeks |
| **Supabase** | Conversation history, task records, aged memories | Permanent |

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/agents/orchestrate` | POST + SSE | Main agent entry — multiplexed event stream |
| `/api/ai/chat` | POST + SSE | Direct AI streaming (bypasses agent layer) |
| `/api/ai/health` | GET | Provider availability check |
| `/api/tools/execute` | POST | Server-side tool execution |

### Electron IPC channels

| Channel | Direction | Purpose |
|---|---|---|
| `fs:readFile` | renderer → main | Read file from disk |
| `fs:writeFile` | renderer → main | Write file to disk |
| `fs:readDir` | renderer → main | List directory |
| `fs:watch` | renderer → main | Start file watcher |
| `fs:watchEvent` | main → renderer | File change notification |
| `term:create` | renderer → main | Spawn node-pty shell |
| `term:input` | renderer → main | Send keystrokes to shell |
| `term:output` | main → renderer | Stream shell output |
| `term:resize` | renderer → main | Resize pty |
| `shell:exec` | renderer → main | Run one-shot shell command |
| `win:maximize` | renderer → main | Maximize/unmaximize window |

### Plan → Approve → Execute loop (Phase 08)

```
Agent proposes action
  ↓
planExecutor.propose(request)     →  IDEStore.addPlan()  +  bus.emit('approval.pending')
  ↓
PlanCard rendered in UI           →  user sees intent, strategy, steps, risk, confidence
  ↓
User clicks Approve / Reject      →  IDEStore.approvePlan()  +  bus.emit('approval.resolved')
  ↓
planExecutor.execute()            →  steps run one-by-one through sandbox
  ↓
sandbox.writeFile()               →  writes to IDEStore + journal entry (rollback support)
  ↓
bus.emit('task.completed')        →  UI updates, Steps feed logs completion
```

---

## 10. Known Issues & Fixes Applied

All issues below are already patched in this ZIP.

| # | Issue | Fix | Phase |
|---|---|---|---|
| — | `Module not found: geist/font/sans` | Replaced with `next/font/google` (Inter) | 01 |
| — | `@radix-ui/react-badge` 404 on npm | Removed from `package.json` | 00 |
| — | `next.config.ts` not loading | Renamed to `.js`, use `module.exports` | 00 |
| — | AgentCard accent bar not visible | Added `relative` + `top-1/2 -translate-y-1/2` | 03 |
| — | `ChevronRight` unused import | Removed | 03 |
| — | Inline `import()` types in type files | Converted to top-level `import type` | 04 |
| — | `useMemory` causing re-render loops | Fixed Zustand v4 selector pattern | 04 |
| — | `typeof MOCK_AGENTS[0][]` invalid TS | Replaced with `Agent[]` | 03 |
| **#3** | `Object.values(s.entries)` rerender storms | Added `useWorkspaceMemories(wsId)` memoized hook | Bug fixes |
| **#4** | Constraint regex extracting junk memories | Tightened regex `{10,60}`, stop-word guard, deduplication | Bug fixes |
| **#5** | No central EventBus — stores calling each other directly | Created `src/lib/events/bus.ts`, wired into all stores | Bug fixes |
| **#6** | Firebase/Supabase responsibilities unclear | Documented clearly in `persistence.ts` + `persistence-supabase.ts` | Bug fixes |
| — | Type errors in `conflict-detector.ts` | Separated class and component exports | 08 |

---

## 11. Troubleshooting

### "Failed to compile" on startup

1. Check `next.config.js` is `.js` not `.ts`
2. Run `npm run typecheck` to see the specific error
3. Make sure all `@/lib/events/bus` imports resolve — the `bus.ts` file must be at `src/lib/events/bus.ts`

### Electron window doesn't open

```bash
# Check node-pty compiled correctly
node -e "require('node-pty')"
# If this errors, rebuild:
npm rebuild node-pty
```

Also confirm the preload compiled to `electron-dist/preload.js` and main to `electron-dist/main.js`.

### Monaco editor shows blank white screen

Monaco requires a loader configuration. Add this to `next.config.js`:

```js
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['monaco-editor'] = require.resolve('monaco-editor/esm/vs/editor/editor.main.js')
    return config
  }
}
```

Alternatively use the `@monaco-editor/react` wrapper which handles this automatically:

```bash
npm install @monaco-editor/react
```

Then replace the raw `monaco-editor` import in `CodeEditor.tsx` with `Editor` from `@monaco-editor/react`.

### Terminal shows "browser mode" message

The xterm.js `TerminalPanel` only connects to `node-pty` when running inside Electron (`IS_ELECTRON === true`). In the browser it falls back to local echo. Launch via `npm run electron:dev` for real terminal support.

### AI Steps panel stays empty

- Confirm you're using the Phase 06+ `workspace/page.tsx` (uses `useAgentStream`)
- Open browser DevTools → Network → filter `text/event-stream` — the SSE connection should be open
- Check the EventBus is wired: `steps.store.ts` must import `bus` from `@/lib/events/bus`

### Groq returns 401 Unauthorized

- Check `GROQ_API_KEY` in `.env.local` — no trailing spaces, no quotes
- Restart `npm run dev` after editing `.env.local`
- Verify at https://console.groq.com the key is active

### Firebase connection errors in console

- All six `NEXT_PUBLIC_FIREBASE_*` values must be set
- Firestore must be created in **test mode**
- Project ID must match exactly (case-sensitive)

### Settings not persisting

Settings use `localStorage` key `operon:settings`. Open DevTools → Application → Local Storage → verify the key exists. If it's missing, the store may be on a different key — check `OPERON.storageKeys.settings` in `src/config/operon.ts`.

### `Cannot find module '@/lib/events/bus'`

The EventBus file must be at `src/lib/events/bus.ts`. Create the `events/` folder if it doesn't exist and copy `bus.ts` into it. This was the core of Bug #5.

### Ollama not responding

```bash
# Check running
curl http://localhost:11434/api/tags

# Start if not running
ollama serve

# Pull a model if none exist
ollama pull llama3
```

### TypeScript errors after install

```bash
npm run typecheck
```

Common causes:
- Missing `@/lib/events/bus` — ensure the file exists
- `useWorkspaceMemories` not found — it's exported from `memory.store.ts` bottom
- `IS_ELECTRON` not found — import from `@/config/operon`

---

## Quick start (TL;DR)

```bash
# 1. Extract ZIP, enter folder
cd operon

# 2. Install
npm install

# 3. Configure
cp .env.local.example .env.local
# → Fill in Supabase, Firebase, Groq keys

# 4. Run Supabase migrations (in dashboard SQL editor)
# 001_memory.sql then 002_conversations.sql

# 5a. Web app
npm run dev
# → http://localhost:3000

# 5b. Desktop IDE
npx tsc -p electron/tsconfig.json
npm run electron:dev
# → Operon IDE window opens
```

---

*Operon IDE — Complete Installation Guide · Phases 00–10 · Final phase (bug diagnosis) coming next*
