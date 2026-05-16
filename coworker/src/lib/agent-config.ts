// Centralized agent visual config — used across sidebar, steps, chat
import type { AgentRole, AgentStatus } from '@/types'

export const AGENT_COLORS: Record<AgentRole, string> = {
  'orchestrator': '#7C6FE0',  // violet
  'ui-designer':  '#34D399',  // emerald
  'frontend-dev': '#60A5FA',  // sky
  'reviewer':     '#F59E0B',  // amber
}

export const AGENT_LABELS: Record<AgentRole, string> = {
  'orchestrator': 'Orchestrator',
  'ui-designer':  'UI Designer',
  'frontend-dev': 'Frontend Dev',
  'reviewer':     'Reviewer',
}

export const AGENT_INITIALS: Record<AgentRole, string> = {
  'orchestrator': 'OR',
  'ui-designer':  'UI',
  'frontend-dev': 'FE',
  'reviewer':     'RV',
}

export const STATUS_LABELS: Record<AgentStatus, string> = {
  'idle':              'Idle',
  'thinking':          'Thinking',
  'working':           'Working',
  'waiting-approval':  'Awaiting approval',
  'error':             'Error',
  'offline':           'Offline',
}

export const STATUS_COLORS: Record<AgentStatus, string> = {
  'idle':             '#4B5563',
  'thinking':         '#A78BFA',
  'working':          '#60A5FA',
  'waiting-approval': '#F59E0B',
  'error':            '#F87171',
  'offline':          '#374151',
}

export const STEP_ICONS: Record<string, string> = {
  'thinking':      '◈',
  'tool-use':      '⚡',
  'file-read':     '◎',
  'file-write':    '✦',
  'delegation':    '⟶',
  'memory-read':   '◐',
  'memory-write':  '◑',
  'approval':      '⚠',
  'communication': '◉',
  'result':        '✓',
}

export const RISK_COLORS = {
  safe:     { bg: 'rgba(52,211,153,0.1)', text: '#34D399', border: 'rgba(52,211,153,0.3)' },
  medium:   { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  high:     { bg: 'rgba(248,113,113,0.1)', text: '#F87171', border: 'rgba(248,113,113,0.3)' },
  critical: { bg: 'rgba(220,38,38,0.15)',  text: '#DC2626', border: 'rgba(220,38,38,0.4)' },
}
