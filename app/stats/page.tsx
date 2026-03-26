'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface StatsData {
  months: { label: string; count: number; total: number }[]
  statusCounts: { draft: number; sent: number; paid: number; overdue: number }
  totalRevenue: number; totalDocs: number; completedDocs: number; pendingRevenue: number
}

function formatEUR(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function StatsPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.user) router.push('/login'); else setUser(d.user) })
    fetch('/api/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
  }, [router, setUser])

  if (loading) return <div className="min-h-screen bg-paper grain"><Navbar /><div className="flex items-center justify-center h-[80vh]"><div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" /></div></div>
  if (!stats) return null

  const maxMonthTotal = Math.max(...stats.months.map(m => m.total), 1)
  const statusColors: Record<string, string> = { draft: 'bg-ink-200', sent: 'bg-blue-400', paid: 'bg-green-500', overdue: 'bg-red-500' }
  const statusLabels: Record<string, string> = { draft: 'Borrador', sent: 'Enviada', paid: 'Pagada', overdue: 'Vencida' }

  return (
    <div className="min-h-screen bg-paper grain">
      <Navbar />
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-ink-muted hover:text-ink transition-colors">Dashboard</Link>
          <span className="text-border">/</span>
          <span className="text-ink font-medium">Estadisticas</span>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl text-ink mb-8">Estadisticas</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Facturacion total', value: formatEUR(stats.totalRevenue) },
            { label: 'Documentos procesados', value: String(stats.completedDocs) },
            { label: 'Facturas pagadas', value: String(stats.statusCounts.paid) },
            { label: 'Pendiente de cobro', value: formatEUR(stats.pendingRevenue) },
          ].map(card => (
            <div key={card.label} className="bg-white border border-border rounded-xl p-5">
              <div className="font-display text-2xl text-ink">{card.value}</div>
              <div className="text-xs text-ink-muted mt-1">{card.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest mb-6">Facturacion mensual</h2>
            <div className="flex items-end gap-3 h-40">
              {stats.months.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-ink-muted font-mono">{m.total > 0 ? `${Math.round(m.total / 1000)}k` : ''}</div>
                  <div className="w-full bg-amber rounded-t-md transition-all"
                    style={{ height: `${Math.max((m.total / maxMonthTotal) * 120, m.total > 0 ? 8 : 2)}px`, opacity: m.total > 0 ? 1 : 0.2 }} />
                  <div className="text-xs text-ink-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-ink uppercase tracking-widest mb-6">Estado facturas</h2>
            <div className="space-y-4">
              {Object.entries(stats.statusCounts).map(([status, count]) => {
                const total = Object.values(stats.statusCounts).reduce((a, b) => a + b, 0) || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-ink">{statusLabels[status] || status}</span>
                      <span className="text-sm font-mono text-ink-muted">{count}</span>
                    </div>
                    <div className="h-2 bg-cream rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${statusColors[status] || 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
