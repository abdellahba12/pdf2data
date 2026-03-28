import { Mistral } from '@mistralai/mistralai'
import fs from 'fs'
import { ExtractedInvoiceData, LineItem } from './ai'

const EXTRACTION_PROMPT = `You are an expert invoice data extractor for Spanish businesses. Extract ALL data from the document text below.

RULES:
- vendor_name: the company/person that ISSUED the invoice (supplier, at the top, with CIF/NIF)
- client_name: the company/person the invoice was SENT TO (buyer, after "Cliente:", "A:", "Facturar a:")
- invoice_date: look for "Fecha", "Date", "Emision" — convert to YYYY-MM-DD
- total_amount: the final total including taxes
- tax_amount: IVA amount. If not explicit: tax = total - subtotal. If only total: tax = total * 21 / 121
- invoice_number: look for "Factura", "Fra.", "Num", "N°", "Albaran"
- line_items: every product/service line with description, quantity, unit_price, total
- currency: "EUR" if € or comma decimal separator

Return ONLY valid JSON, no markdown:

{
  "vendor_name": "string or null",
  "client_name": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "currency": "EUR",
  "tax_amount": number or null,
  "line_items": [{"description": "string", "quantity": number, "unit_price": number, "total": number}]
}`

export async function extractInvoiceDataWithMistral(
  filePath: string
): Promise<ExtractedInvoiceData> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY environment variable is not set')

  const client = new Mistral({ apiKey })

  // Step 1: OCR — extract text from the PDF
  const fileBuffer = fs.readFileSync(filePath)
  const uploaded = await client.files.upload({
    file: {
      fileName: 'invoice.pdf',
      content: fileBuffer,
    },
    purpose: 'ocr',
  })

  const ocrResult = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: { type: 'file', fileId: uploaded.id },
  })

  const extractedText = ocrResult.pages?.map((p: any) => p.markdown).join('\n\n') || ''

  // Clean up uploaded file
  await client.files.delete({ fileId: uploaded.id }).catch(() => {})

  if (!extractedText || extractedText.length < 20) {
    throw new Error('Mistral OCR could not extract text from the PDF')
  }

  // Step 2: Extract structured invoice data
  const response = await client.chat.complete({
    model: 'mistral-small-latest',
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nDOCUMENT TEXT:\n${extractedText.slice(0, 12000)}`,
      },
    ],
    temperature: 0,
  })

  const rawText = (response.choices?.[0]?.message?.content as string || '').trim()

  const jsonStr = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: ExtractedInvoiceData
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('Failed to parse Mistral response:', rawText)
    throw new Error('Mistral returned invalid JSON')
  }

  return validateAndClean(parsed)
}

function validateAndClean(data: ExtractedInvoiceData): ExtractedInvoiceData {
  let totalAmount = typeof data.total_amount === 'number' ? data.total_amount : null
  let taxAmount = typeof data.tax_amount === 'number' ? data.tax_amount : null

  if (totalAmount && !taxAmount) {
    taxAmount = Math.round((totalAmount * 21 / 121) * 100) / 100
  }

  if (!totalAmount && Array.isArray(data.line_items) && data.line_items.length > 0) {
    const subtotal = data.line_items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    taxAmount = Math.round(subtotal * 0.21 * 100) / 100
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
      ? data.line_items.map((item: LineItem) => ({
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
