import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createToken, generateVerifyToken, isValidEmail } from '@/lib/auth'
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  if (!email || !password) return NextResponse.json({ error: 'Email y contrasena requeridos' }, { status: 400 })
  if (!isValidEmail(email)) return NextResponse.json({ error: 'El email no es valido' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contrasena debe tener al menos 8 caracteres' }, { status: 400 })
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Este email ya esta registrado' }, { status: 409 })
  const hashed = await hashPassword(password)
  const verifyToken = generateVerifyToken()
  const trialEnds = new Date(); trialEnds.setDate(trialEnds.getDate() + 5)
  const user = await prisma.user.create({
    data: { email, password: hashed, verifyToken, emailVerified: false, plan: 'trial', trialEndsAt: trialEnds },
  })
  sendWelcomeEmail(user.email).catch(console.error)
  sendVerificationEmail(user.email, verifyToken).catch(console.error)
  const token = await createToken(user.id, user.email)
  const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email } })
  response.cookies.set('auth-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60*60*24*7 })
  return response
}
