import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { processDocument } from '@/lib/process'
import { deleteFile } from '@/lib/storage'

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const document = await prisma.document.findFirst({
    where: { id: params.id, userId: session.userId },
    include: { client: true },
  })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ document })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { extractedData, invoiceStatus, clientId } = body
  const document = await prisma.document.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(extractedData !== undefined && { extractedData }),
      ...(invoiceStatus !== undefined && { invoiceStatus }),
      ...(clientId !== undefined && { clientId: clientId || null }),
    },
    include: { client: true },
  })
  return NextResponse.json({ document: updated })
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const document = await prisma.document.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.document.update({ where: { id: params.id }, data: { status: 'processing', errorMessage: null } })
  processDocument(params.id).catch(console.error)
  return NextResponse.json({ message: 'Reprocessing started' })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const document = await prisma.document.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete file from R2
  await deleteFile(document.fileUrl).catch((e) => console.error('Error deleting file from R2:', e))

  // Delete from database
  await prisma.document.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
