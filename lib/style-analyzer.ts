import { GoogleGenerativeAI } from '@google/generative-ai'
import { callGeminiWithRetry } from './ai'
import fs from 'fs'

export interface CompanyStyle {
  primaryColor: string
  accentColor: string
  headerBg: string
  headerText: string
  fontFamily: string
  hasTopBar: boolean
  hasBottomBar: boolean
  invoiceTitle: string
  currencySymbol: string
  dateFormat: string
  language: string
  taxLabel: string
  subtotalLabel: string
  totalLabel: string
}

const STYLE_PROMPT = `Analyze this invoice image and extract its visual design style. Return ONLY a valid JSON object with exactly these fields:

{
  "primaryColor": "hex color of main brand color",
  "accentColor": "hex color of secondary color",
  "headerBg": "hex color for table header background",
  "headerText": "hex color of table header text",
  "fontFamily": "serif or sans-serif",
  "hasTopBar": true/false,
  "hasBottomBar": true/false,
  "invoiceTitle": "the word used for invoice title",
  "currencySymbol": "currency symbol used",
  "dateFormat": "date format observed",
  "language": "language code: ca, es, en, fr, de, it, pt",
  "taxLabel": "label for tax",
  "subtotalLabel": "label for subtotal",
  "totalLabel": "label for total"
}

Return ONLY the JSON, no explanation.`

export async function analyzeInvoiceStyle(imagePath: string): Promise<CompanyStyle> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const imageData = fs.readFileSync(imagePath)
  const base64 = imageData.toString('base64')
  const ext = imagePath.toLowerCase()
  const mimeType = ext.endsWith('.png') ? 'image/png'
    : ext.endsWith('.pdf') ? 'application/pdf'
    : 'image/jpeg'

  const raw = await callGeminiWithRetry(model, [
    { inlineData: { data: base64, mimeType } },
    STYLE_PROMPT,
  ])

  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    return JSON.parse(clean) as CompanyStyle
  } catch {
    console.error('Failed to parse style response:', raw)
    return getDefaultStyle()
  }
}

export function getDefaultStyle(): CompanyStyle {
  return {
    primaryColor: '#1a2b6b', accentColor: '#cc0000',
    headerBg: '#1a2b6b', headerText: '#ffffff',
    fontFamily: 'sans-serif', hasTopBar: true, hasBottomBar: true,
    invoiceTitle: 'Factura', currencySymbol: 'EUR',
    dateFormat: 'DD.MM.YYYY', language: 'es',
    taxLabel: 'IVA', subtotalLabel: 'Total parcial', totalLabel: 'TOTAL FACTURA',
  }
}
