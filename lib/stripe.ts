import Stripe from 'stripe'

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
  })
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export const PLANS = {
  free: { name: 'Gratis', price: 0, docsPerMonth: 10, maxTotalDocs: 10, priceId: null },
  trial: { name: 'Prueba', price: 0, docsPerMonth: Infinity, maxTotalDocs: Infinity, priceId: null },
  pro: { name: 'Pro', price: 19, docsPerMonth: Infinity, maxTotalDocs: Infinity, priceId: process.env.STRIPE_PRO_PRICE_ID || '' },
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  customerId?: string
): Promise<string> {
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pdf2data.up.railway.app'

  let customer = customerId
  if (!customer) {
    const c = await stripe.customers.create({ email, metadata: { userId } })
    customer = c.id
  }

  const session = await stripe.checkout.sessions.create({
    customer,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLANS.pro.priceId!, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/dashboard`,
    metadata: { userId },
  })

  return session.url || ''
}

export async function createPortalSession(customerId: string): Promise<string> {
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pdf2data.up.railway.app'
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard`,
  })
  return session.url
}
