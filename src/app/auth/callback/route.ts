import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      console.log('Email confirmation successful!')
    } catch (error) {
      console.error('Email confirmation error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
    }
  }

  // ไปหน้า dashboard หลังจากยืนยันอีเมลสำเร็จ
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
