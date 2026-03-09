'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import MiniCalendar, { CalendarMeeting } from '@/app/components/MiniCalendar'

type SlotInfo = {
  id: string
  proposed_time: string
  status: 'available' | 'claimed' | 'cancelled'
  claimed_at: string | null
  meet_link: string | null
  calendar_event_id: string | null
  is_mine: boolean
  is_taken: boolean
}

type BiddingEventForVendor = {
  id: string
  bidding_round: 1 | 2 | 3
  title: string | null
  note: string | null
  status: 'open'
  created_at: string
  doctor: { name: string; clinic_name: string | null }
  slots: SlotInfo[]
  slots_total: number
  slots_claimed: number
  slots_mine: number
}

const ROUND_COLOR: Record<number, string> = { 1: '#16a34a', 2: '#6366f1', 3: '#f59e0b' }
const ROUND_BG: Record<number, string> = { 1: 'rgba(22,163,74,0.12)', 2: 'rgba(99,102,241,0.12)', 3: 'rgba(245,158,11,0.12)' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

type Props = { vendorId: string; vendorName: string }

export default function VendorBiddingBoard({ vendorName }: Props) {
  const [events, setEvents] = useState<BiddingEventForVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterRound, setFilterRound] = useState<'all' | 1 | 2 | 3>('all')
  const [claimingSlot, setClaimingSlot] = useState<string | null>(null)
  const [cancellingSlot, setCancellingSlot] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const url = filterRound === 'all' ? '/api/bidding/slots' : `/api/bidding/slots?round=${filterRound}`
    const res = await fetch(url)
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filterRound])

  useEffect(() => { load() }, [load])

  async function claimSlot(slotId: string) {
    setClaimingSlot(slotId)
    const res = await fetch('/api/bidding/slots/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    setClaimingSlot(null)
    if (res.ok) {
      showToast('슬롯을 선점했습니다! 🎉')
      await load()
    } else {
      const d = await res.json()
      showToast(d.error ?? '선점에 실패했습니다.', 'error')
    }
  }

  async function cancelSlot(slotId: string) {
    if (!confirm('선점을 취소하시겠습니까?')) return
    setCancellingSlot(slotId)
    const res = await fetch('/api/bidding/slots/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    setCancellingSlot(null)
    if (res.ok) {
      showToast('선점이 취소되었습니다.')
      await load()
    } else {
      const d = await res.json()
      showToast(d.error ?? '취소에 실패했습니다.', 'error')
    }
  }

  const filtered = filterRound === 'all'
    ? events
    : events.filter(e => e.bidding_round === filterRound)

  // 달력용 슬롯 데이터 — 내가 선점한 것만 표시
  const calendarEvents = useMemo<CalendarMeeting[]>(() => {
    const result: CalendarMeeting[] = []
    for (const event of events) {
      const color = ROUND_COLOR[event.bidding_round]
      for (const slot of event.slots) {
        if (slot.is_mine) {
          result.push({
            date: slot.proposed_time,
            label: `${event.bidding_round}차 비딩 · ${event.doctor.name} 원장님${event.title ? ` · ${event.title}` : ''}`,
            color,
          })
        }
      }
    }
    return result
  }, [events])

  return (
    <div className="flex gap-5 items-start">
      {/* 왼쪽: 메인 콘텐츠 */}
      <div className="flex-1 min-w-0 space-y-4">
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{
            background: toast.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#fff',
          }}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            🏆 비딩 보드
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {vendorName} · 배정된 원장님 미팅 슬롯 선착순 선점
          </p>
        </div>
        <a href="/vendor" className="text-sm px-4 py-2 rounded-xl font-medium"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
          ← 인박스
        </a>
      </div>

      {/* 안내 배너 */}
      <div className="glass rounded-2xl px-5 py-3" style={{ borderLeft: '4px solid #f59e0b' }}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          ⚡ <strong>선착순</strong> 방식입니다. 원하는 시간대를 빠르게 선점하세요.
          다른 업체가 선점한 슬롯은 "선점됨"으로 표시되며, 누가 선점했는지는 알 수 없습니다.
        </p>
      </div>

      {/* 회차 필터 */}
      <div className="glass rounded-2xl px-5 py-3 flex gap-2 flex-wrap">
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
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p style={{ color: 'var(--text-muted)' }}>배정된 비딩 이벤트가 없습니다.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            관리자가 비딩 배정을 완료하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => {
            const isExpanded = expandedId === event.id
            const myCount = event.slots_mine

            return (
              <div key={event.id} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 flex-wrap text-left hover:opacity-90 transition-opacity">

                  {/* 회차 뱃지 */}
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                    style={{ background: ROUND_BG[event.bidding_round], color: ROUND_COLOR[event.bidding_round] }}>
                    {event.bidding_round}차 비딩
                  </span>

                  {/* 원장 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {event.doctor.name} 원장님
                      {event.doctor.clinic_name && (
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                          {event.doctor.clinic_name}
                        </span>
                      )}
                    </p>
                    {event.title && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{event.title}</p>
                    )}
                  </div>

                  {/* 내 선점 현황 */}
                  <div className="flex items-center gap-4 shrink-0">
                    {myCount > 0 ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${ROUND_COLOR[event.bidding_round]}18`, color: ROUND_COLOR[event.bidding_round] }}>
                        내 선점 {myCount}개
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                        미선점
                      </span>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      슬롯 {event.slots_total}개
                    </p>
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* 슬롯 상세 */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-default)' }}>
                    {event.note && (
                      <div className="px-5 py-3 text-xs italic"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        💬 원장 전달사항: {event.note}
                      </div>
                    )}

                    <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                      {[...event.slots]
                        .sort((a, b) => new Date(a.proposed_time).getTime() - new Date(b.proposed_time).getTime())
                        .map((slot, i) => {
                          const isPast = new Date(slot.proposed_time) < new Date()
                          const canClaim = slot.status === 'available' && !isPast
                          const isClaiming = claimingSlot === slot.id
                          const isCancelling = cancellingSlot === slot.id
                          // 이 이벤트에서 내가 이미 선점한 슬롯이 있으면 다른 슬롯 선점 불가
                          const alreadyClaimed = event.slots_mine > 0

                          return (
                            <div key={slot.id}
                              className="px-5 py-3 flex items-center gap-4 flex-wrap"
                              style={{
                                background: slot.is_mine ? `${ROUND_COLOR[event.bidding_round]}08` : 'transparent',
                              }}>
                              <span className="text-xs font-bold w-5 shrink-0"
                                style={{ color: 'var(--text-muted)' }}>{i + 1}</span>

                              <span className="text-sm font-medium shrink-0"
                                style={{
                                  color: isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                                  minWidth: 160,
                                  textDecoration: isPast ? 'line-through' : 'none',
                                }}>
                                {formatDate(slot.proposed_time)}
                              </span>

                              {/* 상태 표시 */}
                              {slot.is_mine ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: `${ROUND_COLOR[event.bidding_round]}20`, color: ROUND_COLOR[event.bidding_round] }}>
                                  ✓ 내 선점
                                </span>
                              ) : slot.is_taken ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                                  선점됨
                                </span>
                              ) : slot.status === 'cancelled' ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(107,114,128,0.1)', color: '#9ca3af' }}>
                                  취소
                                </span>
                              ) : (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
                                  선점 가능
                                </span>
                              )}

                              {/* 액션 버튼 (오른쪽 정렬) */}
                              <div className="ml-auto shrink-0 flex items-center gap-2">
                                {slot.is_mine && slot.meet_link && (
                                  <a href={slot.meet_link} target="_blank" rel="noopener noreferrer"
                                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                                    style={{ background: '#1a73e8', color: '#fff' }}>
                                    📹 Google Meet
                                  </a>
                                )}
                                {slot.is_mine && (
                                  <button
                                    onClick={() => cancelSlot(slot.id)}
                                    disabled={isCancelling}
                                    className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                    {isCancelling ? '취소 중...' : '선점 취소'}
                                  </button>
                                )}
                                {canClaim && !slot.is_mine && !slot.is_taken && (
                                  <button
                                    onClick={() => claimSlot(slot.id)}
                                    disabled={isClaiming || alreadyClaimed}
                                    className="text-xs px-4 py-1.5 rounded-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ background: alreadyClaimed ? '#9ca3af' : ROUND_COLOR[event.bidding_round], color: '#fff' }}
                                    title={alreadyClaimed ? '이미 이 이벤트의 슬롯을 선점했습니다' : ''}>
                                    {isClaiming ? '선점 중...' : '선점하기'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
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
        <MiniCalendar meetings={calendarEvents} listTitle="비딩 슬롯" />
      </div>
    </div>
  )
}
