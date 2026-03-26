import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.userId

  const documents = await prisma.document.findMany({
    where: { userId, status: 'completed' },
    select: { createdAt: true, invoiceStatus: true, extractedData: true },
    orderBy: { createdAt: 'asc' },
  })

  const now = new Date()
  const months: { label: string; count: number; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    const monthDocs = documents.filter(doc => {
      const docDate = new Date(doc.createdAt)
      return docDate.getMonth() === d.getMonth() && docDate.getFullYear() === d.getFullYear()
    })
    const total = monthDocs.reduce((sum, doc) => {
      const data = doc.extractedData as any
      return sum + (data?.total_amount || 0)
    }, 0)
    months.push({ label, count: monthDocs.length, total })
  }

  const statusCounts = { draft: 0, sent: 0, paid: 0, overdue: 0 }
  documents.forEach(doc => {
    const s = doc.invoiceStatus as keyof typeof statusCounts
    if (s in statusCounts) statusCounts[s]++
  })

  const totalRevenue = documents.reduce((sum, doc) => sum + ((doc.extractedData as any)?.total_amount || 0), 0)
  const totalDocs = await prisma.document.count({ where: { userId } })
  const completedDocs = await prisma.document.count({ where: { userId, status: 'completed' } })

  // Calculate pending (sent but not paid)
  const pendingRevenue = documents
    .filter(d => d.invoiceStatus === 'sent' || d.invoiceStatus === 'overdue')
    .reduce((sum, doc) => sum + ((doc.extractedData as any)?.total_amount || 0), 0)

  return NextResponse.json({ months, statusCounts, totalRevenue, totalDocs, completedDocs, pendingRevenue })
}
