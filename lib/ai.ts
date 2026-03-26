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

const EXTRACTION_PROMPT = `You are an expert invoice data extractor. Extract structured invoice data from the following text.

Return ONLY a valid JSON object with exactly this schema. Do not include any explanation or markdown:

{
  "vendor_name": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "currency": "3-letter currency code or null",
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

Rules:
- All dates must be in YYYY-MM-DD format
- All amounts must be numbers (not strings)
- currency should be ISO 4217 (e.g., EUR, USD, GBP)
- If a field cannot be found, use null
- line_items should be an empty array if no line items found
- Return ONLY the JSON object, nothing else

Document text:
`

// Helper: wait ms
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// Helper: call Gemini with automatic retry on 429
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
        const waitSec = Math.min(10 * (attempt + 1), 30) // 10s, 20s, 30s
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

// Export the retry helper so style-analyzer can use it too
export { callGeminiWithRetry }

function validateAndClean(data: ExtractedInvoiceData): ExtractedInvoiceData {
  return {
    vendor_name: typeof data.vendor_name === 'string' ? data.vendor_name : null,
    invoice_number: typeof data.invoice_number === 'string' ? data.invoice_number : null,
    invoice_date: isValidDate(data.invoice_date) ? data.invoice_date : null,
    due_date: isValidDate(data.due_date) ? data.due_date : null,
    total_amount: typeof data.total_amount === 'number' ? data.total_amount : null,
    currency: typeof data.currency === 'string' ? data.currency.toUpperCase() : null,
    tax_amount: typeof data.tax_amount === 'number' ? data.tax_amount : null,
    line_items: Array.isArray(data.line_items)
      ? data.line_items.map((item) => ({
          description: String(item.description || ''),
          quantity: Number(item.quantity) || 0,
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
