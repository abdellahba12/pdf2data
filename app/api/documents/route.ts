import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const documents = await prisma.document.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, fileName: true, status: true, createdAt: true,
      extractedData: true, clientId: true, invoiceStatus: true,
      client: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ documents })
}
