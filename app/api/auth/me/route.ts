import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.userId }, select: { id: true, email: true, createdAt: true },
  })
  return NextResponse.json({ user })
}
