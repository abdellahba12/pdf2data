import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyName: true, companyCIF: true, companyAddress: true, companyPhone: true, companyEmail: true, companyIBAN: true, companyLogoUrl: true, companyStyle: true, templateFileUrl: true },
  })
  return NextResponse.json({ company: user })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { companyName, companyCIF, companyAddress, companyPhone, companyEmail, companyIBAN } = body
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { companyName, companyCIF, companyAddress, companyPhone, companyEmail, companyIBAN },
    select: { companyName: true, companyCIF: true, companyAddress: true, companyPhone: true, companyEmail: true, companyIBAN: true, companyLogoUrl: true, companyStyle: true, templateFileUrl: true },
  })
  return NextResponse.json({ company: user })
}
