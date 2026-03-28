import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { downloadFile } from '@/lib/storage'

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const document = await prisma.document.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const fileBuffer = await downloadFile(document.fileUrl)
    return new NextResponse(fileBuffer, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
