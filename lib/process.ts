import { prisma } from './db'
import { extractTextFromPDF } from './pdf'
import { extractInvoiceDataWithGemini, ExtractedInvoiceData } from './ai'
import { extractInvoiceDataWithMistral } from './ai-mistral'
import { extractWithRules, PartialInvoiceData } from './extract-rules'
import { downloadToTemp } from './storage'
import fs from 'fs'

/** Merge rule-based data with AI data. Rules take priority when they have values. */
function mergeData(rules: PartialInvoiceData, ai: ExtractedInvoiceData): ExtractedInvoiceData {
  return {
    vendor_name: rules.vendor_name || ai.vendor_name,
    client_name: rules.client_name || ai.client_name,
    invoice_number: rules.invoice_number || ai.invoice_number,
    invoice_date: rules.invoice_date || ai.invoice_date,
    due_date: rules.due_date || ai.due_date,
    total_amount: rules.total_amount ?? ai.total_amount,
    currency: rules.currency || ai.currency || 'EUR',
    tax_amount: rules.tax_amount ?? ai.tax_amount,
    line_items: (ai.line_items && ai.line_items.length > 0) ? ai.line_items : [],
  }
}

export async function processDocument(documentId: string): Promise<void> {
  let tmpPath: string | null = null
  try {
    const document = await prisma.document.findUnique({ where: { id: documentId } })
    if (!document) throw new Error(`Document ${documentId} not found`)

    console.log(`Processing document: ${documentId} - ${document.fileName}`)

    // Step 1: Download file from R2 to temp
    tmpPath = await downloadToTemp(document.fileUrl)

    // Step 2: Extract text from PDF
    const text = await extractTextFromPDF(tmpPath)

    if (!text || text.length < 10) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          errorMessage: 'No se pudo extraer texto del PDF. El archivo puede ser una imagen escaneada o estar corrupto.',
        },
      })
      return
    }

    console.log(`Extracted ${text.length} characters from PDF`)

    // Step 3: Rule-based extraction (fast, free, reliable)
    const rulesData = extractWithRules(text)
    console.log('Rules extraction:', JSON.stringify(rulesData, null, 2))

    // Step 4: AI extraction — try Mistral first, fall back to Gemini
    let aiData: ExtractedInvoiceData
    try {
      aiData = await extractInvoiceDataWithMistral(tmpPath)
      console.log('Mistral extraction:', JSON.stringify(aiData, null, 2))
    } catch (mistralError) {
      console.error('Mistral failed, falling back to Gemini:', mistralError)
      try {
        aiData = await extractInvoiceDataWithGemini(text, tmpPath)
        console.log('Gemini extraction:', JSON.stringify(aiData, null, 2))
      } catch (geminiError) {
        console.error('Gemini also failed, using rules only:', geminiError)
        aiData = {
          vendor_name: null, client_name: null, invoice_number: null, invoice_date: null,
          due_date: null, total_amount: null, currency: 'EUR',
          tax_amount: null, line_items: [],
        }
      }
    }

    // Step 5: Merge — rules data takes priority, AI fills gaps + provides line items
    const finalData = mergeData(rulesData, aiData)
    console.log('Final merged data:', JSON.stringify(finalData, null, 2))

    // Step 6: Save to database
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'completed', extractedData: finalData as object, errorMessage: null },
    })

    console.log(`Document ${documentId} processed successfully`)
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error)
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown processing error',
      },
    })
  } finally {
    // Always clean up temp file
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath) } catch {}
    }
  }
}
