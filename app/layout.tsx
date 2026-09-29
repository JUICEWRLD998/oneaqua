import type { ReactNode } from 'react'
import '../styles/globals.css'

export const metadata = { title: 'Firstline', description: 'Treat the cause first. Prove it worked.' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
