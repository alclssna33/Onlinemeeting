'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Vendor = { id: string; company_name: string; rep_name: string | null }
type Stage = { id: number; name: string; color: string }

type Props = {
  vendor: Vendor
  stage: Stage
  doctorId: string
  onClose: () => void
}

const SLOT_COUNT = 5

function formatDateTime(value: string): string {
  // value는 "2026-03-10T14:00" 형태 (datetime-local)
  const d = new Date(value)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// datetime-local input의 min값: 오늘 날짜 (로컬 기준)
function getTodayMin(): string {
  const now = new Date()
  // 분 이하 버림
  now.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export default function MeetingRequestModal({ vendor, stage, doctorId, onClose }: Props) {
  // 5개 슬롯: null = 미선택, string = datetime-local value ("YYYY-MM-DDTHH:mm")
  const [slots, setSlots] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const supabase = createClient()

  const filledSlots = slots.filter(Boolean) as string[]
  const minDate = getTodayMin()

  function handleSlotChange(index: number, value: string) {
    setSlots(prev => {
      const next = [...prev]
      next[index] = value || null
      return next
    })
  }

  function clearSlot(index: number) {
    setSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
    if (inputRefs.current[index]) inputRefs.current[index]!.value = ''
  }

  function openPicker(index: number) {
    inputRefs.current[index]?.showPicker?.()
    inputRefs.current[index]?.focus()
  }

  async function handleSubmit() {
    if (filledSlots.length === 0) return
    setLoading(true)

    // datetime-local → ISO string 변환
    const proposedTimes = filledSlots.map(v => new Date(v).toISOString())

    const { data: inserted, error } = await (supabase.from('meeting_requests') as any).insert({
      doctor_id: doctorId,
      vendor_id: vendor.id,
      stage_id: stage.id,
      status: 'pending',
      proposed_times: proposedTimes,
      note: note || null,
    }).select('id').single()

    if (error) {
      setLoading(false)
      alert('오류가 발생했습니다: ' + error.message)
      return
    }

    if (inserted?.id) {
      fetch('/api/meetings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: inserted.id }),
      })
        .then(r => r.json())
        .then(d => console.log('[notify] result:', d))
        .catch(err => console.error('[notify] error:', err))
    }

    setLoading(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-strong rounded-3xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {done ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-4xl">✅</div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              미팅 신청 완료!
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>{vendor.company_name}</strong>에 미팅 요청을 보냈습니다.<br />
              업체 담당자가 시간을 확정하면 알려드릴게요.
            </p>
            <button onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-white"
              style={{ background: 'var(--brand-primary)' }}>
              확인
            </button>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  미팅 신청
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold">{vendor.company_name}</span>
                  {vendor.rep_name && ` · ${vendor.rep_name}`}
                </p>
              </div>
              <button onClick={onClose} className="text-xl leading-none"
                style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* 안내 */}
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              희망 미팅 시간 선택
              <span className="ml-2 font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
                ({filledSlots.length}/{SLOT_COUNT}개 선택 · 많을수록 확정 가능성↑)
              </span>
            </p>

            {/* 5개 슬롯 */}
            <div className="space-y-2 mb-5">
              {slots.map((slot, i) => (
                <div key={i} className="relative">
                  {/* 숨겨진 datetime-local input */}
                  <input
                    type="datetime-local"
                    min={minDate}
                    ref={el => { inputRefs.current[i] = el }}
                    onChange={e => handleSlotChange(i, e.target.value)}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                  />

                  {slot ? (
                    /* 선택된 슬롯 */
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
                      style={{ background: stage.color + '18', borderColor: stage.color + '60' }}>
                      <span className="text-xs font-bold w-5 shrink-0"
                        style={{ color: stage.color }}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatDateTime(slot)}
                      </span>
                      <button
                        onClick={() => clearSlot(i)}
                        className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}
                        title="삭제">
                        ✕
                      </button>
                      <button
                        onClick={() => openPicker(i)}
                        className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-70"
                        style={{ color: stage.color }}>
                        수정
                      </button>
                    </div>
                  ) : (
                    /* 빈 슬롯 */
                    <button
                      onClick={() => openPicker(i)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80 active:scale-[0.99]"
                      style={{
                        background: 'var(--bg-muted)',
                        borderColor: 'var(--border-default)',
                        borderStyle: 'dashed',
                      }}>
                      <span className="text-xs font-bold w-5 shrink-0"
                        style={{ color: 'var(--text-muted)' }}>
                        {i + 1}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        📅 날짜 · 시간 선택하기
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 전달 사항 */}
            <textarea
              placeholder="전달 사항 (선택) — 업체에 전하고 싶은 내용을 적어주세요"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border text-sm resize-none outline-none mb-4"
              style={{
                background: 'var(--bg-muted)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={filledSlots.length === 0 || loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ background: stage.color }}
            >
              {loading ? '신청 중...' : filledSlots.length === 0
                ? '날짜를 1개 이상 선택해주세요'
                : `미팅 신청하기 (${filledSlots.length}개 시간 제안)`}
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
