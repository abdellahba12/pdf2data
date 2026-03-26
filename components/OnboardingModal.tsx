'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'

interface Step {
  num: number
  icon: string
  title: string
  desc: string
  action?: string
  actionRoute?: string
}

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const { lang } = useLang()

  useEffect(() => {
    // Check with the server if onboarding is needed (first time = no company name set)
    async function check() {
      try {
        const res = await fetch('/api/company')
        const data = await res.json()
        // Show onboarding if company name is not set yet
        if (!data.company?.companyName) {
          setTimeout(() => setVisible(true), 600)
        }
      } catch {}
      setChecking(false)
    }
    check()
  }, [])

  function dismiss() {
    setVisible(false)
  }

  const steps: Step[] = lang === 'es' ? [
    {
      num: 1,
      icon: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM9 10h6M9 14h4',
      title: 'Bienvenido a PDF2Data',
      desc: 'Esta app te permite subir facturas de tus proveedores en PDF y extraer automaticamente todos los datos. Luego puedes generar tu propia factura con tu formato.',
    },
    {
      num: 2,
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      title: 'Configura tu empresa',
      desc: 'Ve a "Mi Empresa" y rellena tus datos: nombre, CIF, direccion, IBAN. Tambien puedes subir tu logo y una factura de ejemplo para que la IA aprenda tu formato.',
      action: 'Ir a Mi Empresa',
      actionRoute: '/company',
    },
    {
      num: 3,
      icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      title: 'Sube tu primera factura',
      desc: 'Arrastra cualquier PDF de proveedor al area de carga del dashboard. La IA extraera los datos automaticamente en menos de 10 segundos.',
    },
    {
      num: 4,
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      title: 'Revisa y genera tu factura',
      desc: 'Revisa que los datos extraidos sean correctos, editalo si es necesario, y haz clic en "Generar Factura PDF" para obtener tu factura con el formato de tu empresa. Tambien puedes exportar a Excel o CSV.',
    },
  ] : [
    {
      num: 1,
      icon: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM9 10h6M9 14h4',
      title: 'Welcome to PDF2Data',
      desc: 'This app lets you upload supplier invoices as PDF and automatically extract all the data. Then you can generate your own invoice with your company format.',
    },
    {
      num: 2,
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      title: 'Set up your company',
      desc: 'Go to "My Company" and fill in your details: name, tax ID, address, IBAN. You can also upload your logo and an invoice example so the AI learns your format.',
      action: 'Go to My Company',
      actionRoute: '/company',
    },
    {
      num: 3,
      icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      title: 'Upload your first invoice',
      desc: 'Drag any supplier PDF to the upload area in the dashboard. AI will extract all data automatically in less than 10 seconds.',
    },
    {
      num: 4,
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      title: 'Review and generate your invoice',
      desc: 'Check that the extracted data is correct, edit if needed, and click "Generate Invoice PDF" to get your invoice with your company format. You can also export to Excel or CSV.',
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  if (checking || !visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* Progress bar */}
        <div className="h-1 bg-cream rounded-t-2xl overflow-hidden">
          <div className="h-full bg-amber transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="p-8">
          {/* Step dots */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={s.num}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  i === step ? 'bg-ink text-white scale-110'
                  : i < step ? 'bg-green-500 text-white'
                  : 'bg-cream text-ink-muted'
                }`}>
                {i < step ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                ) : s.num}
              </div>
            ))}
            <button onClick={dismiss} className="ml-auto text-ink-muted hover:text-ink transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Icon */}
          <div className="w-14 h-14 bg-amber-light rounded-2xl flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={current.icon}/>
            </svg>
          </div>

          {/* Content */}
          <h2 className="font-display text-2xl text-ink mb-3">{current.title}</h2>
          <p className="text-ink-muted leading-relaxed mb-8">{current.desc}</p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 border border-border text-ink rounded-lg text-sm font-medium hover:bg-cream transition-colors">
                {lang === 'es' ? 'Anterior' : 'Back'}
              </button>
            )}

            {current.action && current.actionRoute && (
              <button onClick={() => { dismiss(); router.push(current.actionRoute!) }}
                className="px-4 py-2.5 border border-amber text-amber rounded-lg text-sm font-medium hover:bg-amber-light transition-colors">
                {current.action}
              </button>
            )}

            <button onClick={() => isLast ? dismiss() : setStep(s => s + 1)}
              className="ml-auto px-6 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-700 transition-colors flex items-center gap-2">
              {isLast
                ? (lang === 'es' ? 'Empezar' : 'Get started')
                : (lang === 'es' ? 'Siguiente' : 'Next')
              }
              {!isLast && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
