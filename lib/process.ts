import { prisma } from './db'
import { extractTextFromPDF, getFilePath } from './pdf'
import { extractInvoiceDataWithGemini } from './ai'

export async function processDocument(documentId: string): Promise<void> {
  try {
    const document = await prisma.document.findUnique({ where: { id: documentId } })
    if (!document) throw new Error(`Document ${documentId} not found`)

    console.log(`Processing document: ${documentId} - ${document.fileName}`)

    const filePath = getFilePath(document.fileUrl)
    const text = await extractTextFromPDF(filePath)

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
    const extractedData = await extractInvoiceDataWithGemini(text)
    console.log('Gemini extraction complete:', JSON.stringify(extractedData, null, 2))

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'completed', extractedData: extractedData as object, errorMessage: null },
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
  }
}
