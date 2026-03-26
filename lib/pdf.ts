import fs from 'fs'
import path from 'path'

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    const text = data.text.trim()
    if (!text || text.length < 20) return ''
    return text
  } catch (error) {
    console.error('PDF parse error:', error)
    return ''
  }
}

export function getUploadDir(): string {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
  return uploadDir
}

export function getFilePath(fileName: string): string {
  return path.join(getUploadDir(), fileName)
}
