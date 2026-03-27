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
  logoPosition: 'left' | 'right' | 'center'
  invoiceTitle: string
  currencySymbol: string
  dateFormat: string
  language: string
  taxLabel: string
  subtotalLabel: string
  totalLabel: string
  footerText: string
}

const STYLE_PROMPT = `Analyze this invoice image and extract its exact visual design style with high precision. Return ONLY a valid JSON object:

{
  "primaryColor": "hex color of the main brand color (used in headers, titles, borders)",
  "accentColor": "hex color of secondary/accent color",
  "headerBg": "hex color for the line items table header background",
  "headerText": "hex color of the table header text (white if dark background)",
  "fontFamily": "serif or sans-serif",
  "hasTopBar": true/false (is there a colored bar at the very top of the page),
  "hasBottomBar": true/false (is there a colored bar at the very bottom),
  "logoPosition": "left, right, or center (where the company logo/name appears in the header)",
  "invoiceTitle": "exact word used as invoice title (e.g. Factura, Invoice, Albaran)",
  "currencySymbol": "currency symbol (€, $, £)",
  "dateFormat": "date format observed (DD/MM/YYYY, DD.MM.YYYY, etc.)",
  "language": "language code: ca, es, en, fr, de, it, pt",
  "taxLabel": "exact label for tax (IVA, VAT, Tax, etc.)",
  "subtotalLabel": "exact label for subtotal (Base imponible, Subtotal, Total parcial, etc.)",
  "totalLabel": "exact label for the grand total (TOTAL FACTURA, Total, etc.)",
  "footerText": "exact text in the footer of the document (company registration info, etc.) or empty string if none"
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
    logoPosition: 'left',
    invoiceTitle: 'Factura', currencySymbol: 'EUR',
    dateFormat: 'DD.MM.YYYY', language: 'es',
    taxLabel: 'IVA', subtotalLabel: 'Base imponible', totalLabel: 'TOTAL FACTURA',
    footerText: '',
  }
}
