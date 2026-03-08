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
        // 프로필 조회
        let { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single() as { data: { role: string } | null; error: unknown }

        // 프로필이 없으면 (신규 소셜 로그인 유저) 직접 생성
        if (!profile) {
          const { error: insertError } = await (supabase.from('profiles') as any).insert({
            id: user.id,
            role: 'doctor',
            name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? '사용자',
            email: user.email ?? '',
          })
          if (insertError) {
            console.error('[콜백 백엔드] 프로필 자동 생성 실패:', insertError)
          } else {
            console.log('[콜백 백엔드] 신규 유저 프로필 생성 완료:', user.email)
          }
          profile = { role: 'doctor' }
        }

        const redirectMap: Record<string, string> = {
          admin: '/admin',
          doctor: '/doctor',
          vendor: '/vendor',
        }
        const dest = redirectMap[profile.role] ?? '/doctor'
        return NextResponse.redirect(new URL(dest, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
}
