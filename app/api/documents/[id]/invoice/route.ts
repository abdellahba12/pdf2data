import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateInvoiceHTML, CompanyInfo } from '@/lib/invoice-generator'
import { ExtractedInvoiceData } from '@/lib/ai'
import { CompanyStyle } from '@/lib/style-analyzer'
interface Params { params: { id: string } }
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [document, user] = await Promise.all([
    prisma.document.findFirst({ where: { id: params.id, userId: session.userId } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { companyName: true, companyCIF: true, companyAddress: true, companyPhone: true, companyEmail: true, companyIBAN: true, companyLogoUrl: true, companyStyle: true } }),
  ])
  if (!document || !document.extractedData) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const data = document.extractedData as unknown as ExtractedInvoiceData
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
  const logoUrl = user?.companyLogoUrl ? `${baseUrl}${user.companyLogoUrl}` : undefined
  const company: CompanyInfo = {
    name: user?.companyName || 'Mi Empresa', cif: user?.companyCIF || '-', address: user?.companyAddress || '-',
    phone: user?.companyPhone || '-', email: user?.companyEmail || '-', iban: user?.companyIBAN || '-',
    logoUrl, style: user?.companyStyle as CompanyStyle | undefined,
  }
  const html = generateInvoiceHTML(data, company, document.invoiceNumber || undefined)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
