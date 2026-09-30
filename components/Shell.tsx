'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { StoreProvider } from '../lib/ui/store'
import s from './shell.module.css'

const NAV = [
  { href: '/', label: 'Stream chart', short: 'Chart', n: '1' },
  { href: '/new', label: 'Build your own', short: 'Build', n: '2' },
  { href: '/casebook', label: 'Casebook', short: 'Cases', n: '3' },
  { href: '/plan/export', label: 'Sign and export', short: 'Sign', n: '4' },
  { href: '/method', label: 'Method', short: 'Method', n: '5' },
]

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  return (
    <StoreProvider>
      <a className={s.skip} href="#main">Skip to the content</a>
      <div className={s.frame}>
        <nav className={s.rail} aria-label="Firstline">
          <div className={s.railIn}>
          <Link className={s.wm} href="/">Firstline</Link>
          <p className={s.tag}>Treat the cause first. Prove it worked.</p>
          <ol className={s.links}>
            {NAV.map((l) => {
              const here = l.href === '/' ? path === '/' : path.startsWith(l.href)
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={here ? 'page' : undefined} className={s.link}>
                    <span className={`num ${s.n}`}>{l.n}</span> <span className={s.long}>{l.label}</span><span className={s.short}>{l.short}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className={s.foot}>An independent prototype on OneAquaHealth D2.4 (CC-BY 4.0). Not the OneAquaHealth DSS.</p>
          </div>
        </nav>
        <main id="main" className={s.main} tabIndex={-1}>{children}</main>
      </div>
    </StoreProvider>
  )
}
