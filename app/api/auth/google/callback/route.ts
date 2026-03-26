import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createToken } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pdf2data.up.railway.app'
  if (!code) return NextResponse.redirect(`${appUrl}/login?error=no_code`)
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: `${appUrl}/api/auth/google/callback`, grant_type: 'authorization_code' }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) return NextResponse.redirect(`${appUrl}/login?error=token_failed`)
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
    const googleUser = await userRes.json()
    if (!googleUser.email) return NextResponse.redirect(`${appUrl}/login?error=no_email`)
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: googleUser.id }, { email: googleUser.email }] } })
    const isNew = !user
    if (!user) {
      const trialEnds = new Date(); trialEnds.setDate(trialEnds.getDate() + 5)
      user = await prisma.user.create({ data: { email: googleUser.email, googleId: googleUser.id, emailVerified: true, plan: 'trial', trialEndsAt: trialEnds } })
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: googleUser.id, emailVerified: true } })
    }
    if (isNew) sendWelcomeEmail(user.email, googleUser.name).catch(console.error)
    const token = await createToken(user.id, user.email)
    const response = NextResponse.redirect(`${appUrl}/dashboard`)
    response.cookies.set('auth-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60*60*24*7 })
    return response
  } catch (error) { console.error('Google OAuth error:', error); return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`) }
}
