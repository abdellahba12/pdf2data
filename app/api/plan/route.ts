import { NextResponse } from 'next/server'
import { getSession, getUserPlanInfo } from '@/lib/auth'
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const info = await getUserPlanInfo(session.userId)
  return NextResponse.json({ plan: info })
}
