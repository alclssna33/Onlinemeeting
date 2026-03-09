'use client'

import { useState, useEffect, useMemo } from 'react'
import MiniCalendar, { CalendarMeeting } from '@/app/components/MiniCalendar'

type Slot = {
  id: string
  proposed_time: string
  status: 'available' | 'claimed' | 'cancelled'
  claimed_at: string | null
  meet_link: string | null
  calendar_event_id: string | null
  vendor: { company_name: string; rep_name: string | null; email: string | null } | null
}

type BiddingEvent = {
  id: string
  bidding_round: 1 | 2 | 3
  title: string | null
  note: string | null
  status: 'open' | 'closed' | 'completed'
  created_at: string
  doctor: { id: string; name: string; email: string; clinic_name: string | null } | null
  slots: Slot[]
  slots_total: number
  slots_claimed: number
  slots_available: number
}

const ROUND_COLOR: Record<number, string> = { 1: '#16a34a', 2: '#6366f1', 3: '#f59e0b' }
const ROUND_BG: Record<number, string> = { 1: 'rgba(22,163,74,0.12)', 2: 'rgba(99,102,241,0.12)', 3: 'rgba(245,158,11,0.12)' }
const STATUS_LABEL: Record<string, string> = { open: '진행 중', closed: '마감', completed: '완료' }
const STATUS_COLOR: Record<string, string> = { open: '#16a34a', closed: '#6b7280', completed: '#6366f1' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

export default function BiddingMeetingMonitor() {
  const [events, setEvents] = useState<BiddingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRound, setFilterRound] = useState<'all' | 1 | 2 | 3>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'completed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/bidding/overview')
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 달력용: 선점 완료(claimed) 슬롯만
  const calendarEvents = useMemo<CalendarMeeting[]>(() => {
    const result: CalendarMeeting[] = []
    for (const event of events) {
      const color = ROUND_COLOR[event.bidding_round]
      for (const slot of event.slots) {
        if (slot.status === 'claimed') {
          result.push({
            date: slot.proposed_time,
            label: `${event.bidding_round}차 · ${event.doctor?.name ?? '원장님'}${slot.vendor ? ` ↔ ${slot.vendor.company_name}` : ''}`,
            color,
          })
        }
      }
    }
    return result
  }, [events])

  const stats = useMemo(() => ({
    total: events.length,
    open: events.filter(e => e.status === 'open').length,
    totalSlots: events.reduce((s, e) => s + e.slots_total, 0),
    claimedSlots: events.reduce((s, e) => s + e.slots_claimed, 0),
  }), [events])

  const filtered = useMemo(() => {
    let list = events
    if (filterRound !== 'all') list = list.filter(e => e.bidding_round === filterRound)
    if (filterStatus !== 'all') list = list.filter(e => e.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        (e.doctor?.name ?? '').toLowerCase().includes(q) ||
        (e.doctor?.clinic_name ?? '').toLowerCase().includes(q) ||
        (e.title ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [events, filterRound, filterStatus, search])

  if (loading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex gap-5 items-start">
      {/* 왼쪽: 메인 콘텐츠 */}
      <div className="flex-1 min-w-0 space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '총 비딩 이벤트', value: stats.total, color: '#f59e0b' },
          { label: '진행 중', value: stats.open, color: '#16a34a' },
          { label: '전체 슬롯', value: stats.totalSlots, color: '#6366f1' },
          { label: '선점 완료', value: stats.claimedSlots, color: '#ec4899' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="glass rounded-2xl px-5 py-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {/* 회차 필터 */}
          {(['all', 1, 2, 3] as const).map(r => (
            <button key={r} onClick={() => setFilterRound(r)}
              className="text-sm px-4 py-2 rounded-xl font-medium transition-all"
              style={{
                background: filterRound === r
                  ? (r === 'all' ? 'var(--brand-primary)' : ROUND_COLOR[r])
                  : 'var(--bg-muted)',
                color: filterRound === r ? '#fff' : 'var(--text-secondary)',
              }}>
              {r === 'all' ? '전체 회차' : `${r}차`}
            </button>
          ))}
          <div style={{ width: '1px', background: 'var(--border-default)', margin: '0 4px' }} />
          {/* 상태 필터 */}
          {(['all', 'open', 'closed', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="text-sm px-4 py-2 rounded-xl font-medium transition-all"
              style={{
                background: filterStatus === s
                  ? (s === 'all' ? 'var(--brand-primary)' : STATUS_COLOR[s])
                  : 'var(--bg-muted)',
                color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
              }}>
              {s === 'all' ? '전체 상태' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="원장명, 병원명, 제목 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border text-sm outline-none"
          style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* 이벤트 목록 */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p style={{ color: 'var(--text-muted)' }}>해당 비딩 이벤트가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => {
            const isExpanded = expandedId === event.id
            const claimRate = event.slots_total > 0
              ? Math.round((event.slots_claimed / event.slots_total) * 100)
              : 0

            return (
              <div key={event.id} className="glass rounded-2xl overflow-hidden">
                {/* 이벤트 헤더 (클릭 시 슬롯 펼치기) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 flex-wrap text-left hover:opacity-90 transition-opacity">
                  {/* 회차 뱃지 */}
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                    style={{ background: ROUND_BG[event.bidding_round], color: ROUND_COLOR[event.bidding_round] }}>
                    {event.bidding_round}차 비딩
                  </span>

                  {/* 상태 뱃지 */}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: `${STATUS_COLOR[event.status]}18`,
                      color: STATUS_COLOR[event.status],
                    }}>
                    {STATUS_LABEL[event.status]}
                  </span>

                  {/* 원장 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {event.doctor?.name ?? '알 수 없음'} 원장님
                      {event.doctor?.clinic_name && (
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                          {event.doctor.clinic_name}
                        </span>
                      )}
                    </p>
                    {event.title && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {event.title}
                      </p>
                    )}
                  </div>

                  {/* 슬롯 진행률 */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {event.slots_claimed} / {event.slots_total}
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                          슬롯 선점
                        </span>
                      </p>
                      {/* 진행률 바 */}
                      <div className="w-24 h-1.5 rounded-full mt-1 overflow-hidden"
                        style={{ background: 'var(--border-default)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${claimRate}%`,
                            background: ROUND_COLOR[event.bidding_round],
                          }} />
                      </div>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(event.created_at)}
                    </p>

                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* 슬롯 상세 (펼침) */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-default)' }}>
                    {event.note && (
                      <div className="px-5 py-3 text-xs italic"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        💬 원장 전달사항: {event.note}
                      </div>
                    )}

                    {event.slots.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                        등록된 슬롯이 없습니다.
                      </p>
                    ) : (
                      <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                        {[...event.slots]
                          .sort((a, b) => new Date(a.proposed_time).getTime() - new Date(b.proposed_time).getTime())
                          .map((slot, i) => (
                            <div key={slot.id} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                              {/* 번호 */}
                              <span className="text-xs font-bold w-6 shrink-0"
                                style={{ color: 'var(--text-muted)' }}>
                                {i + 1}
                              </span>

                              {/* 시간 */}
                              <span className="text-sm font-medium shrink-0"
                                style={{ color: 'var(--text-primary)', minWidth: 160 }}>
                                {formatDate(slot.proposed_time)}
                              </span>

                              {/* 상태 */}
                              {slot.status === 'claimed' ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
                                  선점 완료
                                </span>
                              ) : slot.status === 'cancelled' ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}>
                                  취소
                                </span>
                              ) : (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                                  대기 중
                                </span>
                              )}

                              {/* 선점 업체명 (관리자는 모두 볼 수 있음) */}
                              {slot.vendor && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {slot.vendor.company_name}
                                  </span>
                                  {slot.vendor.rep_name && (
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                      {slot.vendor.rep_name}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Meet 링크 */}
                              {slot.meet_link && (
                                <a href={slot.meet_link} target="_blank" rel="noopener noreferrer"
                                  className="text-xs px-3 py-1.5 rounded-lg font-bold ml-auto shrink-0"
                                  style={{ background: '#1a73e8', color: '#fff' }}>
                                  📹 Google Meet
                                </a>
                              )}

                              {/* 캘린더 등록 여부 */}
                              {slot.calendar_event_id && (
                                <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                                  style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                                  📅 캘린더
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </div>{/* 왼쪽 패널 끝 */}

      {/* 오른쪽: 달력 */}
      <div className="w-60 shrink-0 hidden md:block">
        <MiniCalendar meetings={calendarEvents} listTitle="비딩 확정 슬롯" />
      </div>
    </div>
  )
}
