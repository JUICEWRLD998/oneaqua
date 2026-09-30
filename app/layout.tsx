import type { ReactNode } from 'react'
import '../styles/globals.css'
import Shell from '../components/Shell'

export const metadata = {
  title: 'Firstline',
  description: 'Treat the cause first. Prove it worked. A restoration planner that refuses out-of-order measures, cites D2.4 for every verdict, and tells you when a result cannot yet be known.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
