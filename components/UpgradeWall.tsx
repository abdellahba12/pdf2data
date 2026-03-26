'use client'
import { useState } from 'react'
import { useLang } from '@/lib/lang-context'

export default function UpgradeWall({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const { lang } = useLang()
  const isEs = lang === 'es'

  async function handleUpgrade() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up text-center">
        <div className="w-14 h-14 bg-amber-light rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8">
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-display text-2xl text-ink mb-2">
          {isEs ? 'Has usado tus 10 documentos gratuitos' : 'You have used your 10 free documents'}
        </h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-6">
          {isEs
            ? 'Actualiza a Pro por solo 19€/mes para documentos ilimitados.'
            : 'Upgrade to Pro for just €19/mo for unlimited documents.'}
        </p>
        <div className="bg-cream rounded-xl p-4 mb-6 text-left space-y-2">
          {[
            isEs ? 'Documentos ilimitados' : 'Unlimited documents',
            isEs ? 'Generacion de facturas PDF' : 'PDF invoice generation',
            isEs ? 'Envio de facturas por email' : 'Email invoice sending',
            isEs ? 'Soporte prioritario' : 'Priority support',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {f}
            </div>
          ))}
        </div>
        <button onClick={handleUpgrade} disabled={loading}
          className="w-full py-3 bg-amber text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-60 transition-all mb-3">
          {loading ? '...' : (isEs ? 'Actualizar a Pro - 19€/mes' : 'Upgrade to Pro - €19/mo')}
        </button>
        <button onClick={onClose} className="text-sm text-ink-muted hover:text-ink transition-colors">
          {isEs ? 'Ahora no' : 'Not now'}
        </button>
      </div>
    </div>
  )
}
