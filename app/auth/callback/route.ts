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

        // 프로필이 없으면 (신규 소셜 로그인 유저) 기본 프로필 생성 후 닉네임 설정 페이지로
        if (!profile) {
          const { error: insertError } = await (supabase.from('profiles') as any).insert({
            id: user.id,
            role: 'doctor',
            name: '__pending__',   // 닉네임 미설정 표시
            email: user.email ?? '',
          })
          if (insertError) {
            console.error('[콜백 백엔드] 프로필 자동 생성 실패:', insertError)
          }
          // 신규 가입 → 닉네임 입력 페이지
          return NextResponse.redirect(new URL('/setup', origin))
        }

        // 기존 유저인데 닉네임 미설정 상태면 다시 setup으로
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .single() as any

        if (fullProfile?.name === '__pending__' && fullProfile?.role === 'doctor') {
          return NextResponse.redirect(new URL('/setup', origin))
        }

        const redirectMap: Record<string, string> = {
          admin: '/admin',
          doctor: '/doctor',
          vendor: '/vendor',
        }
        const dest = redirectMap[fullProfile?.role ?? 'doctor'] ?? '/doctor'
        return NextResponse.redirect(new URL(dest, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
}
