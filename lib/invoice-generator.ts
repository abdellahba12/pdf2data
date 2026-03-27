import { ExtractedInvoiceData } from './ai'
import { CompanyStyle, getDefaultStyle } from './style-analyzer'

export interface CompanyInfo {
  name: string; cif: string; address: string; phone: string
  email: string; iban: string; logoUrl?: string; style?: CompanyStyle
}

function fmt(amount: number | null, currency: string = 'EUR'): string {
  if (amount === null || amount === undefined) return '-'
  const formatted = amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (currency === 'EUR') return `${formatted} €`
  if (currency === 'USD') return `$${formatted}`
  if (currency === 'GBP') return `£${formatted}`
  return `${formatted} ${currency}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}.${m}.${y}`
  } catch { return dateStr }
}

export function generateInvoiceHTML(
  data: ExtractedInvoiceData,
  company: CompanyInfo,
  invoiceNumber?: string
): string {
  const style: CompanyStyle = company.style || getDefaultStyle()
  const currency = data.currency || 'EUR'
  const pc = style.primaryColor || '#1a2b6b'

  // Calculate amounts
  const lineItemsTotal = (data.line_items || []).reduce((sum, item) => sum + (item.total || 0), 0)
  let subtotal = lineItemsTotal > 0 ? lineItemsTotal : (data.total_amount || 0)
  let taxAmount = data.tax_amount || 0
  let totalAmount = data.total_amount || 0
  let taxRate = 21

  if (taxAmount && totalAmount) {
    subtotal = totalAmount - taxAmount
    if (subtotal > 0) taxRate = Math.round((taxAmount / subtotal) * 100)
  } else if (totalAmount && !taxAmount) {
    subtotal = totalAmount
    taxAmount = 0
  }

  const displaySubtotal = subtotal > 0 ? subtotal : totalAmount

  // Line items
  const lineItemsHTML = (data.line_items || []).map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:11px;">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:center;font-size:11px;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:right;font-size:11px;">${fmt(item.unit_price, currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:right;font-size:11px;">${fmt(item.total, currency)}</td>
    </tr>`).join('')

  // Bars
  const topBar = style.hasTopBar ? `<div style="height:6px;background:${pc};"></div>` : ''
  const bottomBar = style.hasBottomBar ? `<div style="height:6px;background:${pc};"></div>` : ''

  // Logo — position-aware
  const logoHTML = company.logoUrl
    ? `<img src="${company.logoUrl}" style="max-height:60px;max-width:180px;object-fit:contain;" alt="Logo" />`
    : `<div style="font-size:20px;font-weight:700;color:${pc};">${company.name}</div>`

  const logoAlign = style.logoPosition === 'right' ? 'right'
    : style.logoPosition === 'center' ? 'center'
    : 'left'

  // Client name: use extracted client_name (who the invoice is addressed TO)
  const clientName = data.client_name || ''

  const displayInvoiceNumber = invoiceNumber || data.invoice_number || '-'

  // Language-aware labels
  const lang = style.language || 'es'
  const labels = {
    desc: lang === 'ca' ? 'Descripció' : lang === 'en' ? 'Description' : 'Descripcion',
    units: lang === 'ca' ? 'Unitats' : lang === 'en' ? 'Units' : 'Unidades',
    price: lang === 'ca' ? 'Preu' : lang === 'en' ? 'Price' : 'Precio',
    payment: lang === 'ca' ? 'Forma pagament:' : lang === 'en' ? 'Payment method:' : 'Forma pago:',
    reference: lang === 'ca' ? 'Referència' : lang === 'en' ? 'Reference' : 'Referencia',
    client: lang === 'ca' ? 'Client' : lang === 'en' ? 'Client' : 'Cliente',
    subtotal: style.subtotalLabel || 'Base imponible',
    tax: style.taxLabel || 'IVA',
    total: style.totalLabel || 'TOTAL FACTURA',
    title: style.invoiceTitle || 'Factura',
    dateLabel: lang === 'ca' ? 'Data' : lang === 'en' ? 'Date' : 'Fecha',
    numLabel: lang === 'en' ? 'Invoice No.' : 'N° de factura',
    dueLabel: lang === 'ca' ? 'Venciment' : lang === 'en' ? 'Due date' : 'Vencimiento',
  }

  const footerText = style.footerText || ''

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:${style.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, Helvetica, sans-serif'};color:#222;background:white;font-size:12px;}
  .page{width:210mm;min-height:297mm;margin:0 auto;background:white;position:relative;}
  .content{padding:24px 32px;}
  table{width:100%;border-collapse:collapse;}
  @media print{body{margin:0;}.page{margin:0;width:100%;}}
</style>
</head>
<body>
<div class="page">
  ${topBar}
  <div class="content">

    <!-- HEADER: logo + invoice title -->
    <table style="margin-bottom:20px;">
      <tr>
        <td style="width:55%;vertical-align:top;text-align:${logoAlign};">${logoHTML}</td>
        <td style="width:45%;text-align:right;vertical-align:top;">
          <div style="font-size:32px;color:#bbb;font-weight:300;letter-spacing:2px;font-family:Georgia,serif;">${labels.title}</div>
        </td>
      </tr>
    </table>

    <!-- COMPANY INFO + META -->
    <table style="margin-bottom:20px;">
      <tr>
        <td style="width:55%;vertical-align:top;font-size:11px;line-height:1.7;color:#444;">
          <strong>CIF:</strong> ${company.cif}<br/>
          ${company.address}<br/>
          <strong>Tel.</strong> ${company.phone}<br/>
          <a href="mailto:${company.email}" style="color:${pc};text-decoration:none;">${company.email}</a>
        </td>
        <td style="width:45%;vertical-align:top;text-align:right;">
          <table style="width:auto;margin-left:auto;">
            <tr>
              <td style="padding:3px 12px;text-align:right;color:${pc};font-weight:600;font-size:11px;border-bottom:1px solid #e0e0e0;">${labels.dateLabel}</td>
              <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #e0e0e0;">${formatDate(data.invoice_date)}</td>
            </tr>
            <tr>
              <td style="padding:3px 12px;text-align:right;color:${pc};font-weight:600;font-size:11px;border-bottom:1px solid #e0e0e0;">${labels.numLabel}</td>
              <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #e0e0e0;">${displayInvoiceNumber}</td>
            </tr>
            ${data.due_date ? `<tr>
              <td style="padding:3px 12px;text-align:right;color:${pc};font-weight:600;font-size:11px;border-bottom:1px solid #e0e0e0;">${labels.dueLabel}</td>
              <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #e0e0e0;">${formatDate(data.due_date)}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <!-- DIVIDER -->
    <div style="border-top:2px solid ${pc};margin-bottom:16px;"></div>

    <!-- REFERENCE + CLIENT -->
    <table style="margin-bottom:20px;">
      <tr>
        <td style="width:30%;vertical-align:top;font-size:11px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;margin-bottom:4px;">${labels.reference}</div>
          <div style="border-bottom:1px solid #ddd;padding-bottom:4px;">${data.invoice_number || '-'}</div>
        </td>
        <td style="width:5%;"></td>
        <td style="width:65%;vertical-align:top;font-size:11px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;margin-bottom:4px;">${labels.client}</div>
          <div style="border-bottom:1px solid #ddd;padding-bottom:4px;"><strong>${clientName}</strong></div>
        </td>
      </tr>
    </table>

    <!-- LINE ITEMS -->
    <table style="margin-bottom:0;border:1px solid #ddd;">
      <thead>
        <tr style="background:${style.headerBg || pc};color:${style.headerText || '#fff'};">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;">${labels.desc}</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;width:70px;">${labels.units}</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;width:100px;">${labels.price}</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;width:100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHTML}
        ${(data.line_items || []).length < 5 ? '<tr><td colspan="4" style="padding:8px;"></td></tr>' : ''}
      </tbody>
    </table>

    <!-- TOTALS -->
    <table style="border:1px solid #ddd;border-top:none;">
      <tr>
        <td style="padding:12px;font-size:11px;color:#555;width:50%;vertical-align:top;">
          ${labels.payment}<br/>
          <span style="font-size:10px;color:#777;">IBAN: ${company.iban}</span>
        </td>
        <td style="padding:12px;width:50%;vertical-align:top;">
          <table style="width:100%;">
            <tr>
              <td style="padding:4px 8px;text-align:left;font-size:11px;color:#555;">${labels.subtotal}</td>
              <td style="padding:4px 8px;text-align:right;font-size:11px;">${fmt(displaySubtotal, currency)}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;text-align:left;font-size:11px;color:#555;">${labels.tax} ${taxRate > 0 ? `${taxRate}%` : ''}</td>
              <td style="padding:4px 8px;text-align:right;font-size:11px;">${fmt(taxAmount, currency)}</td>
            </tr>
            <tr>
              <td style="padding:8px;text-align:left;font-size:13px;font-weight:700;border-top:2px solid ${pc};">${labels.total}</td>
              <td style="padding:8px;text-align:right;font-size:13px;font-weight:700;border-top:2px solid ${pc};">${fmt(totalAmount, currency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

  </div>

  <!-- FOOTER -->
  ${footerText ? `<div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:9px;color:#999;padding:0 32px;">${footerText}</div>` : ''}

  ${bottomBar}
</div>
</body>
</html>`
}
