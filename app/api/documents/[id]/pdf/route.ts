import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getFilePath } from '@/lib/pdf'
import fs from 'fs'
interface Params { params: { id: string } }
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const document = await prisma.document.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const filePath = getFilePath(document.fileUrl)
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 })
  const fileBuffer = fs.readFileSync(filePath)
  return new NextResponse(fileBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' } })
}
