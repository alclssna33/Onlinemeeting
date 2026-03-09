import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown }

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      doctor: '/doctor',
      vendor: '/vendor',
    }
    redirect(redirectMap[profile?.role ?? 'doctor'])
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#f8faf8' }}>

      {/* 상단 네비 */}
      <header className="w-full px-8 py-5 flex items-center justify-between">
        <Image src="/logo.png" alt="개원비밀공간" width={160} height={44} className="object-contain" priority />
        <Link
          href="/login"
          className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-80"
          style={{ background: '#0e3d20', color: '#fff' }}
        >
          로그인
        </Link>
      </header>

      {/* 히어로 섹션 */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">

        {/* 배지 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: 'rgba(14,61,32,0.08)', color: '#0e3d20', border: '1px solid rgba(14,61,32,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
          온라인 미팅 시스템
        </div>

        {/* 메인 헤드라인 */}
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl"
          style={{ color: '#0a1f0f', letterSpacing: '-0.02em' }}>
          병원 개원,<br />
          <span style={{ color: '#0e3d20' }}>전문 파트너</span>와 함께
        </h1>

        <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-xl"
          style={{ color: '#4b5563' }}>
          인테리어부터 의료기기, 세무·법무까지<br />
          검증된 제휴업체와 온라인 미팅을 한 번에
        </p>

        {/* CTA 버튼 */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0e3d20 0%, #16a34a 100%)', boxShadow: '0 4px 24px rgba(14,61,32,0.3)' }}
        >
          시작하기
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </section>

      {/* 특징 카드 3개 */}
      <section className="w-full max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: '📅',
            title: '간편한 일정 조율',
            desc: '원하는 후보 시간을 제안하면 업체가 직접 확정합니다.',
          },
          {
            icon: '🎥',
            title: 'Google Meet 자동 생성',
            desc: '미팅 확정 즉시 화상회의 링크가 자동으로 만들어집니다.',
          },
          {
            icon: '🏆',
            title: '최적 업체 선정',
            desc: '여러 업체와 미팅 후 가장 적합한 파트너를 선정하세요.',
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-2xl p-6 space-y-3"
            style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(14,61,32,0.07)' }}>
              {icon}
            </div>
            <h3 className="font-bold text-base" style={{ color: '#0a1f0f' }}>{title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{desc}</p>
          </div>
        ))}
      </section>

      {/* 푸터 */}
      <footer className="w-full px-8 py-5 flex items-center justify-between"
        style={{ borderTop: '1px solid #e5e7eb' }}>
        <Image src="/logo.png" alt="개원비밀공간" width={100} height={28} className="object-contain opacity-50" />
        <p className="text-xs" style={{ color: '#9ca3af' }}>
          © 2025 개원비밀공간. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
