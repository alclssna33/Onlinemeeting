'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MiniCalendar from '@/app/components/MiniCalendar'

type MeetingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'

type Meeting = {
  id: string
  status: MeetingStatus
  proposed_times: string[]
  confirmed_time: string | null
  meet_link: string | null
  note: string | null
  vendor_note: string | null
  created_at: string
  updated_at: string
  stage: { name: string; color: string }
  vendor: { company_name: string; rep_name: string | null }
}

type Props = { meetings: Meeting[] }

const STATUS_COLOR: Record<MeetingStatus, string> = {
  pending: '#f59e0b', confirmed: '#16a34a', rejected: '#6b7280', cancelled: '#9ca3af',
}
const STATUS_BG: Record<MeetingStatus, string> = {
  pending: 'rgba(245,158,11,0.12)', confirmed: 'rgba(22,163,74,0.12)',
  rejected: 'rgba(107,114,128,0.10)', cancelled: 'rgba(156,163,175,0.10)',
}
const STATUS_LABEL: Record<MeetingStatus, string> = {
  pending: '응답 대기', confirmed: '확정', rejected: '거절', cancelled: '취소',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  })
}
function formatShort(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  })
}

// ── 섹션 토글 래퍼 ─────────────────────────────────────────
function Section({ title, count, color, defaultOpen = true, children }: {
  title: string; count: number; color: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all hover:opacity-80"
        style={{ background: 'var(--bg-muted)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color }}>{title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: color + '22', color }}>{count}</span>
        </div>
        <span className="text-xs transition-transform duration-200"
          style={{ color: 'var(--text-muted)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}>
            <div className="p-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const SIX_HOURS = 6 * 60 * 60 * 1000

function hasNew(list: Meeting[]) {
  const now = Date.now()
  return list.some(m => {
    // updated_at이 created_at보다 이후이면 벤더가 처리한 것
    const isUpdatedByVendor = m.updated_at !== m.created_at
    return isUpdatedByVendor && now - new Date(m.updated_at).getTime() < SIX_HOURS
  })
}

export default function DoctorMeetings({ meetings }: Props) {
  const pending = meetings.filter(m => m.status === 'pending')
  const confirmed = meetings.filter(m => m.status === 'confirmed')
  const others = meetings.filter(m => m.status === 'rejected' || m.status === 'cancelled')

  const calendarMeetings = confirmed
    .filter(m => m.confirmed_time)
    .map(m => ({
      date: m.confirmed_time!,
      label: m.vendor.company_name,
      color: m.stage.color,
    }))

  if (meetings.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-16 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>신청한 미팅이 없습니다</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          좌측에서 단계를 선택하고 원하는 업체에 미팅을 신청해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 items-start">

    {/* 좌측: 미팅 목록 */}
    <div className="flex-1 min-w-0 space-y-3">

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '응답 대기', value: pending.length, color: '#f59e0b', isNew: false },
          { label: '확정 완료', value: confirmed.length, color: '#16a34a', isNew: hasNew(confirmed) },
          { label: '거절/취소', value: others.length, color: '#9ca3af', isNew: hasNew(others) },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl px-4 py-3 text-center relative">
            {s.isNew && (
              <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#dc2626', color: '#fff', fontSize: '10px', lineHeight: 1 }}>
                N
              </span>
            )}
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── 확정된 미팅 ── */}
      {confirmed.length > 0 && (
        <Section title="✅ 확정된 미팅" count={confirmed.length} color="#16a34a" defaultOpen={true}>
          {confirmed.map(m => (
            <div key={m.id} className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'rgba(22,163,74,0.3)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-1 h-10 rounded-full shrink-0" style={{ background: m.stage.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {m.vendor.company_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: m.stage.color + '22', color: m.stage.color }}>
                      {m.stage.name}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: '#16a34a' }}>
                    📅 {formatDate(m.confirmed_time!)}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: STATUS_BG.confirmed, color: STATUS_COLOR.confirmed }}>
                  {STATUS_LABEL.confirmed}
                </span>
              </div>
              <div className="px-4 pb-3 pt-2 flex items-center gap-3 flex-wrap"
                style={{ borderTop: '1px solid var(--border-default)' }}>
                {m.meet_link ? (
                  <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition-all"
                    style={{ background: '#1a73e8', color: '#fff' }}>
                    🎥 Google Meet 입장하기
                  </a>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-xl"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                    Meet 링크 준비 중
                  </span>
                )}
                {m.note && (
                  <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                    💬 내 전달사항: {m.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ── 응답 대기 중 ── */}
      {pending.length > 0 && (
        <Section title="⏳ 응답 대기 중" count={pending.length} color="#f59e0b" defaultOpen={true}>
          {pending.map(m => (
            <div key={m.id} className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-1 h-10 rounded-full shrink-0" style={{ background: m.stage.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {m.vendor.company_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: m.stage.color + '22', color: m.stage.color }}>
                      {m.stage.name}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    신청일 {formatShort(m.created_at)} · 후보 {m.proposed_times.length}개 제안
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: STATUS_BG.pending, color: STATUS_COLOR.pending }}>
                  {STATUS_LABEL.pending}
                </span>
              </div>
              <div className="px-4 pb-3 pt-2 space-y-2"
                style={{ borderTop: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>제안한 후보 시간</p>
                <div className="flex flex-wrap gap-2">
                  {m.proposed_times.map((t, idx) => (
                    <span key={t} className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                      {idx + 1}. {formatDate(t)}
                    </span>
                  ))}
                </div>
                {m.note && (
                  <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                    💬 전달사항: {m.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ── 거절/취소 ── */}
      {others.length > 0 && (
        <Section title="거절 / 취소" count={others.length} color="#9ca3af" defaultOpen={false}>
          {others.map(m => (
            <div key={m.id} className="rounded-xl border px-4 py-3 flex items-center gap-3"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)', opacity: 0.75 }}>
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: m.stage.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {m.vendor.company_name}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{m.stage.name}</span>
                {m.vendor_note && (
                  <p className="text-xs italic mt-0.5" style={{ color: '#dc2626' }}>사유: {m.vendor_note}</p>
                )}
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: STATUS_BG[m.status], color: STATUS_COLOR[m.status] }}>
                {STATUS_LABEL[m.status]}
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>

    {/* 우측: 미니 캘린더 */}
    <div className="w-64 shrink-0 hidden md:block">
      <MiniCalendar meetings={calendarMeetings} />
    </div>

    </div>
  )
}
