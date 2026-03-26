'use client'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentStore, usePlanStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'
import UpgradeWall from './UpgradeWall'

interface UploadItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  documentId?: string
}

export default function FileUploader() {
  const router = useRouter()
  const addDocument = useDocumentStore((s) => s.addDocument)
  const { setPlanInfo } = usePlanStore()
  const { t } = useLang()
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [showUpgrade, setShowUpgrade] = useState(false)

  const refreshPlan = useCallback(() => {
    fetch('/api/plan').then(r => r.json()).then(d => { if (d.plan) setPlanInfo(d.plan) }).catch(() => {})
  }, [setPlanInfo])

  const uploadSingle = useCallback(async (file: File, index: number) => {
    setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'uploading' } : u))
    try {
      const formData = new FormData(); formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      if (res.status === 403 && data.limitReached) {
        setShowUpgrade(true)
        setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: 'Limite alcanzado' } : u))
        return
      }
      if (!res.ok) {
        setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: data.error || 'Error' } : u))
        return
      }
      addDocument({ id: data.documentId, fileName: file.name, status: 'processing', createdAt: new Date().toISOString() })
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'done', documentId: data.documentId } : u))
    } catch {
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: 'Error de red' } : u))
    }
  }, [router, addDocument])

  const handleFiles = useCallback(async (files: File[]) => {
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) return
    const tooBig = pdfFiles.filter(f => f.size > 10 * 1024 * 1024)
    if (tooBig.length > 0) return

    const newUploads: UploadItem[] = pdfFiles.map(f => ({ file: f, status: 'pending' as const }))
    setUploads(newUploads)

    // Upload sequentially to respect rate limits
    for (let i = 0; i < pdfFiles.length; i++) {
      await uploadSingle(pdfFiles[i], i)
    }
    refreshPlan()

    // Clear completed uploads after 3 seconds
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status === 'error'))
    }, 3000)
  }, [uploadSingle, refreshPlan])

  const isUploading = uploads.some(u => u.status === 'uploading' || u.status === 'pending')
  const completedCount = uploads.filter(u => u.status === 'done').length
  const totalCount = uploads.length

  return (
    <div className="w-full">
      {showUpgrade && <UpgradeWall onClose={() => setShowUpgrade(false)} />}

      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setIsDragging(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length > 0) handleFiles(files)
        }}
        className={`relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${isDragging ? 'border-amber bg-amber-light scale-[1.01]' : 'border-border bg-cream hover:border-ink-300 hover:bg-white'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
        <input type="file" accept=".pdf" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) handleFiles(files); e.target.value = '' }} disabled={isUploading} />
        <div className="flex flex-col items-center gap-3 text-center px-4">
          {isUploading ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-amber border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-ink">Subiendo {completedCount}/{totalCount}...</p>
              {/* Progress bar */}
              <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-amber rounded-full transition-all duration-300" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
              </div>
            </>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-amber text-white' : 'bg-white border border-border text-ink-muted'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{t('dropPDF')} <span className="text-amber">{t('browse')}</span></p>
                <p className="text-xs text-ink-muted mt-1">PDF hasta 10MB · Puedes subir varios a la vez</p>
              </div>
            </>
          )}
        </div>
      </label>

      {/* Upload status list */}
      {uploads.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {uploads.map((u, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              u.status === 'done' ? 'bg-green-50 text-green-700'
              : u.status === 'error' ? 'bg-red-50 text-red-700'
              : u.status === 'uploading' ? 'bg-amber-50 text-amber-700'
              : 'bg-cream text-ink-muted'
            }`}>
              {u.status === 'uploading' && <div className="w-3.5 h-3.5 border-2 border-amber border-t-transparent rounded-full animate-spin" />}
              {u.status === 'done' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              {u.status === 'error' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
              {u.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full bg-ink-200" />}
              <span className="truncate flex-1">{u.file.name}</span>
              {u.error && <span className="text-xs">{u.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
