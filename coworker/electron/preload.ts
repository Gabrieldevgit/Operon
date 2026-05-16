// ============================================================
// Operon IDE — Electron Preload Script
// Runs in a privileged context but exposes ONLY a curated API
// to the renderer (Next.js) via contextBridge.
//
// The renderer accesses everything through `window.operon`.
// Node.js APIs are NEVER exposed directly — only typed wrappers.
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'
import type { OPERON }                from '../src/config/operon'

// ─── Type definitions for window.operon ──────────────────────
// (Mirrors what we expose below — used by the renderer for types)

export interface OperonFileEntry {
  name:      string
  path:      string
  isDir:     boolean
  isSymlink: boolean
}

export interface OperonFileStat {
  size:  number
  isDir: boolean
  mtime: number
  ctime: number
}

export interface OperonWatchEvent {
  watchId:   string
  eventType: 'rename' | 'change'
  filename:  string | null
}

export interface OperonTermOutput {
  termId: string
  data:   string
}

// ─── Expose window.operon ─────────────────────────────────────

contextBridge.exposeInMainWorld('operon', {

  // ── File system ───────────────────────────────────────────

  fs: {
    readFile:  (filePath: string)                        => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string)       => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir:   (dirPath: string)                         => ipcRenderer.invoke('fs:readDir', dirPath) as Promise<OperonFileEntry[]>,
    stat:      (filePath: string)                        => ipcRenderer.invoke('fs:stat', filePath) as Promise<OperonFileStat>,
    delete:    (filePath: string)                        => ipcRenderer.invoke('fs:delete', filePath),
    rename:    (from: string, to: string)                => ipcRenderer.invoke('fs:rename', from, to),

    // File watching — returns unwatch function
    watch: (watchId: string, watchPath: string, cb: (e: OperonWatchEvent) => void) => {
      ipcRenderer.invoke('fs:watch', watchId, watchPath)
      const handler = (_: Electron.IpcRendererEvent, ev: OperonWatchEvent) => {
        if (ev.watchId === watchId) cb(ev)
      }
      ipcRenderer.on('fs:watchEvent', handler)
      return () => {
        ipcRenderer.invoke('fs:unwatch', watchId)
        ipcRenderer.off('fs:watchEvent', handler)
      }
    },
  },

  // ── Terminal ──────────────────────────────────────────────

  terminal: {
    create: (termId: string, cwd: string)              => ipcRenderer.invoke('term:create', termId, cwd),
    input:  (termId: string, data: string)             => ipcRenderer.invoke('term:input', termId, data),
    resize: (termId: string, cols: number, rows: number) => ipcRenderer.invoke('term:resize', termId, cols, rows),
    kill:   (termId: string)                           => ipcRenderer.invoke('term:kill', termId),

    // Subscribe to output from a specific terminal
    onOutput: (cb: (ev: OperonTermOutput) => void) => {
      const handler = (_: Electron.IpcRendererEvent, ev: OperonTermOutput) => cb(ev)
      ipcRenderer.on('term:output', handler)
      return () => ipcRenderer.off('term:output', handler)
    },
  },

  // ── Shell ─────────────────────────────────────────────────

  shell: {
    exec:    (cmd: string, cwd?: string) => ipcRenderer.invoke('shell:exec', cmd, cwd) as Promise<{ stdout: string; stderr: string }>,
    openDir: (dirPath: string)           => ipcRenderer.invoke('shell:openDir', dirPath),
    which:   (bin: string)               => ipcRenderer.invoke('shell:which', bin) as Promise<{ path: string | null }>,
  },

  // ── Window controls ───────────────────────────────────────

  window: {
    maximize:   () => ipcRenderer.send('win:maximize'),
    minimize:   () => ipcRenderer.send('win:minimize'),
    close:      () => ipcRenderer.send('win:close'),
    fullscreen: () => ipcRenderer.send('win:fullscreen'),
    setTitle:   (title: string) => ipcRenderer.send('win:setTitle', title),
  },

  // ── App info ──────────────────────────────────────────────

  app: {
    version: () => ipcRenderer.invoke('app:version') as Promise<string>,
    ready:   () => ipcRenderer.invoke('app:ready')   as Promise<{ ready: boolean; platform: string }>,
  },
})

// ─── TypeScript global augmentation (used in renderer) ───────
// Copy this block to src/types/electron.d.ts in the renderer.

declare global {
  interface Window {
    operon: typeof import('./preload')['default']
  }
}
