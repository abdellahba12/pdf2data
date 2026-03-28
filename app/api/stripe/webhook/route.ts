import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  let event
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  try { event = stripe.webhooks.constructEvent(body, sig, webhookSecret) }
  catch (err) { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as any
      if (s.metadata?.userId) {
        await prisma.user.update({ where: { id: s.metadata.userId }, data: { plan: 'pro', stripeCustomerId: s.customer, stripeSubId: s.subscription } })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any
      await prisma.user.updateMany({ where: { stripeSubId: sub.id }, data: { plan: 'free' } })
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as any
      if (sub.status === 'active') await prisma.user.updateMany({ where: { stripeSubId: sub.id }, data: { plan: 'pro' } })
      else if (sub.status === 'canceled' || sub.status === 'unpaid') await prisma.user.updateMany({ where: { stripeSubId: sub.id }, data: { plan: 'free' } })
      break
    }
  }
  return NextResponse.json({ received: true })
}
