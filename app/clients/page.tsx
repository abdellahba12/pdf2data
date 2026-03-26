'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Client {
  id: string; name: string; cif?: string; address?: string; email?: string; phone?: string
  _count?: { documents: number }
}

export default function ClientsPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', cif: '', address: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.user) router.push('/login'); else setUser(d.user) })
    fetchClients()
  }, [router, setUser])

  async function fetchClients() {
    const res = await fetch('/api/clients')
    const data = await res.json()
    if (data.clients) setClients(data.clients)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    if (editing) {
      await fetch(`/api/clients/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    await fetchClients()
    setShowForm(false); setEditing(null); setForm({ name: '', cif: '', address: '', email: '', phone: '' }); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este cliente? Las facturas asociadas se desvincularan.')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    setClients(c => c.filter(x => x.id !== id))
  }

  function openEdit(client: Client) {
    setEditing(client)
    setForm({ name: client.name, cif: client.cif || '', address: client.address || '', email: client.email || '', phone: client.phone || '' })
    setShowForm(true)
  }

  return (
    <div className="min-h-screen bg-paper grain">
      <Navbar />
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-ink-muted hover:text-ink transition-colors">Dashboard</Link>
          <span className="text-border">/</span>
          <span className="text-ink font-medium">Clientes</span>
        </div>
      </div>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-ink mb-1">Clientes</h1>
            <p className="text-ink-muted text-sm">{clients.length} cliente{clients.length !== 1 ? 's' : ''} · Asigna clientes a tus facturas para mejor organizacion</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', cif: '', address: '', email: '', phone: '' }) }}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-700 transition-all">
            + Nuevo cliente
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up">
              <h2 className="font-display text-2xl text-ink mb-6">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <div className="space-y-4">
                {[
                  { label: 'Nombre *', k: 'name' as const },
                  { label: 'CIF / NIF', k: 'cif' as const },
                  { label: 'Direccion', k: 'address' as const },
                  { label: 'Email', k: 'email' as const },
                  { label: 'Telefono', k: 'phone' as const },
                ].map(({ label, k }) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">{label}</label>
                    <input type="text" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-ink text-sm focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border text-ink rounded-lg text-sm font-medium hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !form.name}
                  className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" /></div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20 text-ink-muted">
            <p className="text-sm">No hay clientes. Crea el primero para asignarlo a tus facturas.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead><tr className="bg-cream border-b border-border">
                {['Nombre', 'CIF', 'Email', 'Facturas', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border bg-white">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-ink text-sm">{client.name}</td>
                    <td className="px-5 py-4 text-sm text-ink-muted font-mono">{client.cif || '-'}</td>
                    <td className="px-5 py-4 text-sm text-ink-muted">{client.email || '-'}</td>
                    <td className="px-5 py-4 text-sm text-ink-muted">{client._count?.documents || 0}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEdit(client)} className="text-xs text-amber hover:text-amber-700 font-medium">Editar</button>
                        <button onClick={() => handleDelete(client.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
