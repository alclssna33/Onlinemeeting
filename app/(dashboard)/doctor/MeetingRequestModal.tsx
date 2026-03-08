'use client'

import { useState } from 'react'
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

function getNextSlots(): string[] {
  // 현재 시각 기준 가장 가까운 정시(9~18시) 슬롯 10개 반환
  const slots: string[] = []
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  while (slots.length < 10) {
    const h = now.getHours()
    if (h >= 9 && h <= 17) slots.push(now.toISOString())
    now.setHours(now.getHours() + 1)
    if (now.getHours() > 17) {
      now.setDate(now.getDate() + 1)
      now.setHours(9)
    }
  }
  return slots
}

function formatSlot(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function MeetingRequestModal({ vendor, stage, doctorId, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const slots = getNextSlots()
  const supabase = createClient()

  function toggleSlot(iso: string) {
    setSelected(prev =>
      prev.includes(iso)
        ? prev.filter(s => s !== iso)
        : prev.length < 5 ? [...prev, iso] : prev
    )
  }

  async function handleSubmit() {
    if (selected.length === 0) return
    setLoading(true)
    const { data: inserted, error } = await (supabase.from('meeting_requests') as any).insert({
      doctor_id: doctorId,
      vendor_id: vendor.id,
      stage_id: stage.id,
      status: 'pending',
      proposed_times: selected,
      note: note || null,
    }).select('id').single()

    if (error) {
      setLoading(false)
      alert('오류가 발생했습니다: ' + error.message)
      return
    }

    // 벤더사에게 이메일 알림 발송 (non-blocking)
    if (inserted?.id) {
      fetch('/api/meetings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: inserted.id }),
      }).catch(err => console.error('[notify]', err))
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
        className="glass-strong rounded-3xl p-7 w-full max-w-lg"
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
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-white"
              style={{ background: 'var(--brand-primary)' }}
            >
              확인
            </button>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-5">
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

            {/* 시간 선택 */}
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              희망 시간 선택 <span style={{ color: 'var(--text-muted)' }}>({selected.length}/5 선택)</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {slots.map(slot => {
                const isSelected = selected.includes(slot)
                return (
                  <button
                    key={slot}
                    onClick={() => toggleSlot(slot)}
                    className="text-sm px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      background: isSelected ? stage.color : 'var(--bg-muted)',
                      borderColor: isSelected ? stage.color : 'var(--border-default)',
                      color: isSelected ? '#fff' : 'var(--text-primary)',
                      opacity: !isSelected && selected.length >= 5 ? 0.4 : 1,
                    }}
                  >
                    {formatSlot(slot)}
                  </button>
                )
              })}
            </div>

            {/* 메모 */}
            <textarea
              placeholder="전달 사항 (선택)"
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
              disabled={selected.length === 0 || loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ background: stage.color }}
            >
              {loading ? '신청 중...' : `미팅 신청하기 (${selected.length}개 시간)`}
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
