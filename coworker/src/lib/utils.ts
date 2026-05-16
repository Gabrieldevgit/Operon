import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'

// Tailwind class merge helper (used everywhere in components)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a short readable ID
export function generateId(prefix?: string): string {
  const id = nanoid(10)
  return prefix ? `${prefix}_${id}` : id
}

// Format a timestamp to a readable time string
export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

// Format milliseconds to a human duration string
export function formatDuration(ms: number): string {
  if (ms < 1000)  return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Truncate a string with ellipsis
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// Sleep helper for async flows
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Safe JSON parse — returns null instead of throwing
export function safeJson<T = unknown>(str: string): T | null {
  try { return JSON.parse(str) as T }
  catch { return null }
}

// Type-safe environment variable getter
export function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return val
}
