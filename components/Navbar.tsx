'use client'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'
import Link from 'next/link'
import LangSwitcher from './LangSwitcher'
import PlanBadge from './PlanBadge'

export default function Navbar() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const { t } = useLang()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
  }

  const links = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/clients', label: 'Clientes' },
    { href: '/stats', label: t('stats') },
    { href: '/company', label: t('myCompany') },
  ]

  return (
    <header className="h-14 border-b border-border bg-paper/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-ink rounded-sm flex items-center justify-center group-hover:bg-amber-600 transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h12v12H2z" stroke="white" strokeWidth="1.5"/>
                <path d="M5 6h6M5 8h6M5 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display text-lg text-ink">PDF2Data</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink hover:bg-cream rounded-md transition-all">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <PlanBadge />
          <LangSwitcher />
          {user && <span className="text-xs text-ink-muted hidden lg:block font-mono">{user.email}</span>}
          <button onClick={handleLogout}
            className="text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('signOut')}
          </button>
        </div>
      </div>
    </header>
  )
}
