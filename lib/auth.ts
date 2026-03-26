import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './db'
import { PLANS } from './stripe'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; email: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function generateVerifyToken(): string {
  return crypto.randomUUID() + '-' + Date.now()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

/** Returns the effective plan considering trial expiration */
export function getEffectivePlan(user: { plan: string; trialEndsAt: Date | null }): string {
  if (user.plan === 'trial') {
    if (!user.trialEndsAt || new Date() > new Date(user.trialEndsAt)) {
      return 'free' // trial expired
    }
    return 'trial'
  }
  return user.plan
}

/** Get user plan info for the frontend */
export async function getUserPlanInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true, trialEndsAt: true, docsThisMonth: true,
      docsResetAt: true, totalDocsUsed: true, createdAt: true,
    },
  })
  if (!user) return null

  const effectivePlan = getEffectivePlan(user)
  const planConfig = PLANS[effectivePlan as keyof typeof PLANS] || PLANS.free

  // Reset monthly counter if needed
  const now = new Date()
  const resetAt = new Date(user.docsResetAt)
  let docsThisMonth = user.docsThisMonth
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await prisma.user.update({
      where: { id: userId },
      data: { docsThisMonth: 0, docsResetAt: now },
    })
    docsThisMonth = 0
  }

  const docsRemaining = effectivePlan === 'free'
    ? Math.max(0, planConfig.maxTotalDocs - user.totalDocsUsed)
    : effectivePlan === 'trial'
    ? Infinity
    : Infinity

  return {
    plan: effectivePlan,
    planName: planConfig.name,
    docsThisMonth,
    docsRemaining: docsRemaining === Infinity ? -1 : docsRemaining, // -1 = unlimited
    totalDocsUsed: user.totalDocsUsed,
    trialEndsAt: user.plan === 'trial' ? user.trialEndsAt : null,
    trialDaysLeft: user.plan === 'trial' && user.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null,
    isTrialExpired: user.plan === 'trial' && user.trialEndsAt && now > new Date(user.trialEndsAt),
    maxDocs: effectivePlan === 'free' ? planConfig.maxTotalDocs : -1,
  }
}

export async function canUploadDocument(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, trialEndsAt: true, docsThisMonth: true, docsResetAt: true, totalDocsUsed: true },
  })
  if (!user) return { allowed: false, reason: 'User not found' }

  const effectivePlan = getEffectivePlan(user)

  // Free plan: max 10 total docs ever
  if (effectivePlan === 'free') {
    if (user.totalDocsUsed >= 10) {
      return {
        allowed: false,
        reason: `Has usado tus 10 documentos gratuitos. Actualiza a Pro para documentos ilimitados.`,
      }
    }
    return { allowed: true }
  }

  // Trial: unlimited while active
  if (effectivePlan === 'trial') {
    return { allowed: true }
  }

  // Pro: unlimited
  return { allowed: true }
}

export async function incrementDocCounter(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { docsThisMonth: { increment: 1 }, totalDocsUsed: { increment: 1 } },
  })
}

export async function getNextInvoiceNumber(userId: string): Promise<string> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { invoiceCounter: { increment: 1 } },
    select: { invoiceCounter: true, invoiceSeries: true },
  })
  const year = new Date().getFullYear()
  const num = String(user.invoiceCounter).padStart(3, '0')
  return `${user.invoiceSeries}/${year}/${num}`
}
