'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

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
    <main className="gradient-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* 로고 */}
        <div className="text-center space-y-1 mb-2">
          <h1 className="text-4xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            개비공
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            개원비밀공간 — 제휴업체 포털
          </p>
        </div>

        {/* 카드 */}
        <div className="glass rounded-3xl p-8 space-y-5">
          {/* 제휴업체 전용 배지 */}
          <div className="flex justify-center">
            <span className="text-xs font-bold px-4 py-1.5 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              🏢 제휴업체 전용
            </span>
          </div>

          <h2 className="text-xl font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
            제휴업체 가입 / 로그인
          </h2>

          <div className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
            <p>✅ 구글 계정으로 간편하게 가입하세요.</p>
            <p className="mt-1">✅ 가입 후 관리자가 업체 계정을 연결하면 미팅 요청 인박스를 사용할 수 있습니다.</p>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: '#dc2626' }}>{error}</p>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: '#4285F4' }}
          >
            <span className="w-5 h-5 bg-white rounded-sm flex items-center justify-center text-xs font-black"
              style={{ color: '#4285F4' }}>
              G
            </span>
            {loading ? '연결 중...' : '구글 계정으로 가입하기'}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            원장님이신가요?{' '}
            <a href="/login" style={{ color: 'var(--brand-primary)' }} className="underline">
              원장님 로그인
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
