/**
 * Rule-based invoice data extraction for Spanish invoices.
 * Runs BEFORE Gemini AI - fast, free, reliable.
 * Gemini is only used as fallback for fields not found by rules.
 */

export interface PartialInvoiceData {
  vendor_name?: string | null
  client_name?: string | null
  invoice_number?: string | null
  invoice_date?: string | null
  due_date?: string | null
  total_amount?: number | null
  currency?: string | null
  tax_amount?: number | null
  subtotal?: number | null
  tax_rate?: number | null
  line_items?: { description: string; quantity: number; unit_price: number; total: number }[]
}

/** Parse a Spanish/European number like "1.234,56" into 1234.56 */
function parseEurNumber(str: string): number | null {
  if (!str) return null
  // Remove currency symbols and whitespace
  let clean = str.replace(/[€$£\s]/g, '').trim()
  if (!clean) return null
  // European format: 1.234,56 → remove dots, replace comma with dot
  if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  }
  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

/** Convert dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy to YYYY-MM-DD */
function parseDate(str: string): string | null {
  if (!str) return null
  str = str.trim()

  // Already YYYY-MM-DD
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return str

  // dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy
  m = str.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3]
    return `${year}-${month}-${day}`
  }

  // dd/mm/yy
  m = str.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`
    return `${year}-${month}-${day}`
  }

  return null
}

/** Extract a number near a keyword */
function findAmountNear(text: string, keywords: string[]): number | null {
  for (const kw of keywords) {
    // Pattern: keyword followed by amount on same line or next
    const patterns = [
      new RegExp(`${kw}[:\\s]*([\\d.,]+)\\s*€?`, 'i'),
      new RegExp(`${kw}[:\\s]*€?\\s*([\\d.,]+)`, 'i'),
      new RegExp(`${kw}[^\\n]*?([\\d]+[.,]\\d{2})\\s*€?`, 'i'),
    ]
    for (const re of patterns) {
      const match = text.match(re)
      if (match) {
        const num = parseEurNumber(match[1])
        if (num !== null && num > 0) return num
      }
    }
  }
  return null
}

/** Extract a date near a keyword */
function findDateNear(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    const re = new RegExp(`${kw}[:\\s]*([\\d]{1,2}[\/.\-][\\d]{1,2}[\/.\-][\\d]{2,4})`, 'i')
    const match = text.match(re)
    if (match) {
      const d = parseDate(match[1])
      if (d) return d
    }
  }
  // Also try to find any standalone date
  const anyDate = text.match(/(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/g)
  if (anyDate && anyDate.length > 0) {
    return parseDate(anyDate[0])
  }
  return null
}

/** Main rule-based extraction */
export function extractWithRules(text: string): PartialInvoiceData {
  const result: PartialInvoiceData = {}

  // === INVOICE DATE ===
  result.invoice_date = findDateNear(text, [
    'fecha de factura', 'fecha factura', 'fecha emision', 'fecha',
    'data factura', 'data', 'date', 'invoice date',
  ])

  // === DUE DATE ===
  result.due_date = findDateNear(text, [
    'fecha de vencimiento', 'fecha vencimiento', 'vencimiento',
    'due date', 'payment date', 'data venciment',
  ])

  // === INVOICE NUMBER ===
  const invoicePatterns = [
    /(?:factura|fra\.?|invoice|albaran|albara|pedido)\s*(?:n[°ºo.]?\s*|num\.?\s*|#\s*)?[:\s]*([A-Z0-9\/-]+\d+)/i,
    /(?:n[°ºo]\.?\s*(?:de\s+)?(?:factura|fra))[:\s]*([A-Z0-9\/-]+)/i,
    /(?:numero|num\.?)\s*[:\s]*([A-Z]{0,3}[\/\-]?\d{2,}[\/\-]?\d*)/i,
  ]
  for (const re of invoicePatterns) {
    const match = text.match(re)
    if (match) { result.invoice_number = match[1].trim(); break }
  }

  // === TOTAL AMOUNT ===
  result.total_amount = findAmountNear(text, [
    'total factura', 'total a pagar', 'importe total', 'total general',
    'total fra', 'import total', 'total invoice', 'TOTAL',
  ])

  // === TAX (IVA) ===
  // Try to find explicit IVA amount
  result.tax_amount = findAmountNear(text, [
    'total iva', 'importe iva', 'cuota iva', 'total IVA',
    'iva 21', 'iva 10', 'iva 4',
  ])

  // Try to find tax rate
  const rateMatch = text.match(/IVA\s*(\d{1,2})[,%]/i)
  if (rateMatch) {
    result.tax_rate = parseInt(rateMatch[1])
  }

  // === SUBTOTAL (base imponible) ===
  result.subtotal = findAmountNear(text, [
    'base imponible', 'subtotal', 'total parcial', 'base',
    'imponible', 'neto',
  ])

  // === Calculate missing amounts ===
  if (result.subtotal && !result.tax_amount) {
    const rate = result.tax_rate || 21
    result.tax_amount = Math.round(result.subtotal * rate / 100 * 100) / 100
  }
  if (result.subtotal && result.tax_amount && !result.total_amount) {
    result.total_amount = Math.round((result.subtotal + result.tax_amount) * 100) / 100
  }
  if (result.total_amount && !result.tax_amount) {
    const rate = result.tax_rate || 21
    result.tax_amount = Math.round(result.total_amount * rate / (100 + rate) * 100) / 100
  }

  // === VENDOR NAME ===
  // Usually the first line or near CIF/NIF
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2)
  const cifMatch = text.match(/(?:CIF|NIF|C\.I\.F|N\.I\.F)[:\s]*([A-Z]\d{7,8}[A-Z]?)/i)
  if (cifMatch) {
    // Look for company name near CIF - usually the line before
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/CIF|NIF/i) && i > 0) {
        const prevLine = lines[i - 1].trim()
        if (prevLine.length > 3 && prevLine.length < 80 && !prevLine.match(/factura|fecha|total|iva/i)) {
          result.vendor_name = prevLine
          break
        }
      }
    }
  }

  // === CLIENT NAME ===
  // Look for explicit client labels
  const clientPatterns = [
    /(?:cliente|client|destinatario|facturar\s+a|bill\s+to|a\/a)[:\s]+(.+)/i,
    /(?:nombre del cliente|razón social del cliente)[:\s]+(.+)/i,
    /(?:datos del cliente|datos cliente)\s*\n+\s*(.+)/i,
  ]
  for (const re of clientPatterns) {
    const m = text.match(re)
    if (m) {
      const candidate = m[1].trim().split('\n')[0].trim()
      if (candidate.length > 2 && candidate.length < 100 && !candidate.match(/factura|fecha|total|iva|cif|nif/i)) {
        result.client_name = candidate
        break
      }
    }
  }
  // Fallback: look for "NIF del cliente" and grab the line before it
  if (!result.client_name) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/nif\s+del\s+cliente|cif\s+del\s+cliente/i) && i > 0) {
        const prevLine = lines[i - 1].trim()
        if (prevLine.length > 3 && prevLine.length < 80 && !prevLine.match(/factura|fecha|total|iva/i)) {
          result.client_name = prevLine
          break
        }
      }
    }
  }

  // === CURRENCY ===
  if (text.includes('€') || text.match(/EUR/i)) {
    result.currency = 'EUR'
  } else if (text.includes('$') || text.match(/USD/i)) {
    result.currency = 'USD'
  } else {
    result.currency = 'EUR' // default for Spanish invoices
  }

  return result
}
