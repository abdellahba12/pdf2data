import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createCheckoutSession } from '@/lib/stripe'
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, stripeCustomerId: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const url = await createCheckoutSession(session.userId, user.email, user.stripeCustomerId || undefined)
  return NextResponse.json({ url })
}
