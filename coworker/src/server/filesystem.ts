// ============================================================
// Operon Filesystem Bridge
// Unified file system API for the renderer.
//
// In Electron:  calls window.operon.fs.* (IPC → main process)
// In browser:   calls /api/operon/fs/* (Next.js API routes)
//
// All components import from THIS file — never call IPC directly.
// Swapping environments is transparent to UI code.
// ============================================================

import { IS_ELECTRON, resolveLanguage } from '@/config/operon'

// ─── Types ───────────────────────────────────────────────────

export interface FSEntry {
  name:      string
  path:      string
  isDir:     boolean
  isSymlink: boolean
  language?: string       // populated for files
  children?: FSEntry[]    // populated when expanded
}

export interface FSWriteResult { ok: boolean; error?: string }
export interface FSStatResult  { size: number; isDir: boolean; mtime: number; ctime: number }

// ─── Bridge implementation ────────────────────────────────────

class FilesystemBridge {

  // ── Read a file ──────────────────────────────────────────

  async readFile(filePath: string): Promise<string> {
    if (IS_ELECTRON) {
      return window.operon.fs.readFile(filePath)
    }
    const res = await fetch(`/api/operon/fs/read?path=${encodeURIComponent(filePath)}`)
    if (!res.ok) throw new Error(`FS read failed: ${res.statusText}`)
    return res.text()
  }

  // ── Write a file ─────────────────────────────────────────

  async writeFile(filePath: string, content: string): Promise<FSWriteResult> {
    if (IS_ELECTRON) {
      return window.operon.fs.writeFile(filePath, content)
    }
    const res = await fetch('/api/operon/fs/write', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: filePath, content }),
    })
    return res.json()
  }

  // ── Read directory ────────────────────────────────────────

  async readDir(dirPath: string): Promise<FSEntry[]> {
    if (IS_ELECTRON) {
      const raw = await window.operon.fs.readDir(dirPath)
      return raw.map(e => ({
        ...e,
        language: e.isDir ? undefined : resolveLanguage(e.name),
      }))
    }
    const res = await fetch(`/api/operon/fs/dir?path=${encodeURIComponent(dirPath)}`)
    return res.json()
  }

  // ── Stat ─────────────────────────────────────────────────

  async stat(filePath: string): Promise<FSStatResult> {
    if (IS_ELECTRON) {
      return window.operon.fs.stat(filePath)
    }
    const res = await fetch(`/api/operon/fs/stat?path=${encodeURIComponent(filePath)}`)
    return res.json()
  }

  // ── Delete ───────────────────────────────────────────────

  async delete(filePath: string): Promise<FSWriteResult> {
    if (IS_ELECTRON) {
      return window.operon.fs.delete(filePath)
    }
    const res = await fetch('/api/operon/fs/delete', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: filePath }),
    })
    return res.json()
  }

  // ── Rename / move ─────────────────────────────────────────

  async rename(from: string, to: string): Promise<FSWriteResult> {
    if (IS_ELECTRON) {
      return window.operon.fs.rename(from, to)
    }
    const res = await fetch('/api/operon/fs/rename', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from, to }),
    })
    return res.json()
  }

  // ── Watch ─────────────────────────────────────────────────

  watch(
    watchId:   string,
    watchPath: string,
    cb:        (event: { eventType: string; filename: string | null }) => void
  ): () => void {
    if (IS_ELECTRON) {
      return window.operon.fs.watch(watchId, watchPath, cb)
    }
    // Web-mode: poll via SSE (Next.js /api/operon/fs/watch?path=...)
    const url = `/api/operon/fs/watch?id=${watchId}&path=${encodeURIComponent(watchPath)}`
    const es  = new EventSource(url)
    es.onmessage = e => {
      try { cb(JSON.parse(e.data)) } catch {}
    }
    return () => es.close()
  }

  // ── Build a full recursive tree (depth-limited) ──────────

  async buildTree(rootPath: string, maxDepth = 4): Promise<FSEntry[]> {
    const expand = async (entry: FSEntry, depth: number): Promise<FSEntry> => {
      if (!entry.isDir || depth >= maxDepth) return entry
      const children = await this.readDir(entry.path)
      return {
        ...entry,
        children: await Promise.all(children.map(c => expand(c, depth + 1))),
      }
    }

    const roots = await this.readDir(rootPath)
    return Promise.all(roots.map(e => expand(e, 0)))
  }
}

export const fsBridge = new FilesystemBridge()

// ─── Next.js API routes (web mode fallback) ───────────────────
// Place these at: app/api/operon/fs/[...action]/route.ts
//
// They mirror exactly what Electron IPC handles in desktop mode.
// Copy/paste the handler below if you need web deployment:
//
// import * as fs from 'fs/promises'
// import { NextRequest, NextResponse } from 'next/server'
//
// export async function GET(req: NextRequest) {
//   const p = req.nextUrl.searchParams.get('path') ?? ''
//   const content = await fs.readFile(p, 'utf-8')
//   return new NextResponse(content)
// }
