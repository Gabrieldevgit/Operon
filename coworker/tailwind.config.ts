import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DTS Coworker design system
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          overlay: 'hsl(var(--surface-overlay))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          subtle: 'hsl(var(--border-subtle))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          glow: 'hsl(var(--accent-glow))',
          muted: 'hsl(var(--accent-muted))',
        },
        agent: {
          orchestrator: '#7C6FE0',
          ui:           '#34D399',
          dev:          '#60A5FA',
          reviewer:     '#F59E0B',
        },
        step: {
          thinking:  '#A78BFA',
          tool:      '#34D399',
          file:      '#60A5FA',
          approval:  '#F59E0B',
          error:     '#F87171',
        },
        risk: {
          safe:     '#34D399',
          medium:   '#F59E0B',
          high:     '#F87171',
          critical: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        sm:  'calc(var(--radius) - 4px)',
        md:  'calc(var(--radius) - 2px)',
        lg:  'var(--radius)',
        xl:  'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.3s ease-in-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'step-appear':  'stepAppear 0.25s ease-out',
        'thinking':     'thinking 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        stepAppear: { '0%': { opacity: '0', transform: 'translateX(-6px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        thinking:   { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '1' } },
      },
      boxShadow: {
        'glow-sm':  '0 0 10px -2px hsl(var(--accent) / 0.3)',
        'glow-md':  '0 0 20px -4px hsl(var(--accent) / 0.4)',
        'glow-lg':  '0 0 40px -8px hsl(var(--accent) / 0.5)',
        'panel':    '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
      },
    },
  },
  plugins: [],
}

export default config
