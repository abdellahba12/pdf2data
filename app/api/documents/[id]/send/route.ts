import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateInvoiceHTML, CompanyInfo } from '@/lib/invoice-generator'
import { sendInvoiceEmail } from '@/lib/email'
import { ExtractedInvoiceData } from '@/lib/ai'
import { CompanyStyle } from '@/lib/style-analyzer'
interface Params { params: { id: string } }
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { toEmail, toName } = body
  if (!toEmail) return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })
  const [document, user] = await Promise.all([
    prisma.document.findFirst({ where: { id: params.id, userId: session.userId } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { companyName: true, companyCIF: true, companyAddress: true, companyPhone: true, companyEmail: true, companyIBAN: true, companyLogoUrl: true, companyStyle: true } }),
  ])
  if (!document || !document.extractedData) return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  const data = document.extractedData as unknown as ExtractedInvoiceData
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
  const logoUrl = user?.companyLogoUrl ? `${appUrl}${user.companyLogoUrl}` : undefined
  const company: CompanyInfo = {
    name: user?.companyName || 'Mi Empresa', cif: user?.companyCIF || '-', address: user?.companyAddress || '-',
    phone: user?.companyPhone || '-', email: user?.companyEmail || '-', iban: user?.companyIBAN || '-',
    logoUrl, style: user?.companyStyle as CompanyStyle | undefined,
  }
  const html = generateInvoiceHTML(data, company, document.invoiceNumber || undefined)
  await sendInvoiceEmail(toEmail, toName || toEmail, company.name, document.invoiceNumber || document.id.slice(0, 8), html)
  await prisma.document.update({ where: { id: params.id }, data: { invoiceStatus: 'sent' } })
  return NextResponse.json({ success: true })
}
