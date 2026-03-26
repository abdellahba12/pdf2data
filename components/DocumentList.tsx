'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Document, useDocumentStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'

interface DocWithClient extends Document {
  client?: { id: string; name: string } | null
  clientId?: string | null
}

interface Props { documents: DocWithClient[] }

function StatusBadge({ status }: { status: Document['status'] }) {
  const { t } = useLang()
  const map = {
    processing: { label: t('statusProcessing'), className: 'status-processing' },
    completed:  { label: t('statusCompleted'),  className: 'status-completed'  },
    failed:     { label: t('statusFailed'),     className: 'status-failed'     },
  }
  const { label, className } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      {status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-soft" />}
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DocumentList({ documents }: Props) {
  const { t } = useLang()
  const setDocuments = useDocumentStore((s) => s.setDocuments)
  const allDocs = useDocumentStore((s) => s.documents)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string, fileName: string) {
    const confirmed = window.confirm(`Eliminar "${fileName}"? Esta accion no se puede deshacer.`)
    if (!confirmed) return
    setDeleting(id)
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDocuments(allDocs.filter(d => d.id !== id))
    }
    setDeleting(null)
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-20 text-ink-muted">
        <svg className="w-10 h-10 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm">{t('noDocuments')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full">
        <thead><tr className="bg-cream border-b border-border">
          {[t('file'), 'Cliente', t('uploaded'), t('status'), ''].map((h, i) => (
            <th key={i} className={`px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider ${i === 2 ? 'hidden sm:table-cell' : ''} ${i === 4 ? 'text-right' : ''}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-border bg-white">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-cream/50 transition-colors group">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-ink/5 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-muted">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-ink truncate max-w-[180px]">{doc.fileName}</span>
                </div>
              </td>
              <td className="px-5 py-4">
                {doc.client ? (
                  <span className="text-xs font-medium text-ink bg-cream px-2 py-1 rounded">{doc.client.name}</span>
                ) : (
                  <span className="text-xs text-ink-muted">—</span>
                )}
              </td>
              <td className="px-5 py-4 hidden sm:table-cell">
                <span className="text-xs text-ink-muted font-mono">{formatDate(doc.createdAt)}</span>
              </td>
              <td className="px-5 py-4"><StatusBadge status={doc.status} /></td>
              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/document/${doc.id}`}
                    className={`text-sm font-medium transition-colors ${doc.status === 'processing' ? 'text-ink-muted pointer-events-none' : 'text-amber hover:text-amber-700'}`}>
                    {t('view')}
                  </Link>
                  <button onClick={() => handleDelete(doc.id, doc.fileName)} disabled={deleting === doc.id}
                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 ml-2">
                    {deleting === doc.id ? '...' : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
