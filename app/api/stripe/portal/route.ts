import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createPortalSession } from '@/lib/stripe'
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { stripeCustomerId: true } })
  if (!user?.stripeCustomerId) return NextResponse.json({ error: 'No subscription' }, { status: 400 })
  const url = await createPortalSession(user.stripeCustomerId)
  return NextResponse.json({ url })
}
