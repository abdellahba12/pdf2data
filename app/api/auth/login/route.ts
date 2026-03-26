import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 })
  if (!user.password) return NextResponse.json({ error: 'Esta cuenta usa Google. Inicia sesion con Google.' }, { status: 401 })
  const valid = await verifyPassword(password, user.password)
  if (!valid) return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 })
  const token = await createToken(user.id, user.email)
  const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email } })
  response.cookies.set('auth-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60*60*24*7 })
  return response
}
