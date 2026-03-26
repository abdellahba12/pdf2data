import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pdf2data.up.railway.app'
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '', redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: 'code', scope: 'email profile', access_type: 'offline',
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
