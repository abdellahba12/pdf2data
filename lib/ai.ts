import { GoogleGenerativeAI } from '@google/generative-ai'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface ExtractedInvoiceData {
  vendor_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  due_date: string | null
  total_amount: number | null
  currency: string | null
  tax_amount: number | null
  line_items: LineItem[]
}

const EXTRACTION_PROMPT = `You are an expert invoice and delivery note data extractor for Spanish businesses. Your job is to extract EVERY piece of data from the document text below.

CRITICAL RULES:
- ALWAYS look for dates. Invoices ALWAYS have a date. Look for patterns like "dd/mm/yyyy", "dd.mm.yyyy", "dd-mm-yyyy", "yyyy-mm-dd", or words like "Fecha", "Data", "Date", "Emision". Convert ANY date found to YYYY-MM-DD format.
- ALWAYS calculate tax. Spanish invoices use IVA (usually 21%). If you see "IVA" anywhere, extract the amount. If you see a subtotal (base imponible) and a total, calculate: tax = total - subtotal. If you only see a total and no tax info, assume 21% IVA and calculate: tax = total * 21 / 121.
- For vendor_name: extract the company or person name that ISSUED the document (the supplier/vendor), NOT the recipient.
- For invoice_number: look for "Factura", "Fra.", "Num", "N°", "Albaran", "Pedido", or any reference number.
- For currency: if you see "€" or "EUR" or amounts with comma as decimal separator, use "EUR".
- For line_items: extract EVERY line of products/services. Each must have description, quantity (default 1 if not specified), unit_price, and total.
- NEVER return null for invoice_date if there is ANY date in the document.
- NEVER return null for tax_amount - calculate it if not explicitly shown.
- NEVER return null for total_amount if there are ANY monetary amounts.

Return ONLY a valid JSON object with this schema (no explanation, no markdown):

{
  "vendor_name": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "currency": "EUR",
  "tax_amount": number or null,
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ]
}

Document text:
`

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function callGeminiWithRetry(
  model: any,
  prompt: string | any[],
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      return result.response.text().trim()
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.message?.includes('429')
      if (is429 && attempt < maxRetries) {
        const waitSec = Math.min(10 * (attempt + 1), 30)
        console.log(`Gemini rate limit hit, retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(waitSec * 1000)
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

export async function extractInvoiceDataWithGemini(
  text: string
): Promise<ExtractedInvoiceData> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = EXTRACTION_PROMPT + text.slice(0, 12000)
  const rawText = await callGeminiWithRetry(model, prompt)

  const jsonStr = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: ExtractedInvoiceData
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('Failed to parse Gemini response:', rawText)
    throw new Error('AI returned invalid JSON')
  }

  return validateAndClean(parsed)
}

export { callGeminiWithRetry }

function validateAndClean(data: ExtractedInvoiceData): ExtractedInvoiceData {
  let totalAmount = typeof data.total_amount === 'number' ? data.total_amount : null
  let taxAmount = typeof data.tax_amount === 'number' ? data.tax_amount : null

  // If we have total but no tax, calculate 21% IVA
  if (totalAmount && !taxAmount) {
    taxAmount = Math.round((totalAmount * 21 / 121) * 100) / 100
  }

  // If we have line items but no total, sum them
  if (!totalAmount && Array.isArray(data.line_items) && data.line_items.length > 0) {
    const subtotal = data.line_items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    taxAmount = Math.round((subtotal * 0.21) * 100) / 100
    totalAmount = Math.round((subtotal + taxAmount) * 100) / 100
  }

  return {
    vendor_name: typeof data.vendor_name === 'string' ? data.vendor_name : null,
    invoice_number: typeof data.invoice_number === 'string' ? data.invoice_number : null,
    invoice_date: isValidDate(data.invoice_date) ? data.invoice_date : null,
    due_date: isValidDate(data.due_date) ? data.due_date : null,
    total_amount: totalAmount,
    currency: typeof data.currency === 'string' ? data.currency.toUpperCase() : 'EUR',
    tax_amount: taxAmount,
    line_items: Array.isArray(data.line_items)
      ? data.line_items.map((item) => ({
          description: String(item.description || ''),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.total) || 0,
        }))
      : [],
  }
}

function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}
