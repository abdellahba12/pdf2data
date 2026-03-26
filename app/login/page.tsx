'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'
import LangSwitcher from '@/components/LangSwitcher'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { t } = useLang()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setInfo(''); setLoading(true)
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      setUser(data.user)
      if (mode === 'register') { setInfo('Cuenta creada. Revisa tu email para verificar.'); setTimeout(() => router.push('/dashboard'), 1500) }
      else router.push('/dashboard')
    } catch { setError(t('networkError')) }
    finally { setLoading(false) }
  }

  function handleGoogle() { window.location.href = '/api/auth/google' }

  return (
    <div className="min-h-screen bg-paper flex">
      <div className="hidden lg:flex w-1/2 bg-ink flex-col justify-between p-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber rounded-sm flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v12H2z" stroke="white" strokeWidth="1.5"/><path d="M5 6h6M5 8h6M5 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <span className="text-white font-display text-xl">PDF2Data</span>
        </div>
        <div>
          <h1 className="font-display text-5xl text-white leading-[1.15] mb-6">{t('tagline1')}<br/><em>{t('tagline2')}</em></h1>
          <p className="text-ink-300 text-lg leading-relaxed max-w-sm">{t('heroSubtitle')}</p>
          <div className="mt-8 px-4 py-3 bg-white/10 rounded-xl inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
            <span className="text-white text-sm font-medium">5 dias de prueba gratuita</span>
          </div>
        </div>
        <div className="text-ink-600 text-xs">PDF2Data · Hecho para pequenas empresas</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-10">
            <div className="lg:hidden flex items-center gap-3">
              <div className="w-8 h-8 bg-ink rounded-sm flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v12H2z" stroke="white" strokeWidth="1.5"/><path d="M5 6h6M5 8h6M5 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-xl text-ink">PDF2Data</span>
            </div>
            <div className="ml-auto"><LangSwitcher /></div>
          </div>
          <div className="mb-8">
            <h2 className="font-display text-3xl text-ink mb-2">{mode === 'login' ? t('welcomeBack') : t('createAccount')}</h2>
            <p className="text-ink-muted">{mode === 'login' ? t('signInSubtitle') : t('registerSubtitle')}</p>
          </div>
          <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border bg-white rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs text-ink-muted bg-paper px-3">o con email</div>
          </div>
          <div className="flex border border-border rounded-lg p-1 mb-6 bg-cream">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
                {m === 'login' ? t('signIn') : t('register')}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-ink mb-2">{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@empresa.com"
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-ink placeholder-ink-muted focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all" /></div>
            <div><label className="block text-sm font-medium text-ink mb-2">{t('password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={mode === 'register' ? t('passwordPlaceholder') : '••••••••'}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-ink placeholder-ink-muted focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all" /></div>
            {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            {info && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{info}</div>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-ink text-white rounded-lg font-medium hover:bg-ink-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {loading ? (mode === 'login' ? t('signingIn') : t('creatingAccount')) : (mode === 'login' ? t('signIn') : t('register'))}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">
            {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
              className="text-amber hover:text-amber-700 font-medium transition-colors">
              {mode === 'login' ? t('register') : t('signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
