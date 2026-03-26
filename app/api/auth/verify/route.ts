import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createToken } from '@/lib/auth'
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pdf2data.up.railway.app'
  if (!token) return NextResponse.redirect(`${appUrl}/login?error=invalid_token`)
  const user = await prisma.user.findFirst({ where: { verifyToken: token } })
  if (!user) return NextResponse.redirect(`${appUrl}/login?error=invalid_token`)
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verifyToken: null } })
  const authToken = await createToken(user.id, user.email)
  const response = NextResponse.redirect(`${appUrl}/dashboard?verified=true`)
  response.cookies.set('auth-token', authToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60*60*24*7 })
  return response
}
