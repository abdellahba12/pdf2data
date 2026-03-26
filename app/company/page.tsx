'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface CompanyData {
  companyName: string; companyCIF: string; companyAddress: string
  companyPhone: string; companyEmail: string; companyIBAN: string
  companyLogoUrl?: string; companyStyle?: object; templateFileUrl?: string
}

export default function CompanyPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { t } = useLang()

  const [company, setCompany] = useState<CompanyData>({
    companyName: '', companyCIF: '', companyAddress: '',
    companyPhone: '', companyEmail: '', companyIBAN: '',
  })
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [templateAnalyzed, setTemplateAnalyzed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) router.push('/login'); else setUser(d.user)
    })
    fetch('/api/company').then(r => r.json()).then(d => {
      if (d.company) {
        setCompany(d.company)
        if (d.company.companyStyle) setTemplateAnalyzed(true)
      }
    })
  }, [router, setUser])

  async function handleSave() {
    setSaving(true); setError('')
    const res = await fetch('/api/company', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: company.companyName, companyCIF: company.companyCIF,
        companyAddress: company.companyAddress, companyPhone: company.companyPhone,
        companyEmail: company.companyEmail, companyIBAN: company.companyIBAN,
      }),
    })
    setSaving(false)
    if (res.ok) { setSavedOk(true); setTimeout(() => setSavedOk(false), 3000) }
    else setError('Error al guardar')
  }

  const handleLogoUpload = useCallback(async (file: File) => {
    setUploadingLogo(true)
    const formData = new FormData(); formData.append('file', file); formData.append('type', 'logo')
    const res = await fetch('/api/company/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (res.ok) setCompany(c => ({ ...c, companyLogoUrl: data.logoUrl }))
    setUploadingLogo(false)
  }, [])

  const handleTemplateUpload = useCallback(async (file: File) => {
    setUploadingTemplate(true); setError('')
    const formData = new FormData(); formData.append('file', file); formData.append('type', 'template')
    const res = await fetch('/api/company/upload', { method: 'POST', body: formData })
    if (res.ok) setTemplateAnalyzed(true)
    else setError('Error al analizar la plantilla')
    setUploadingTemplate(false)
  }, [])

  // Helper to update a field in company state
  function updateField(field: keyof CompanyData, value: string) {
    setCompany(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-paper grain">
      <Navbar />
      <div className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-ink-muted hover:text-ink transition-colors">{t('dashboard')}</Link>
          <span className="text-border">/</span>
          <span className="text-ink font-medium">{t('myCompany')}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl text-ink mb-2">{t('myCompany')}</h1>
          <p className="text-ink-muted">Configura los datos de tu empresa y sube tu plantilla de factura (imagen o Excel) para generar facturas con tu formato.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Company data */}
          <div className="space-y-6">
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="text-xs font-bold text-ink uppercase tracking-widest mb-5 pb-2 border-b border-border">Datos de la Empresa</h2>
              <div className="space-y-4">
                {[
                  { label: 'Nombre empresa', field: 'companyName' as const, placeholder: 'Mi Empresa S.L.' },
                  { label: 'CIF / NIF', field: 'companyCIF' as const, placeholder: 'B12345678' },
                  { label: 'Direccion', field: 'companyAddress' as const, placeholder: 'C/ Principal, 1, 08001 Barcelona' },
                  { label: 'Telefono', field: 'companyPhone' as const, placeholder: '937 444 461' },
                  { label: 'Email', field: 'companyEmail' as const, placeholder: 'info@miempresa.com' },
                  { label: 'IBAN', field: 'companyIBAN' as const, placeholder: 'ES17 2100 3605 6022 0031 3782' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={company[field] || ''}
                      onChange={(e) => updateField(field, e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-ink text-sm focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all"
                    />
                  </div>
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button onClick={handleSave} disabled={saving}
                className="mt-6 w-full py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : 'Guardar datos'}
              </button>
              {savedOk && <p className="mt-2 text-center text-sm text-green-600">Guardado correctamente</p>}
            </div>
          </div>

          {/* Right: Logo + Template */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="text-xs font-bold text-ink uppercase tracking-widest mb-5 pb-2 border-b border-border">Logo de la Empresa</h2>
              {company.companyLogoUrl && (
                <div className="mb-4 p-4 bg-cream rounded-lg flex items-center justify-center">
                  <img src={company.companyLogoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
                </div>
              )}
              <label className={`flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploadingLogo ? 'opacity-50 pointer-events-none' : 'border-border hover:border-amber bg-cream hover:bg-white'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
                {uploadingLogo
                  ? <svg className="animate-spin w-6 h-6 text-amber" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <p className="text-sm text-ink-muted">Subir logo <span className="text-amber">PNG, JPG</span></p>
                }
              </label>
            </div>

            {/* Template - now accepts images AND Excel */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="text-xs font-bold text-ink uppercase tracking-widest mb-2 pb-2 border-b border-border">Plantilla de Factura</h2>
              <p className="text-xs text-ink-muted mb-4">Sube un ejemplo de tu factura (imagen PNG/JPG o archivo Excel). Gemini analizara el estilo y replicara los colores y formato.</p>
              {templateAnalyzed && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-xs text-green-700 font-medium">Estilo analizado correctamente</span>
                </div>
              )}
              <label className={`flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploadingTemplate ? 'opacity-50 pointer-events-none' : 'border-border hover:border-amber bg-cream hover:bg-white'}`}>
                <input type="file" accept="image/*,.pdf,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleTemplateUpload(f) }} />
                {uploadingTemplate ? (
                  <><svg className="animate-spin w-6 h-6 text-amber mb-2" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <p className="text-xs text-ink-muted">Analizando con Gemini...</p></>
                ) : (
                  <p className="text-sm text-ink-muted">Subir factura ejemplo <span className="text-amber">PNG, JPG, PDF, Excel</span></p>
                )}
              </label>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
