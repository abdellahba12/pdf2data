import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getFilePath } from '@/lib/pdf'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const fileName = params.filename
  const filePath = getFilePath(fileName)
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 })
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xls': 'application/vnd.ms-excel' }
  const contentType = mimeTypes[ext] || 'application/octet-stream'
  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, { headers: { 'Content-Type': contentType } })
}
