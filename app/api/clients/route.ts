import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clients = await prisma.client.findMany({
    where: { userId: session.userId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { documents: true } } },
  })
  return NextResponse.json({ clients })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { name, cif, address, email, phone } = body
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const client = await prisma.client.create({
    data: { userId: session.userId, name, cif, address, email, phone },
  })
  return NextResponse.json({ client }, { status: 201 })
}
