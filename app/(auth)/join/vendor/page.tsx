'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Image from 'next/image'

export default function VendorJoinPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/vendor-callback`,
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      setError('로그인 오류: ' + error.message)
      setLoading(false)
      return
    }
    if (data.url) {
      window.location.href = data.url
    }
  }

  return (
    <main className="min-h-screen flex">

      {/* ── 좌측 브랜드 패널 ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a2d16 0%, #0e3d20 40%, #0b3018 100%)' }}
      >
        {/* 배경 장식 */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />

        {/* 로고 */}
        <div className="relative z-10">
          <Image src="/logo.png" alt="개원비밀공간" width={280} height={80} className="object-contain" priority />
        </div>

        {/* 중앙 카피 */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
              🏢 제휴업체 파트너 포털
            </div>
            <h2 className="text-4xl font-bold leading-snug text-white">
              병원 개원 시장의<br />
              신뢰받는 파트너가 되세요
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              개원 준비 중인 원장님들과<br />
              온라인 미팅으로 비즈니스를 연결하세요.
            </p>
          </div>

          {/* 안내 3가지 */}
          <div className="space-y-3 pt-2">
            {[
              { step: '01', text: '구글 계정으로 간편 가입' },
              { step: '02', text: '관리자 승인 후 미팅 인박스 활성화' },
              { step: '03', text: '원장님 미팅 요청 수락 · 거절' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                  {step}
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2025 개원비밀공간. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── 우측 가입 패널 ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8"
        style={{ background: '#f8faf8' }}>

        {/* 모바일 로고 */}
        <div className="lg:hidden mb-10">
          <Image src="/logo.png" alt="개원비밀공간" width={200} height={56} className="object-contain" priority />
        </div>

        <div className="w-full max-w-sm space-y-8">

          {/* 타이틀 */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(14,61,32,0.08)', color: '#0e3d20', border: '1px solid rgba(14,61,32,0.15)' }}>
              🏢 제휴업체 전용
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#0a2d16' }}>
              가입 / 로그인
            </h1>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              초대받은 제휴업체 담당자만 가입할 수 있습니다
            </p>
          </div>

          {/* 안내 박스 */}
          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: 'rgba(14,61,32,0.05)', border: '1px solid rgba(14,61,32,0.12)' }}>
            <p className="text-xs font-semibold" style={{ color: '#0e3d20' }}>가입 안내</p>
            <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>
              구글 계정으로 가입 후, 관리자가 계정을 승인하면<br />
              미팅 요청 인박스를 이용하실 수 있습니다.
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-sm px-4 py-3 rounded-xl"
              style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </p>
          )}

          {/* 가입 버튼 */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                color: '#111827',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {loading ? '연결 중...' : 'Google 계정으로 가입하기'}
            </button>

            <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
              로그인 시{' '}
              <span style={{ color: '#0e3d20', fontWeight: 600 }}>개원비밀공간</span>의
              이용약관에 동의하는 것으로 간주합니다.
            </p>
          </div>

          {/* 원장 로그인 링크 */}
          <div className="text-center">
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              원장님이신가요?{' '}
              <a href="/login"
                className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: '#0e3d20' }}>
                원장님 로그인
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
