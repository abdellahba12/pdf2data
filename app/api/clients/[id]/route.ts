import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

interface Params { params: { id: string } }

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const client = await prisma.client.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.client.update({
    where: { id: params.id },
    data: { name: body.name, cif: body.cif, address: body.address, email: body.email, phone: body.phone },
  })
  return NextResponse.json({ client: updated })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const client = await prisma.client.findFirst({ where: { id: params.id, userId: session.userId } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Unlink documents first
  await prisma.document.updateMany({ where: { clientId: params.id }, data: { clientId: null } })
  await prisma.client.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
