'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { StoreProvider } from '../lib/ui/store'
import s from './shell.module.css'

const NAV = [
  { href: '/', label: 'Stream chart', short: 'Chart' },
  { href: '/new', label: 'Build your own', short: 'Build' },
  { href: '/casebook', label: 'Casebook', short: 'Cases' },
  { href: '/plan/export', label: 'Sign and export', short: 'Sign' },
  { href: '/method', label: 'Method', short: 'Method' },
]

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  return (
    <StoreProvider>
      <a className={s.skip} href="#main">Skip to the content</a>
      <header className={s.bar}>
        <nav className={s.barIn} aria-label="Firstline">
          <Link className={s.wm} href="/">
            <svg className={s.mark} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path d="M2 9 H22 M2 9 C7 9 9 15 13 15 S19 12 22 12" />
            </svg>
            Firstline
          </Link>
          <ul className={s.links}>
            {NAV.map((l) => {
              const here = l.href === '/' ? path === '/' : path.startsWith(l.href)
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={here ? 'page' : undefined} className={s.link}>
                    <span className={s.long}>{l.label}</span><span className={s.short}>{l.short}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>
      <main id="main" className={s.main} tabIndex={-1}>{children}</main>
      <footer className={s.foot}>
        <p className={s.statement}>Treat the cause first, then prove it worked.</p>
        <p className={s.credit}>An independent prototype on OneAquaHealth D2.4 (CC-BY 4.0). Not the OneAquaHealth DSS.</p>
      </footer>
    </StoreProvider>
  )
}
