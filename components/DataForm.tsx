'use client'
import { useState, useEffect } from 'react'
import { ExtractedData, LineItem } from '@/lib/store'
import { useLang } from '@/lib/lang-context'

interface ClientOption { id: string; name: string; cif?: string }

interface Props {
  documentId: string
  initialData: ExtractedData
  initialClientId?: string | null
  onSaved?: () => void
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number | null; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-ink text-sm focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 transition-all font-mono" />
    </div>
  )
}

export default function DataForm({ documentId, initialData, initialClientId, onSaved }: Props) {
  const { t } = useLang()
  const [data, setData] = useState<ExtractedData>(initialData)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedOk, setSavedOk] = useState(false)
  const [exportLoading, setExportLoading] = useState<'xlsx' | 'csv' | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  // Client management
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCIF, setNewClientCIF] = useState('')

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => { if (d.clients) setClients(d.clients) }).catch(() => {})
  }, [])

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    const res = await fetch('/api/clients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName, cif: newClientCIF }),
    })
    const data = await res.json()
    if (res.ok && data.client) {
      setClients(prev => [...prev, data.client])
      setSelectedClientId(data.client.id)
      setShowNewClient(false)
      setNewClientName('')
      setNewClientCIF('')
    }
  }

  async function handleAssignClient(clientId: string) {
    setSelectedClientId(clientId)
    await fetch(`/api/documents/${documentId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: clientId || null }),
    })
  }

  async function handleGenerateInvoice() {
    setGeneratingInvoice(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/invoice`)
      if (!res.ok) return
      const html = await res.text()
      const win = window.open('', '_blank')
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800) }
    } finally { setGeneratingInvoice(false) }
  }

  function setField<K extends keyof ExtractedData>(key: K, value: ExtractedData[K]) { setData((d) => ({ ...d, [key]: value })); setSavedOk(false) }
  function setLineItem(index: number, field: keyof LineItem, value: string) {
    setData((d) => {
      const items = [...(d.line_items || [])]
      items[index] = { ...items[index], [field]: field === 'description' ? value : parseFloat(value) || 0 }
      return { ...d, line_items: items }
    }); setSavedOk(false)
  }
  function addLineItem() { setData((d) => ({ ...d, line_items: [...(d.line_items || []), { description: '', quantity: 1, unit_price: 0, total: 0 }] })) }
  function removeLineItem(index: number) { setData((d) => ({ ...d, line_items: d.line_items.filter((_, i) => i !== index) })) }

  async function handleSave() {
    setSaving(true); setSaveError('')
    const res = await fetch(`/api/documents/${documentId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extractedData: data, clientId: selectedClientId || null }),
    })
    setSaving(false)
    if (res.ok) { setSavedOk(true); onSaved?.(); setTimeout(() => setSavedOk(false), 3000) }
    else { const d = await res.json(); setSaveError(d.error || 'Error') }
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    setExportLoading(format)
    try {
      const res = await fetch(`/api/documents/${documentId}/export?format=${format}`)
      if (!res.ok) return
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${documentId}.${format}`; a.click(); URL.revokeObjectURL(url)
    } finally { setExportLoading(null) }
  }

  const Spinner = () => <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>

  return (
    <div className="flex flex-col h-full">
      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-700 disabled:opacity-60 transition-all">
          {saving ? <Spinner /> : null} {saving ? t('saving') : t('save')}
        </button>
        <button onClick={handleGenerateInvoice} disabled={generatingInvoice} className="flex items-center gap-2 px-4 py-2 bg-amber text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-all">
          {generatingInvoice ? <Spinner /> : null} Generar Factura
        </button>
        <button onClick={() => handleExport('xlsx')} disabled={exportLoading !== null} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-all">
          {exportLoading === 'xlsx' ? <Spinner /> : null} {t('exportExcel')}
        </button>
        <button onClick={() => handleExport('csv')} disabled={exportLoading !== null} className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-ink rounded-lg text-sm font-medium hover:bg-cream disabled:opacity-60 transition-all">
          {exportLoading === 'csv' ? <Spinner /> : null} {t('exportCSV')}
        </button>
        {savedOk && <span className="text-sm text-green-600 font-medium flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{t('saved')}</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Client selector */}
        <div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-4 pb-2 border-b border-border">Cliente</h3>
          <div className="flex items-center gap-2">
            <select value={selectedClientId} onChange={(e) => handleAssignClient(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-ink text-sm focus:outline-none focus:border-amber transition-all">
              <option value="">— Sin cliente asignado —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.cif ? ` (${c.cif})` : ''}</option>)}
            </select>
            <button onClick={() => setShowNewClient(!showNewClient)}
              className="px-3 py-2 border border-border rounded-lg text-sm text-amber hover:bg-amber-light transition-all">
              + Nuevo
            </button>
          </div>
          {showNewClient && (
            <div className="mt-3 p-3 bg-cream rounded-lg space-y-2">
              <input type="text" placeholder="Nombre del cliente" value={newClientName} onChange={e => setNewClientName(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-border bg-white text-sm text-ink focus:outline-none focus:border-amber" />
              <input type="text" placeholder="CIF (opcional)" value={newClientCIF} onChange={e => setNewClientCIF(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-border bg-white text-sm text-ink focus:outline-none focus:border-amber" />
              <div className="flex gap-2">
                <button onClick={handleCreateClient} disabled={!newClientName.trim()}
                  className="px-3 py-1.5 bg-ink text-white rounded text-xs font-medium hover:bg-ink-700 disabled:opacity-50">Crear</button>
                <button onClick={() => setShowNewClient(false)} className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink">Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Invoice details */}
        <div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-4 pb-2 border-b border-border">{t('invoiceDetails')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label={t('vendorName')} value={data.vendor_name} onChange={(v) => setField('vendor_name', v)} /></div>
            <div className="col-span-2"><Field label={t('clientName')} value={data.client_name} onChange={(v) => setField('client_name', v)} /></div>
            <Field label={t('invoiceNumber')} value={data.invoice_number} onChange={(v) => setField('invoice_number', v)} />
            <Field label={t('currency')} value={data.currency} onChange={(v) => setField('currency', v)} />
            <Field label={t('invoiceDate')} value={data.invoice_date} onChange={(v) => setField('invoice_date', v)} type="date" />
            <Field label={t('dueDate')} value={data.due_date} onChange={(v) => setField('due_date', v)} type="date" />
          </div>
        </div>

        {/* Amounts */}
        <div>
          <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-4 pb-2 border-b border-border">{t('amounts')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('taxAmount')} value={data.tax_amount} onChange={(v) => setField('tax_amount', parseFloat(v) || null)} type="number" />
            <Field label={t('totalAmount')} value={data.total_amount} onChange={(v) => setField('total_amount', parseFloat(v) || null)} type="number" />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <h3 className="text-xs font-bold text-ink uppercase tracking-widest">{t('lineItems')}</h3>
            <button onClick={addLineItem} className="text-xs text-amber hover:text-amber-700 font-medium flex items-center gap-1">{t('addRow')}</button>
          </div>
          <div className="space-y-3">
            {(data.line_items || []).map((item, index) => (
              <div key={index} className="bg-cream rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">#{index + 1}</span>
                  <button onClick={() => removeLineItem(index)} className="text-xs text-red-400 hover:text-red-600">{t('remove')}</button>
                </div>
                <div><label className="block text-xs text-ink-muted mb-1">{t('description')}</label>
                  <input type="text" value={item.description} onChange={(e) => setLineItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-border bg-white text-sm text-ink focus:outline-none focus:border-amber transition-all" /></div>
                <div className="grid grid-cols-3 gap-2">
                  {([['quantity', t('quantity')], ['unit_price', t('unitPrice')], ['total', t('lineTotal')]] as [keyof LineItem, string][]).map(([field, label]) => (
                    <div key={field}><label className="block text-xs text-ink-muted mb-1">{label}</label>
                      <input type="number" value={item[field]} onChange={(e) => setLineItem(index, field, e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-border bg-white text-sm text-ink focus:outline-none focus:border-amber transition-all font-mono" /></div>
                  ))}
                </div>
              </div>
            ))}
            {(!data.line_items || data.line_items.length === 0) && <div className="text-center py-8 text-ink-muted text-sm border border-dashed border-border rounded-lg">{t('noLineItems')}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
