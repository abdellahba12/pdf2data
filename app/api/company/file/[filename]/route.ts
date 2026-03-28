import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { downloadFile } from '@/lib/storage'
import path from 'path'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.xlsx', '.xls'])

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prevent path traversal
  const fileName = path.basename(params.filename)

  // Validate extension
  const ext = path.extname(fileName).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

  // Ownership check: company files are named `{type}-{userId}-{fileId}.{ext}`
  if (fileName.startsWith('logo-') || fileName.startsWith('template-')) {
    const parts = fileName.split('-')
    if (parts.length < 3 || parts[1] !== session.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  try {
    const buffer = await downloadFile(fileName)
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream'
    return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': contentType } })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
