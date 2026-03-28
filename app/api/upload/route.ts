import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, canUploadDocument, incrementDocCounter, getNextInvoiceNumber } from '@/lib/auth'
import { uploadFile } from '@/lib/storage'
import { processDocument } from '@/lib/process'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { allowed, reason } = await canUploadDocument(session.userId)
  if (!allowed) return NextResponse.json({ error: reason, limitReached: true }, { status: 403 })
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const blob = file as Blob
    const fileName = (file as any).name || 'upload.pdf'

    if (!fileName.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Only PDF files' }, { status: 400 })
    if (blob.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const fileId = crypto.randomUUID()
    const storedName = `${fileId}.pdf`
    const buffer = Buffer.from(await blob.arrayBuffer())
    await uploadFile(buffer, storedName, 'application/pdf')

    const invoiceNumber = await getNextInvoiceNumber(session.userId)
    const document = await prisma.document.create({
      data: { userId: session.userId, fileName, fileUrl: storedName, status: 'processing', invoiceNumber },
    })
    await incrementDocCounter(session.userId)
    processDocument(document.id).catch(console.error)
    return NextResponse.json({ documentId: document.id, invoiceNumber }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
