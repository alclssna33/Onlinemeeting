/**
 * 벤더사 전용 OAuth 콜백
 * /join/vendor 페이지에서 구글 로그인 시 이 경로로 리다이렉트됨
 * 신규 유저는 role='vendor'로 자동 생성
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single() as { data: { role: string } | null; error: unknown }

        if (!profile) {
          // 신규 유저 — vendor 역할로 생성
          const { error: insertError } = await (supabase.from('profiles') as any).insert({
            id: user.id,
            role: 'vendor',
            name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? '담당자',
            email: user.email ?? '',
          })
          if (insertError) {
            console.error('[vendor-callback] 프로필 생성 실패:', insertError)
          }
          profile = { role: 'vendor' }
        }

        // 기존 유저면 역할 그대로 사용 (admin이 이미 vendor로 변경했을 수 있음)
        const redirectMap: Record<string, string> = {
          admin: '/admin',
          doctor: '/doctor',
          vendor: '/vendor',
        }
        const dest = redirectMap[profile.role] ?? '/vendor'
        return NextResponse.redirect(new URL(dest, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/join/vendor?error=auth_failed', origin))
}
