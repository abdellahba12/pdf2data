import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateExcel, generateCSV } from '@/lib/export'
import { ExtractedInvoiceData } from '@/lib/ai'
interface Params { params: { id: string } }
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'xlsx'
  const document = await prisma.document.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (document.status !== 'completed' || !document.extractedData) return NextResponse.json({ error: 'Not ready' }, { status: 400 })
  const data = document.extractedData as unknown as ExtractedInvoiceData
  const baseName = document.fileName.replace('.pdf', '')
  if (format === 'csv') {
    const csv = generateCSV(data)
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${baseName}.csv"` } })
  }
  const buffer = await generateExcel(data, baseName)
  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${baseName}.xlsx"` },
  })
}
