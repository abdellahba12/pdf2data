'use client'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useDocumentStore, usePlanStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'
import Navbar from '@/components/Navbar'
import FileUploader from '@/components/FileUploader'
import DocumentList from '@/components/DocumentList'
import OnboardingModal from '@/components/OnboardingModal'

export default function DashboardPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const { documents, setDocuments, updateDocument } = useDocumentStore()
  const { planInfo } = usePlanStore()
  const { t } = useLang()

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((data) => {
      if (!data.user) router.push('/login'); else setUser(data.user)
    }).catch(() => router.push('/login'))
  }, [router, setUser])

  const fetchDocuments = useCallback(async () => {
    const res = await fetch('/api/documents')
    if (res.status === 401) { router.push('/login'); return }
    const data = await res.json()
    if (data.documents) setDocuments(data.documents)
  }, [router, setDocuments])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  useEffect(() => {
    const processing = documents.filter((d) => d.status === 'processing')
    if (processing.length === 0) return
    const interval = setInterval(async () => {
      for (const doc of processing) {
        const res = await fetch(`/api/documents/${doc.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.document.status !== 'processing') updateDocument(doc.id, { status: data.document.status, extractedData: data.document.extractedData })
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [documents, updateDocument])

  const processingCount = documents.filter((d) => d.status === 'processing').length
  const completedCount = documents.filter((d) => d.status === 'completed').length

  const showTrialBanner = planInfo && planInfo.plan === 'trial' && planInfo.trialDaysLeft !== null && planInfo.trialDaysLeft <= 2
  const showFreeBanner = planInfo && planInfo.plan === 'free' && planInfo.docsRemaining <= 3 && planInfo.docsRemaining > 0

  return (
    <div className="min-h-screen bg-paper grain">
      <Navbar />
      <OnboardingModal />

      {showTrialBanner && (
        <div className="bg-amber-100 border-b border-amber-200 py-2.5 px-6 text-center text-sm text-amber-800">
          Tu prueba gratuita termina en <strong>{planInfo!.trialDaysLeft} dia{planInfo!.trialDaysLeft !== 1 ? 's' : ''}</strong>.{' '}
          <button onClick={() => fetch('/api/stripe/checkout', { method: 'POST' }).then(r => r.json()).then(d => { if (d.url) window.location.href = d.url })}
            className="underline font-semibold hover:text-amber-900">Actualizar a Pro</button>
        </div>
      )}
      {showFreeBanner && (
        <div className="bg-red-50 border-b border-red-200 py-2.5 px-6 text-center text-sm text-red-700">
          Te quedan <strong>{planInfo!.docsRemaining} documento{planInfo!.docsRemaining !== 1 ? 's' : ''}</strong> en el plan gratuito.{' '}
          <button onClick={() => fetch('/api/stripe/checkout', { method: 'POST' }).then(r => r.json()).then(d => { if (d.url) window.location.href = d.url })}
            className="underline font-semibold hover:text-amber-900">Actualizar a Pro</button>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl text-ink mb-2">{t('yourDocuments')}</h1>
          <p className="text-ink-muted">{t('dashboardSubtitle')}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: t('totalDocs'), value: documents.length },
            { label: t('completed'), value: completedCount },
            { label: t('processing'), value: processingCount },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-border rounded-xl px-5 py-4">
              <div className="text-2xl font-display text-ink">{stat.value}</div>
              <div className="text-xs text-ink-muted mt-0.5 uppercase tracking-wide font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">{t('uploadPDF')}</h2>
          <FileUploader />
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">{t('recentDocuments')}</h2>
            {processingCount > 0 && <span className="text-xs text-amber font-medium animate-pulse-soft">{processingCount} {t('statusProcessing').toLowerCase()}...</span>}
          </div>
          <DocumentList documents={documents} />
        </div>
      </main>
    </div>
  )
}
