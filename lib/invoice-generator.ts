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

  // Calculate amounts properly
  const lineItemsTotal = (data.line_items || []).reduce((sum, item) => sum + (item.total || 0), 0)
  const subtotal = lineItemsTotal > 0 ? lineItemsTotal : (data.total_amount || 0)

  // Determine tax rate and amounts
  let taxRate = 21 // default
  let taxAmount = data.tax_amount || 0
  let totalAmount = data.total_amount || 0

  if (data.tax_amount && data.total_amount) {
    // If we have both, calculate the subtotal as total - tax
    const calculatedSubtotal = data.total_amount - data.tax_amount
    if (calculatedSubtotal > 0) {
      taxRate = Math.round((data.tax_amount / calculatedSubtotal) * 100)
    }
  } else if (data.total_amount && !data.tax_amount) {
    // If only total, assume it includes 21% IVA
    taxAmount = 0
    totalAmount = data.total_amount
  }

  const displaySubtotal = totalAmount - taxAmount > 0 ? totalAmount - taxAmount : subtotal

  // Line items HTML
  const lineItemsHTML = (data.line_items || []).map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:11px;color:#222;">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:center;font-size:11px;color:#222;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:right;font-size:11px;color:#222;">${fmt(item.unit_price, currency)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:right;font-size:11px;color:#222;">${fmt(item.total, currency)}</td>
    </tr>`).join('')

  // Top/bottom colored bars
  const topBar = style.hasTopBar
    ? `<div style="height:6px;background:${style.primaryColor};"></div>`
    : ''
  const bottomBar = style.hasBottomBar
    ? `<div style="height:6px;background:${style.primaryColor};"></div>`
    : ''

  // Logo
  const logoHTML = company.logoUrl
    ? `<img src="${company.logoUrl}" style="max-height:60px;max-width:180px;object-fit:contain;" alt="Logo" />`
    : `<div style="font-size:20px;font-weight:700;color:${style.primaryColor};">${company.name}</div>`

  // The vendor_name from extracted data is the CLIENT (who we're billing)
  // Company info is the ISSUER (our company)
  const clientName = data.vendor_name || ''
  const displayInvoiceNumber = invoiceNumber || data.invoice_number || '-'

  return `<!DOCTYPE html>
<html lang="${style.language || 'es'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:${style.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'Arial, Helvetica, sans-serif'};color:#222;background:white;font-size:12px;}
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

    <!-- HEADER: Logo + Factura title -->
    <table style="margin-bottom:20px;">
      <tr>
        <td style="width:55%;vertical-align:top;">${logoHTML}</td>
        <td style="width:45%;text-align:right;vertical-align:top;">
          <div style="font-size:32px;color:#aab;font-weight:300;letter-spacing:2px;font-family:Georgia,serif;">${style.invoiceTitle || 'Factura'}</div>
        </td>
      </tr>
    </table>

    <!-- COMPANY INFO (issuer) + INVOICE META -->
    <table style="margin-bottom:20px;">
      <tr>
        <td style="width:55%;vertical-align:top;font-size:11px;line-height:1.7;color:#444;">
          <strong>CIF:</strong> ${company.cif}<br/>
          ${company.address}<br/>
          <strong>Tel.</strong> ${company.phone}<br/>
          <a href="mailto:${company.email}" style="color:${style.primaryColor};text-decoration:none;">${company.email}</a>
        </td>
        <td style="width:45%;vertical-align:top;text-align:right;font-size:11px;line-height:2;">
          <table style="width:auto;margin-left:auto;">
            <tr>
              <td style="padding:2px 12px;text-align:right;color:${style.primaryColor};font-weight:600;font-size:11px;border-bottom:1px solid #e0e0e0;">Data</td>
              <td style="padding:2px 12px;text-align:right;font-size:11px;border-bottom:1px solid #e0e0e0;">${formatDate(data.invoice_date)}</td>
            </tr>
            <tr>
              <td style="padding:2px 12px;text-align:right;color:${style.primaryColor};font-weight:600;font-size:11px;border-bottom:1px solid #e0e0e0;">N° de factura</td>
              <td style="padding:2px 12px;text-align:right;font-size:11px;border-bottom:1px solid #e0e0e0;">${displayInvoiceNumber}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- DIVIDER -->
    <div style="border-top:2px solid ${style.primaryColor};margin-bottom:16px;"></div>

    <!-- REFERENCE + CLIENT -->
    <table style="margin-bottom:20px;">
      <tr>
        <td style="width:30%;vertical-align:top;font-size:11px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;margin-bottom:4px;">Referencia</div>
          <div style="border-bottom:1px solid #ddd;padding-bottom:4px;">${data.invoice_number || '-'}</div>
        </td>
        <td style="width:5%;"></td>
        <td style="width:65%;vertical-align:top;font-size:11px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;margin-bottom:4px;">Client</div>
          <div style="border-bottom:1px solid #ddd;padding-bottom:4px;">
            <strong>${clientName}</strong>
          </div>
        </td>
      </tr>
    </table>

    <!-- LINE ITEMS TABLE -->
    <table style="margin-bottom:0;border:1px solid #ddd;">
      <thead>
        <tr style="background:${style.headerBg || style.primaryColor};color:${style.headerText || '#fff'};">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;">${style.language === 'ca' ? 'Descripció' : 'Descripcion'}</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;width:70px;">${style.language === 'ca' ? 'Unitats' : 'Unidades'}</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;width:100px;">${style.language === 'ca' ? 'Preu' : 'Precio'}</th>
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
          ${style.language === 'ca' ? 'Forma pagament:' : 'Forma pago:'}<br/>
          <span style="font-size:10px;color:#777;">IBAN: ${company.iban}</span>
        </td>
        <td style="padding:12px;width:50%;vertical-align:top;">
          <table style="width:100%;">
            <tr>
              <td style="padding:4px 8px;text-align:left;font-size:11px;color:#555;">${style.subtotalLabel || 'Total parcial'}</td>
              <td style="padding:4px 8px;text-align:right;font-size:11px;">${fmt(displaySubtotal, currency)}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;text-align:left;font-size:11px;color:#555;">${style.taxLabel || 'IVA'}</td>
              <td style="padding:4px 8px;text-align:right;font-size:11px;">${taxRate},00%</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;text-align:left;font-size:11px;color:#555;">Total ${style.taxLabel || 'IVA'}</td>
              <td style="padding:4px 8px;text-align:right;font-size:11px;">${fmt(taxAmount, currency)}</td>
            </tr>
            <tr>
              <td style="padding:8px;text-align:left;font-size:13px;font-weight:700;border-top:2px solid ${style.primaryColor};">${style.totalLabel || 'TOTAL FACTURA'}</td>
              <td style="padding:8px;text-align:right;font-size:13px;font-weight:700;border-top:2px solid ${style.primaryColor};">${fmt(totalAmount, currency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

  </div>

  <!-- FOOTER -->
  <div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:9px;color:#999;padding:0 32px;">
    Inscrita en el Registre Mercantil de Barcelona
  </div>

  ${bottomBar}
</div>
</body>
</html>`
}
