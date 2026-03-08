'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('닉네임을 입력해주세요.'); return }
    if (trimmed.length < 2) { setError('2자 이상 입력해주세요.'); return }
    if (trimmed.length > 20) { setError('20자 이하로 입력해주세요.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ name: trimmed })
      .eq('id', user.id)

    if (updateError) {
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/doctor')
  }

  return (
    <main className="gradient-bg min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-sm space-y-6"
      >
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            반갑습니다!
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            개비공에서 사용할 <strong>닉네임</strong>을 입력해주세요.<br />
            미팅 신청 시 업체에 표시됩니다.
          </p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              닉네임 (원장님 성함)
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="예: 홍길동"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
              style={{
                background: 'var(--bg-muted)',
                borderColor: error ? '#dc2626' : 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex items-center justify-between mt-1">
              {error
                ? <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
                : <span />
              }
              <p className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                {name.length}/20
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--brand-primary)' }}
          >
            {loading ? '저장 중...' : '시작하기 →'}
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          닉네임은 마이페이지에서 언제든 변경할 수 있습니다.
        </p>
      </motion.div>
    </main>
  )
}
