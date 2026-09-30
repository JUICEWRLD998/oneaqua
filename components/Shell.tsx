'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { StoreProvider } from '../lib/ui/store'
import s from './shell.module.css'

const NAV = [
  { href: '/', label: 'Stream chart', n: '1' },
  { href: '/new', label: 'Build your own', n: '2' },
  { href: '/casebook', label: 'Casebook', n: '3' },
  { href: '/plan/export', label: 'Sign and export', n: '4' },
  { href: '/method', label: 'Method', n: '5' },
]

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  return (
    <StoreProvider>
      <a className={s.skip} href="#main">Skip to the content</a>
      <div className={s.frame}>
        <nav className={s.rail} aria-label="Firstline">
          <Link className={s.wm} href="/">Firstline</Link>
          <p className={s.tag}>Treat the cause first. Prove it worked.</p>
          <ol className={s.links}>
            {NAV.map((l) => {
              const here = l.href === '/' ? path === '/' : path.startsWith(l.href)
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={here ? 'page' : undefined} className={s.link}>
                    <span className="num">{l.n}</span> {l.label}
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className={s.foot}>An independent prototype on OneAquaHealth D2.4 (CC-BY 4.0). Not the OneAquaHealth DSS.</p>
        </nav>
        <main id="main" className={s.main} tabIndex={-1}>{children}</main>
      </div>
    </StoreProvider>
  )
}
