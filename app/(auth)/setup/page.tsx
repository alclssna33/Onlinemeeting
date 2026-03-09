'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; phone?: string; notifyEmail?: string }>({})
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    const newErrors: { name?: string; phone?: string; notifyEmail?: string } = {}
    if (!trimmedName) newErrors.name = '닉네임을 입력해주세요.'
    else if (trimmedName.length < 2) newErrors.name = '2자 이상 입력해주세요.'
    else if (trimmedName.length > 20) newErrors.name = '20자 이하로 입력해주세요.'

    if (!trimmedPhone) newErrors.phone = '전화번호를 입력해주세요.'
    else if (!/^[0-9\-+\s]{7,20}$/.test(trimmedPhone)) newErrors.phone = '올바른 전화번호를 입력해주세요.'

    const trimmedNotifyEmail = notifyEmail.trim()
    if (trimmedNotifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedNotifyEmail)) {
      newErrors.notifyEmail = '올바른 이메일 형식을 입력해주세요.'
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setLoading(true)
    setErrors({})

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({
        name: trimmedName,
        phone: trimmedPhone,
        notify_email: trimmedNotifyEmail || null,
      })
      .eq('id', user.id)

    if (updateError) {
      setErrors({ name: '저장 중 오류가 발생했습니다. 다시 시도해주세요.' })
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
            개비공에서 사용할 정보를 입력해주세요.<br />
            미팅 신청 시 업체에 표시됩니다.
          </p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 닉네임 */}
          <div>
            <label className="text-sm font-semibold block mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              닉네임 (원장님 성함)
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
              placeholder="예: 홍길동"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
              style={{
                background: 'var(--bg-muted)',
                borderColor: errors.name ? '#dc2626' : 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.name
                ? <p className="text-xs" style={{ color: '#dc2626' }}>{errors.name}</p>
                : <span />
              }
              <p className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{name.length}/20</p>
            </div>
          </div>

          {/* 전화번호 */}
          <div>
            <label className="text-sm font-semibold block mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              전화번호
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })) }}
              placeholder="예: 010-1234-5678"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
              style={{
                background: 'var(--bg-muted)',
                borderColor: errors.phone ? '#dc2626' : 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            {errors.phone && (
              <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{errors.phone}</p>
            )}
          </div>

          {/* 알림 이메일 (선택) */}
          <div>
            <label className="text-sm font-semibold block mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              알림 수신 이메일 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(선택)</span>
            </label>
            <input
              type="email"
              value={notifyEmail}
              onChange={e => { setNotifyEmail(e.target.value); setErrors(p => ({ ...p, notifyEmail: undefined })) }}
              placeholder="예: doctor@hospital.com"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
              style={{
                background: 'var(--bg-muted)',
                borderColor: errors.notifyEmail ? '#dc2626' : 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            {errors.notifyEmail
              ? <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{errors.notifyEmail}</p>
              : <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  입력하지 않으면 가입한 Gmail로 발송됩니다.<br />
                  Gmail을 잘 확인하지 않으신다면 자주 쓰는 이메일을 입력해 주세요.
                </p>
            }
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !phone.trim() || loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--brand-primary)' }}
          >
            {loading ? '저장 중...' : '시작하기 →'}
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          닉네임과 전화번호는 마이페이지에서 언제든 변경할 수 있습니다.
        </p>
      </motion.div>
    </main>
  )
}
