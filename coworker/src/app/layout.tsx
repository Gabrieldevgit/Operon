import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title:       'DTS Coworker',
  description: 'AI Co-Worker Workspace — multi-agent development platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
