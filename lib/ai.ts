import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface ExtractedInvoiceData {
  vendor_name: string | null
  client_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  due_date: string | null
  total_amount: number | null
  currency: string | null
  tax_amount: number | null
  line_items: LineItem[]
}

const EXTRACTION_PROMPT = `You are an expert invoice and delivery note data extractor for Spanish businesses. Your job is to extract EVERY piece of data from the document.

CRITICAL RULES:
- For vendor_name: extract the company or person that ISSUED/EMITTED the invoice (the supplier/vendor at the top of the document, with their CIF/NIF).
- For client_name: extract the company or person the invoice was SENT TO (the buyer/recipient, often after "Cliente:", "A:", "Facturar a:", "Destinatario:", or in a separate "client" section).
- ALWAYS look for dates. Invoices ALWAYS have a date. Look for "Fecha", "Data", "Date", "Emision", "dd/mm/yyyy", "dd.mm.yyyy". Convert to YYYY-MM-DD.
- ALWAYS extract tax (IVA). If you see "IVA" extract the amount. If you see subtotal + total, calculate: tax = total - subtotal. If only total visible, assume 21%: tax = total * 21 / 121.
- For invoice_number: look for "Factura", "Fra.", "Num", "N°", "Albaran", or any reference number.
- For line_items: extract EVERY product/service line with description, quantity (default 1), unit_price, and total. Look carefully at tables.
- For currency: "€" or "EUR" or comma decimal separator → "EUR".
- NEVER return null for invoice_date if ANY date exists.
- NEVER return null for total_amount if ANY monetary amount exists.

Return ONLY a valid JSON object, no markdown, no explanation:

{
  "vendor_name": "string or null",
  "client_name": "string or null",
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

export { callGeminiWithRetry }

export async function extractInvoiceDataWithGemini(
  text: string,
  filePath?: string
): Promise<ExtractedInvoiceData> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  // gemini-2.5-pro: better accuracy for complex document layouts and table extraction
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

  let promptParts: string | any[]

  // Multimodal: send the original file alongside text for better structure understanding
  if (filePath && fs.existsSync(filePath)) {
    try {
      const fileData = fs.readFileSync(filePath)
      const base64 = fileData.toString('base64')
      const ext = filePath.toLowerCase()
      const mimeType = ext.endsWith('.png') ? 'image/png'
        : ext.endsWith('.jpg') || ext.endsWith('.jpeg') ? 'image/jpeg'
        : 'application/pdf'

      promptParts = [
        { inlineData: { data: base64, mimeType } },
        EXTRACTION_PROMPT + (text.length > 100
          ? `\n\nExtracted text for reference (may have lost formatting):\n${text.slice(0, 8000)}`
          : ''),
      ]
    } catch {
      // Fall back to text-only if file read fails
      promptParts = EXTRACTION_PROMPT + text.slice(0, 12000)
    }
  } else {
    promptParts = EXTRACTION_PROMPT + text.slice(0, 12000)
  }

  const rawText = await callGeminiWithRetry(model, promptParts)

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
    client_name: typeof data.client_name === 'string' ? data.client_name : null,
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
