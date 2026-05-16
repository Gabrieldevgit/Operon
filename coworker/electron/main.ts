// ============================================================
// Operon IDE — Electron Main Process
// Handles: window creation, file system IPC, terminal (node-pty),
// shell execution, and file watching.
//
// Architecture:
//   Renderer (Next.js)  ──ipcRenderer──▶  preload.ts (contextBridge)
//   preload.ts          ──ipcMain──▶       main.ts (THIS FILE)
//   main.ts             ──▶  Node.js APIs (fs, node-pty, child_process)
// ============================================================

import {
  app, BrowserWindow, ipcMain, shell,
  type IpcMainInvokeEvent,
} from 'electron'
import * as path   from 'path'
import * as fs     from 'fs/promises'
import * as fssync from 'fs'
import { exec }    from 'child_process'
import { promisify } from 'util'

// node-pty for real terminal emulation
// Install: npm install node-pty
import * as pty from 'node-pty'

const execAsync = promisify(exec)

// ─── Constants ────────────────────────────────────────────────

const isDev  = process.env.NODE_ENV === 'development'
const NEXT_URL = 'http://localhost:3000'

// Active terminals: termId → IPty instance
const terminals = new Map<string, pty.IPty>()

// Active file watchers: watchId → FSWatcher
const watchers  = new Map<string, fssync.FSWatcher>()

// ─── Window ───────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width:          1440,
    height:         900,
    minWidth:       1024,
    minHeight:      680,
    title:          'Operon IDE',
    icon:           path.join(__dirname, '../assets/operon-icon.png'),
    titleBarStyle:  'hiddenInset',    // native macOS traffic lights
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#09090b',       // zinc-950 — no white flash on load
    show:           false,            // wait until ready-to-show
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,        // never expose Node.js to renderer directly
      sandbox:          false,        // required for preload to work with contextBridge
    },
  })

  // Load Next.js in dev, static build in production
  if (isDev) {
    mainWindow.loadURL(NEXT_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    // Clean up all terminals on window close
    terminals.forEach(term => term.kill())
    terminals.clear()
    watchers.forEach(w => w.close())
    watchers.clear()
  })
}

// ─── App lifecycle ────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── File system IPC handlers ─────────────────────────────────

ipcMain.handle('fs:readFile', async (_e: IpcMainInvokeEvent, filePath: string) => {
  const content = await fs.readFile(filePath, 'utf-8')
  return content
})

ipcMain.handle('fs:writeFile', async (_e: IpcMainInvokeEvent, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
  return { ok: true }
})

ipcMain.handle('fs:readDir', async (_e: IpcMainInvokeEvent, dirPath: string) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  return entries.map(e => ({
    name:      e.name,
    path:      path.join(dirPath, e.name),
    isDir:     e.isDirectory(),
    isSymlink: e.isSymbolicLink(),
  }))
})

ipcMain.handle('fs:stat', async (_e: IpcMainInvokeEvent, filePath: string) => {
  const stat = await fs.stat(filePath)
  return {
    size:     stat.size,
    isDir:    stat.isDirectory(),
    mtime:    stat.mtime.getTime(),
    ctime:    stat.ctime.getTime(),
  }
})

ipcMain.handle('fs:delete', async (_e: IpcMainInvokeEvent, filePath: string) => {
  await fs.rm(filePath, { recursive: true, force: true })
  return { ok: true }
})

ipcMain.handle('fs:rename', async (_e: IpcMainInvokeEvent, from: string, to: string) => {
  await fs.rename(from, to)
  return { ok: true }
})

// File watching — sends events back to renderer via webContents.send
ipcMain.handle('fs:watch', (_e: IpcMainInvokeEvent, watchId: string, watchPath: string) => {
  if (watchers.has(watchId)) return

  const watcher = fssync.watch(watchPath, { recursive: true }, (eventType, filename) => {
    mainWindow?.webContents.send('fs:watchEvent', {
      watchId,
      eventType,
      filename: filename ? path.join(watchPath, filename) : null,
    })
  })

  watchers.set(watchId, watcher)
  return { ok: true }
})

ipcMain.handle('fs:unwatch', (_e: IpcMainInvokeEvent, watchId: string) => {
  watchers.get(watchId)?.close()
  watchers.delete(watchId)
  return { ok: true }
})

// ─── Terminal (node-pty) IPC handlers ─────────────────────────

ipcMain.handle('term:create', (e: IpcMainInvokeEvent, termId: string, cwd: string) => {
  const shell  = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL ?? '/bin/zsh')
  const cols   = 120
  const rows   = 30

  const term = pty.spawn(shell, [], {
    name:   'xterm-256color',
    cols,
    rows,
    cwd:    cwd || process.env.HOME || '/',
    env:    { ...process.env, TERM: 'xterm-256color' },
  })

  term.onData(data => {
    // Stream output back to the renderer tab that owns this terminal
    mainWindow?.webContents.send('term:output', { termId, data })
  })

  term.onExit(({ exitCode }) => {
    mainWindow?.webContents.send('term:output', {
      termId,
      data: `\r\n[Process exited with code ${exitCode}]\r\n`,
    })
    terminals.delete(termId)
  })

  terminals.set(termId, term)
  return { ok: true, pid: term.pid }
})

ipcMain.handle('term:input', (_e: IpcMainInvokeEvent, termId: string, data: string) => {
  terminals.get(termId)?.write(data)
})

ipcMain.handle('term:resize', (_e: IpcMainInvokeEvent, termId: string, cols: number, rows: number) => {
  terminals.get(termId)?.resize(cols, rows)
})

ipcMain.handle('term:kill', (_e: IpcMainInvokeEvent, termId: string) => {
  terminals.get(termId)?.kill()
  terminals.delete(termId)
  return { ok: true }
})

// ─── Shell execution ──────────────────────────────────────────

ipcMain.handle('shell:exec', async (_e: IpcMainInvokeEvent, cmd: string, cwd?: string) => {
  const { stdout, stderr } = await execAsync(cmd, { cwd: cwd ?? process.cwd() })
  return { stdout, stderr }
})

ipcMain.handle('shell:openDir', (_e: IpcMainInvokeEvent, dirPath: string) => {
  shell.openPath(dirPath)
  return { ok: true }
})

ipcMain.handle('shell:which', async (_e: IpcMainInvokeEvent, bin: string) => {
  try {
    const { stdout } = await execAsync(`which ${bin}`)
    return { path: stdout.trim() }
  } catch {
    return { path: null }
  }
})

// ─── Window controls ──────────────────────────────────────────

ipcMain.on('win:maximize',   () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize())
ipcMain.on('win:minimize',   () => mainWindow?.minimize())
ipcMain.on('win:close',      () => mainWindow?.close())
ipcMain.on('win:fullscreen', () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()))
ipcMain.on('win:setTitle',   (_e, title: string) => mainWindow?.setTitle(`${title} — Operon IDE`))

// ─── App info ─────────────────────────────────────────────────

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:ready',   () => ({ ready: true, platform: process.platform }))
