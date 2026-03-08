'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      alert('로그인 오류: ' + error.message)
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
            개원비밀공간 — 온라인 미팅 시스템
          </p>
        </div>

        {/* 카드 */}
        <div className="glass rounded-3xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
            로그인
          </h2>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: '#4285F4' }}
          >
            <span className="w-5 h-5 bg-white rounded-sm flex items-center justify-center text-xs font-black" style={{ color: '#4285F4' }}>
              G
            </span>
            {loading ? '연결 중...' : '구글 계정으로 로그인'}
          </button>
        </div>
      </div>
    </main>
  )
}
