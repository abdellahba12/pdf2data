'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, ExtractedData } from '@/lib/store'
import { useLang } from '@/lib/lang-context'
import Navbar from '@/components/Navbar'
import DataForm from '@/components/DataForm'

interface DocumentData {
  id: string; fileName: string; fileUrl: string
  status: 'processing' | 'completed' | 'failed'
  extractedData: ExtractedData | null; errorMessage?: string | null
  createdAt: string; clientId?: string | null
  client?: { id: string; name: string } | null
}

export default function DocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { t } = useLang()
  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  async function fetchDoc() {
    const res = await fetch(`/api/documents/${params.id}`)
    if (res.status === 401) { router.push('/login'); return }
    if (res.status === 404) { router.push('/dashboard'); return }
    const data = await res.json()
    setDoc(data.document); setLoading(false)
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.user) router.push('/login'); else setUser(d.user) })
    fetchDoc()
  }, [params.id])

  useEffect(() => {
    if (!doc || doc.status !== 'processing') return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/documents/${params.id}`)
      if (res.ok) { const data = await res.json(); if (data.document.status !== 'processing') { setDoc(data.document); clearInterval(interval) } }
    }, 3000)
    return () => clearInterval(interval)
  }, [doc?.status, params.id])

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/documents/${params.id}`, { method: 'POST' })
    setDoc((d) => d ? { ...d, status: 'processing', errorMessage: null } : d)
    setRetrying(false)
  }

  async function handleDelete() {
    if (!doc) return
    const confirmed = window.confirm(`Eliminar "${doc.fileName}"? Esta accion no se puede deshacer.`)
    if (!confirmed) return
    await fetch(`/api/documents/${params.id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  if (loading) return <div className="min-h-screen bg-paper grain"><Navbar /><div className="flex items-center justify-center h-[80vh]"><div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" /></div></div>
  if (!doc) return null

  return (
    <div className="min-h-screen bg-paper grain flex flex-col">
      <Navbar />
      <div className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-ink-muted hover:text-ink transition-colors">{t('dashboard')}</Link>
            <span className="text-border">/</span>
            <span className="text-ink font-medium truncate max-w-xs">{doc.fileName}</span>
          </div>
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            Eliminar
          </button>
        </div>
      </div>
      {doc.status === 'processing' && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-full animate-spin mx-auto mb-6" style={{ border: '3px solid #d97706', borderTopColor: 'transparent' }} />
          <h2 className="font-display text-2xl text-ink mb-2">{t('extracting')}</h2>
          <p className="text-ink-muted">{t('extractingSubtitle')}</p>
        </div>
      )}
      {doc.status === 'failed' && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="font-display text-2xl text-ink mb-2">{t('extractionFailed')}</h2>
          <p className="text-ink-muted mb-2">{doc.errorMessage || t('extractionFailed')}</p>
          <p className="text-sm text-ink-muted mb-8">{t('scannedWarning')}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleRetry} disabled={retrying} className="px-6 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-700 disabled:opacity-60 transition-all">
              {retrying ? t('retrying') : t('retryExtraction')}
            </button>
            <button onClick={handleDelete} className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-all">
              Eliminar documento
            </button>
          </div>
        </div>
      )}
      {doc.status === 'completed' && doc.extractedData && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r border-border flex flex-col bg-ink/5">
            <div className="px-5 py-3 border-b border-border bg-white flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('pdfPreview')}</span>
              <span className="text-xs text-ink-muted font-mono truncate max-w-[200px]">{doc.fileName}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={`/api/documents/${doc.id}/pdf`} className="w-full h-full border-0" title="PDF Preview" style={{ minHeight: 'calc(100vh - 160px)' }} />
            </div>
          </div>
          <div className="w-1/2 flex flex-col">
            <div className="px-5 py-3 border-b border-border bg-white">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{t('extractedData')}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <DataForm documentId={doc.id} initialData={doc.extractedData} initialClientId={doc.clientId} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
