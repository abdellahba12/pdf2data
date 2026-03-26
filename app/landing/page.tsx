'use client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import LangSwitcher from '@/components/LangSwitcher'

export default function LandingPage() {
  const router = useRouter()
  const { lang } = useLang()
  const es = lang === 'es'

  return (
    <div className="min-h-screen bg-paper" style={{ fontFamily: 'var(--font-body)' }}>
      <nav className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ink rounded-sm flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v12H2z" stroke="white" strokeWidth="1.5"/><path d="M5 6h6M5 8h6M5 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-xl text-ink">PDF2Data</span>
          </div>
          <div className="flex items-center gap-4">
            <LangSwitcher />
            <button onClick={() => router.push('/login')} className="text-sm text-ink-muted hover:text-ink transition-colors">{es ? 'Iniciar sesion' : 'Sign in'}</button>
            <button onClick={() => router.push('/login')} className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-700 transition-colors">{es ? 'Empezar gratis' : 'Start free'}</button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-light border border-amber/30 rounded-full text-xs font-medium text-amber-700 mb-8">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
          {es ? '5 dias de prueba gratis · Gemini AI' : '5-day free trial · Gemini AI'}
        </div>
        <h1 className="font-display text-6xl md:text-7xl text-ink leading-[1.1] mb-6 whitespace-pre-line">
          {es ? 'Tus facturas,\nautomatizadas.' : 'Your invoices,\nautomated.'}
        </h1>
        <p className="text-xl text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          {es ? 'Sube cualquier PDF de proveedor. Extrae todos los datos automaticamente y genera tu factura con tu propio formato en segundos.' : 'Upload any supplier PDF. Extract all data automatically and generate your invoice with your own format in seconds.'}
        </p>
        <button onClick={() => router.push('/login')} className="px-8 py-4 bg-ink text-white font-medium rounded-xl hover:bg-ink-700 transition-all hover:scale-[1.02] active:scale-[0.98] text-base">
          {es ? 'Empezar gratis — 5 dias de prueba' : 'Start free — 5-day trial'}
        </button>
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
          {[{ val: '95%+', label: es ? 'Precision' : 'Accuracy' }, { val: '<10s', label: es ? 'Por documento' : 'Per document' }, { val: '0', label: es ? 'Entrada manual' : 'Manual entry' }].map(s => (
            <div key={s.label} className="text-center"><div className="font-display text-4xl text-amber">{s.val}</div><div className="text-xs text-ink-muted mt-1">{s.label}</div></div>
          ))}
        </div>
      </section>

      <section className="bg-cream border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-4xl text-ink text-center mb-16">{es ? 'Tan simple como 1, 2, 3' : 'As simple as 1, 2, 3'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '1', title: es ? 'Sube el PDF' : 'Upload the PDF', desc: es ? 'Arrastra cualquier factura o albaran de proveedor.' : 'Drag any supplier invoice or delivery note.' },
              { num: '2', title: es ? 'IA extrae los datos' : 'AI extracts the data', desc: es ? 'Gemini AI lee el documento y extrae proveedor, importes y lineas.' : 'Gemini AI reads the document and extracts vendor, amounts and items.' },
              { num: '3', title: es ? 'Genera tu factura' : 'Generate your invoice', desc: es ? 'Con tu logo, colores y formato. Descarga en PDF, Excel o CSV.' : 'With your logo, colors and format. Download as PDF, Excel or CSV.' },
            ].map(step => (
              <div key={step.num} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ink text-white rounded-xl flex items-center justify-center flex-shrink-0 font-display text-xl">{step.num}</div>
                <div><h3 className="font-semibold text-ink text-lg mb-2">{step.title}</h3><p className="text-ink-muted text-sm leading-relaxed">{step.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream border-y border-border py-20 mt-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-4xl text-ink text-center mb-16">{es ? 'Precio simple' : 'Simple pricing'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-2xl p-8">
              <div className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">{es ? 'Gratis' : 'Free'}</div>
              <div className="font-display text-4xl text-ink mb-6">0€/{es ? 'mes' : 'mo'}</div>
              <ul className="space-y-3 mb-8">
                {(es ? ['10 documentos totales', 'Exportar Excel y CSV', 'Plantilla de empresa'] : ['10 total documents', 'Excel and CSV export', 'Company template']).map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push('/login')} className="w-full py-3 border border-border text-ink rounded-xl text-sm font-medium hover:bg-cream transition-colors">
                {es ? 'Empezar gratis' : 'Start for free'}
              </button>
            </div>
            <div className="bg-ink border border-ink rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber text-white text-xs font-semibold rounded-full">{es ? 'Mas popular' : 'Most popular'}</div>
              <div className="text-sm font-semibold text-ink-300 uppercase tracking-wider mb-2">Pro</div>
              <div className="font-display text-4xl text-white mb-6">19€/{es ? 'mes' : 'mo'}</div>
              <ul className="space-y-3 mb-8">
                {(es ? ['5 dias de prueba gratis', 'Documentos ilimitados', 'Generacion facturas PDF', 'Soporte prioritario'] : ['5-day free trial', 'Unlimited documents', 'PDF invoice generation', 'Priority support']).map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push('/login')} className="w-full py-3 bg-amber text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors">
                {es ? 'Empezar 5 dias gratis' : 'Start 5-day free trial'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 text-center max-w-3xl mx-auto px-6">
        <h2 className="font-display text-5xl text-ink mb-4">{es ? 'Empieza hoy. Es gratis.' : "Start today. It's free."}</h2>
        <p className="text-xl text-ink-muted mb-10">{es ? 'Sin tarjeta de credito. Listo en 5 minutos.' : 'No credit card. Ready in 5 minutes.'}</p>
        <button onClick={() => router.push('/login')} className="px-10 py-4 bg-ink text-white font-medium rounded-xl hover:bg-ink-700 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg">
          {es ? 'Crear cuenta gratis' : 'Create free account'}
        </button>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <span className="text-sm font-medium text-ink">PDF2Data</span>
          <p className="text-sm text-ink-muted">{es ? 'Hecho para pequenas empresas.' : 'Made for small businesses.'}</p>
          <LangSwitcher />
        </div>
      </footer>
    </div>
  )
}
