// ============================================================
// electron-builder.config.js — Operon IDE Desktop Build
// Run: npx electron-builder build
// ============================================================

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId:       'com.dts.operon',
  productName: 'Operon IDE',
  copyright:   'Copyright © 2025 DTS',

  // Entry points
  directories: {
    buildResources: 'assets',
    output:         'dist-electron',
  },

  // What to include in the app bundle
  files: [
    'out/**/*',          // Next.js static export
    'electron/**/*.js',  // compiled Electron main + preload
    'assets/**/*',
    'node_modules/**/*',
    '!node_modules/**/*.md',
    '!node_modules/**/.bin',
  ],

  // Main process entry (compiled from electron/main.ts)
  main: 'electron/main.js',

  // macOS
  mac: {
    target:   [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.developer-tools',
    icon:     'assets/operon-icon.icns',
    darkModeSupport: true,
    // Notarisation — set APPLE_TEAM_ID in env
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements:           'build/entitlements.mac.plist',
    entitlementsInherit:    'build/entitlements.mac.plist',
  },

  // Windows
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon:   'assets/operon-icon.ico',
  },

  // Linux
  linux: {
    target:   [{ target: 'AppImage', arch: ['x64'] }],
    icon:     'assets/operon-icon.png',
    category: 'Development',
  },

  // Native modules (node-pty needs rebuilding per Electron ABI)
  npmRebuild: true,
  buildDependenciesFromSource: false,
}

// ============================================================
// REQUIRED package.json additions — merge into your root package.json
// ============================================================

const PACKAGE_ADDITIONS = {
  // Scripts
  scripts: {
    'electron:dev':   'concurrently "next dev" "wait-on http://localhost:3000 && electron electron/main.js"',
    'electron:build': 'next build && next export && tsc -p electron/tsconfig.json && electron-builder build',
    'electron:pack':  'electron-builder --dir',
  },

  // New dependencies
  dependencies: {
    'electron':             '^29.0.0',
    'node-pty':             '^1.0.0',
    '@xterm/xterm':         '^5.4.0',
    '@xterm/addon-fit':     '^0.10.0',
    '@xterm/addon-web-links':'0.11.0',
    'monaco-editor':        '^0.47.0',
    'concurrently':         '^8.2.0',
    'wait-on':              '^7.2.0',
  },

  // Electron builder config pointer
  build: {
    extends: './electron-builder.config.js',
  },
}

// ============================================================
// electron/tsconfig.json — TypeScript config for main + preload
// ============================================================

const ELECTRON_TSCONFIG = {
  compilerOptions: {
    target:           'ES2020',
    module:           'CommonJS',
    lib:              ['ES2020'],
    outDir:           '../electron',
    rootDir:          '.',
    strict:           true,
    esModuleInterop:  true,
    resolveJsonModule:true,
    skipLibCheck:     true,
  },
  include: ['*.ts'],
  exclude: ['node_modules'],
}

module.exports.PACKAGE_ADDITIONS = PACKAGE_ADDITIONS
module.exports.ELECTRON_TSCONFIG  = ELECTRON_TSCONFIG
