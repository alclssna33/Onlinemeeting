'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import MiniCalendar, { CalendarMeeting } from '@/app/components/MiniCalendar'

type SlotStatus = 'available' | 'claimed' | 'cancelled'

type Slot = {
  id: string
  proposed_time: string
  status: SlotStatus
  claimed_at: string | null
  meet_link: string | null
  calendar_event_id: string | null
  vendor: { company_name: string; rep_name: string | null } | null
}

type BiddingEvent = {
  id: string
  bidding_round: 1 | 2 | 3
  title: string | null
  note: string | null
  status: 'open' | 'closed' | 'completed'
  created_at: string
  slots: Slot[]
  slots_total: number
  slots_claimed: number
  slots_available: number
}

const ROUND_COLOR: Record<number, string> = { 1: '#16a34a', 2: '#6366f1', 3: '#f59e0b' }
const ROUND_BG: Record<number, string> = { 1: 'rgba(22,163,74,0.12)', 2: 'rgba(99,102,241,0.12)', 3: 'rgba(245,158,11,0.12)' }
const STATUS_LABEL = { open: '진행 중', closed: '마감', completed: '완료' }
const STATUS_COLOR = { open: '#16a34a', closed: '#6b7280', completed: '#6366f1' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

function formatDatetimeLocal(iso: string) {
  // datetime-local input용 포맷
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Props = { doctorId: string; doctorName: string }

export default function DoctorBiddingBoard({ doctorName }: Props) {
  const [events, setEvents] = useState<BiddingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterRound, setFilterRound] = useState<'all' | 1 | 2 | 3>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // 이벤트 생성 폼 상태
  const [form, setForm] = useState({
    bidding_round: 1 as 1 | 2 | 3,
    title: '',
    note: '',
    slots: [''],
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/bidding/events')
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filterRound === 'all'
    ? events
    : events.filter(e => e.bidding_round === filterRound)

  function addSlot() {
    setForm(f => ({ ...f, slots: [...f.slots, ''] }))
  }
  function removeSlot(i: number) {
    setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }))
  }
  function setSlot(i: number, val: string) {
    setForm(f => {
      const slots = [...f.slots]
      slots[i] = val
      return { ...f, slots }
    })
  }

  async function handleCreate() {
    setCreateError('')
    const validSlots = form.slots.filter(s => s.trim())
    if (!validSlots.length) {
      setCreateError('슬롯을 1개 이상 입력해주세요.')
      return
    }
    setCreating(true)
    const res = await fetch('/api/bidding/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bidding_round: form.bidding_round,
        title: form.title.trim() || null,
        note: form.note.trim() || null,
        proposed_times: validSlots.map(s => new Date(s).toISOString()),
      }),
    })
    setCreating(false)
    if (res.ok) {
      setShowCreate(false)
      setForm({ bidding_round: 1, title: '', note: '', slots: [''] })
      await load()
    } else {
      const d = await res.json()
      setCreateError(d.error ?? '오류가 발생했습니다.')
    }
  }

  async function handleStatusChange(eventId: string, status: 'closed' | 'completed') {
    setUpdatingStatus(eventId)
    await fetch('/api/bidding/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, status }),
    })
    setUpdatingStatus(null)
    await load()
  }

  // 달력용: 선점 완료(claimed) 슬롯만
  const calendarEvents = useMemo<CalendarMeeting[]>(() => {
    const result: CalendarMeeting[] = []
    for (const event of events) {
      const color = ROUND_COLOR[event.bidding_round]
      for (const slot of event.slots) {
        if (slot.status === 'claimed') {
          result.push({
            date: slot.proposed_time,
            label: slot.vendor
              ? `${event.bidding_round}차 비딩 · ${slot.vendor.company_name}`
              : `${event.bidding_round}차 비딩${event.title ? ` · ${event.title}` : ''}`,
            color,
          })
        }
      }
    }
    return result
  }, [events])

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
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            🏆 비딩 관리
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {doctorName} 원장님 · 비딩 이벤트 등록 및 슬롯 현황
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/doctor" className="text-sm px-4 py-2 rounded-xl font-medium transition-all"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
            ← 대시보드
          </a>
          <button onClick={() => {
            const defaultRound = filterRound !== 'all' ? filterRound : 1
            setForm(f => ({ ...f, bidding_round: defaultRound, title: '', note: '', slots: [''] }))
            setShowCreate(v => !v)
          }}
            className="text-sm px-4 py-2 rounded-xl font-bold transition-all"
            style={{ background: '#f59e0b', color: '#fff' }}>
            + 이벤트 등록
          </button>
        </div>
      </div>

      {/* 이벤트 생성 폼 */}
      {showCreate && (
        <div className="glass rounded-2xl p-5 space-y-4" style={{ border: '2px solid #f59e0b44' }}>
          <h2 className="font-bold text-sm" style={{ color: '#f59e0b' }}>새 비딩 이벤트 등록</h2>

          <div className="flex gap-2">
            {([1, 2, 3] as const).map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, bidding_round: r }))}
                className="px-4 py-1.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: form.bidding_round === r ? ROUND_COLOR[r] : 'var(--bg-muted)',
                  color: form.bidding_round === r ? '#fff' : 'var(--text-muted)',
                }}>
                {r}차 비딩
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                제목 (선택)
              </label>
              <input
                type="text"
                placeholder="예: 인테리어 업체 비딩 1차"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                업체 전달사항 (선택)
              </label>
              <input
                type="text"
                placeholder="예: 미팅 전 포트폴리오 준비 요청"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
              미팅 슬롯 ({form.slots.length}개) — 최소 1개 필요
            </label>
            <div className="space-y-2">
              {form.slots.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="datetime-local"
                    value={s}
                    onChange={e => setSlot(i, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  />
                  {form.slots.length > 1 && (
                    <button onClick={() => removeSlot(i)}
                      className="text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addSlot}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
              + 슬롯 추가
            </button>
          </div>

          {createError && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{createError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); setCreateError('') }}
              className="text-sm px-4 py-2 rounded-xl"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
              취소
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="text-sm px-5 py-2 rounded-xl font-bold disabled:opacity-50"
              style={{ background: '#f59e0b', color: '#fff' }}>
              {creating ? '등록 중...' : '이벤트 등록'}
            </button>
          </div>
        </div>
      )}

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
            {r === 'all' ? '전체' : `${r}차`}
          </button>
        ))}
      </div>

      {/* 이벤트 목록 */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p style={{ color: 'var(--text-muted)' }}>등록된 비딩 이벤트가 없습니다.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            우측 상단의 "이벤트 등록" 버튼으로 시작하세요.
          </p>
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
                <div
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 flex-wrap text-left hover:opacity-90 transition-opacity cursor-pointer">
                  {/* 회차 뱃지 */}
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                    style={{ background: ROUND_BG[event.bidding_round], color: ROUND_COLOR[event.bidding_round] }}>
                    {event.bidding_round}차 비딩
                  </span>

                  {/* 상태 뱃지 */}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: `${STATUS_COLOR[event.status]}18`, color: STATUS_COLOR[event.status] }}>
                    {STATUS_LABEL[event.status]}
                  </span>

                  {/* 제목/노트 */}
                  <div className="flex-1 min-w-0">
                    {event.title ? (
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatDate(event.created_at)} 등록</p>
                    )}
                    {event.note && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                        💬 {event.note}
                      </p>
                    )}
                  </div>

                  {/* 슬롯 현황 */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {event.slots_claimed} / {event.slots_total}
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>선점</span>
                      </p>
                      <div className="w-24 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--border-default)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${claimRate}%`, background: ROUND_COLOR[event.bidding_round] }} />
                      </div>
                    </div>

                    {event.status === 'open' && (
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleStatusChange(event.id, 'closed')}
                          disabled={updatingStatus === event.id}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium disabled:opacity-40"
                          style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                          마감
                        </button>
                        <button
                          onClick={() => handleStatusChange(event.id, 'completed')}
                          disabled={updatingStatus === event.id}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium disabled:opacity-40"
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                          완료
                        </button>
                      </div>
                    )}

                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* 슬롯 상세 */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-default)' }}>
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
                              <span className="text-xs font-bold w-5 shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>

                              <span className="text-sm font-medium shrink-0" style={{ color: 'var(--text-primary)', minWidth: 160 }}>
                                {formatDate(slot.proposed_time)}
                              </span>

                              {slot.status === 'claimed' ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
                                  선점 완료
                                </span>
                              ) : slot.status === 'cancelled' ? (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}>
                                  취소됨
                                </span>
                              ) : (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                                  대기 중
                                </span>
                              )}

                              {/* 선점 업체 (원장은 볼 수 있음) */}
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

                              {slot.meet_link && (
                                <a href={slot.meet_link} target="_blank" rel="noopener noreferrer"
                                  className="text-xs px-3 py-1.5 rounded-lg font-bold ml-auto shrink-0"
                                  style={{ background: '#1a73e8', color: '#fff' }}>
                                  📹 Google Meet
                                </a>
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
        <MiniCalendar meetings={calendarEvents} listTitle="비딩 슬롯" />
      </div>
    </div>
  )
}
