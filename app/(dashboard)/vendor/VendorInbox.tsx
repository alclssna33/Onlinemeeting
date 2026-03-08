'use client'

import { useState, useMemo, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// ── 타입 ──────────────────────────────────────────────────────
type MeetingStatus = 'pending' | 'confirmed' | 'rejected'

type Meeting = {
  id: string
  status: MeetingStatus
  proposed_times: string[]
  confirmed_time: string | null
  meet_link: string | null
  note: string | null
  vendor_note: string | null
  created_at: string
  stage: { name: string; color: string; icon: string }
  doctor_profile: { name: string }
  doctor_info: { clinic_name: string | null } | null
}

type Stage = { id: number; name: string; color: string }

type Props = {
  meetings: Meeting[]
  stages: Stage[]
  vendorName: string
}

// ── 헬퍼 ──────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

const STATUS_LABEL: Record<MeetingStatus, string> = {
  pending: '응답 필요',
  confirmed: '확정됨',
  rejected: '거절됨',
}
const STATUS_COLOR: Record<MeetingStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#16a34a',
  rejected: '#6b7280',
}
const STATUS_BG: Record<MeetingStatus, string> = {
  pending: 'rgba(245,158,11,0.12)',
  confirmed: 'rgba(22,163,74,0.12)',
  rejected: 'rgba(107,114,128,0.10)',
}

// ── 개별 미팅 카드 ────────────────────────────────────────────
function MeetingCard({ meeting, onConfirm, onReject, loading, overrideMeetLink }: {
  meeting: Meeting
  onConfirm: (id: string, time: string) => void
  onReject: (id: string, note: string) => void
  loading: string | null
  overrideMeetLink?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const isLoading = loading === meeting.id
  const clinicName = meeting.doctor_info?.clinic_name
  const meetLink = overrideMeetLink ?? meeting.meet_link

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
      }}
    >
      {/* 카드 헤더 */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* 단계 컬러 바 */}
        <div className="w-1 h-10 rounded-full flex-shrink-0"
          style={{ background: meeting.stage.color }} />

        {/* 원장/병원 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {meeting.doctor_profile?.name ?? '원장님'} 원장님
            </span>
            {clinicName && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                {clinicName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: meeting.stage.color + '22', color: meeting.stage.color }}>
              {meeting.stage.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              신청 {formatShortDate(meeting.created_at)}
            </span>
          </div>
        </div>

        {/* 상태 뱃지 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: STATUS_BG[meeting.status],
              color: STATUS_COLOR[meeting.status],
            }}>
            {STATUS_LABEL[meeting.status]}
          </span>

          {/* 펼치기 버튼 (pending만) */}
          {meeting.status === 'pending' && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
              style={{
                background: expanded ? 'var(--brand-primary)' : 'var(--bg-muted)',
                color: expanded ? '#fff' : 'var(--text-secondary)',
              }}>
              {expanded ? '접기' : '확인 · 처리'}
            </button>
          )}
        </div>
      </div>

      {/* 확정됨 → Meet 링크 표시 */}
      {meeting.status === 'confirmed' && (
        <div className="px-5 pb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--text-secondary)' }}>
            <span>📅</span>
            <span className="font-medium" style={{ color: '#16a34a' }}>
              {formatDate(meeting.confirmed_time!)}
            </span>
          </div>
          {meetLink ? (
            <a href={meetLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80"
              style={{ background: '#1a73e8', color: '#fff' }}>
              🎥 Google Meet 입장
            </a>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
              Meet 링크 준비 중
            </span>
          )}
        </div>
      )}

      {/* 원장 전달사항 */}
      {meeting.note && (
        <div className="px-5 pb-2">
          <p className="text-xs px-3 py-2 rounded-xl italic"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            💬 원장님: {meeting.note}
          </p>
        </div>
      )}

      {/* 거절됨 → 내가 남긴 거절 사유 */}
      {meeting.status === 'rejected' && meeting.vendor_note && (
        <div className="px-5 pb-3">
          <p className="text-xs px-3 py-2 rounded-xl italic"
            style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid #fecaca' }}>
            📝 거절 사유: {meeting.vendor_note}
          </p>
        </div>
      )}

      {/* 펼쳐지는 후보 시간 & 처리 영역 */}
      <AnimatePresence>
        {expanded && meeting.status === 'pending' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border-default)' }}
          >
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                제안된 후보 시간 (하나를 선택 후 확정)
              </p>

              {/* 후보 시간 목록 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {meeting.proposed_times.map((t, i) => {
                  const isSelected = selectedTime === t
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(isSelected ? null : t)}
                      className="text-sm px-3 py-2.5 rounded-xl border text-left transition-all hover:opacity-90"
                      style={{
                        background: isSelected ? meeting.stage.color : 'var(--bg-muted)',
                        borderColor: isSelected ? meeting.stage.color : 'var(--border-default)',
                        color: isSelected ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      <span className="font-medium text-xs opacity-70">후보 {i + 1}</span>
                      <br />
                      {formatDate(t)}
                    </button>
                  )
                })}
              </div>

              {/* 확정 / 거절 버튼 */}
              {!rejectMode ? (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => selectedTime && onConfirm(meeting.id, selectedTime)}
                    disabled={!selectedTime || isLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                    style={{ background: '#16a34a' }}
                  >
                    {isLoading ? '처리 중...' : selectedTime ? '✅ 확정하기' : '시간을 선택하세요'}
                  </button>
                  <button
                    onClick={() => setRejectMode(true)}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ background: 'var(--bg-muted)', color: '#dc2626', border: '1px solid #fecaca' }}
                  >
                    거절
                  </button>
                </div>
              ) : (
                /* 거절 사유 입력 */
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>
                    거절 사유 (선택사항)
                  </p>
                  <textarea
                    autoFocus
                    placeholder="거절 이유나 전달 사항을 적어주세요. (예: 해당 기간 일정이 없습니다 / 다른 업체와 계약 완료 등)"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none"
                    style={{
                      background: 'var(--bg-muted)',
                      borderColor: '#fecaca',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRejectMode(false); setRejectNote('') }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold border"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      취소
                    </button>
                    <button
                      onClick={() => onReject(meeting.id, rejectNote)}
                      disabled={isLoading}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: '#dc2626' }}
                    >
                      {isLoading ? '처리 중...' : '거절 확정'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── 메인 인박스 컴포넌트 ──────────────────────────────────────
export default function VendorInbox({ meetings, stages, vendorName }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<'all' | MeetingStatus>('pending')
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  // 확정 직후 즉시 표시할 meetLink (router.refresh 대기 없이)
  const [confirmedLinks, setConfirmedLinks] = useState<Record<string, string>>({})


  // ── 통계 ──
  const stats = useMemo(() => ({
    pending: meetings.filter(m => m.status === 'pending').length,
    confirmed: meetings.filter(m => m.status === 'confirmed').length,
    rejected: meetings.filter(m => m.status === 'rejected').length,
  }), [meetings])

  // ── 필터링 ──
  const filtered = useMemo(() => {
    let list = [...meetings]

    // 탭 필터
    if (activeTab !== 'all') list = list.filter(m => m.status === activeTab)

    // 단계 필터 (stage name으로 매핑)
    if (selectedStageId !== null) {
      const stageName = stages.find(s => s.id === selectedStageId)?.name
      if (stageName) list = list.filter(m => m.stage.name === stageName)
    }

    // 검색 (원장명 + 병원명)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(m =>
        (m.doctor_profile?.name ?? '').toLowerCase().includes(q) ||
        (m.doctor_info?.clinic_name?.toLowerCase().includes(q) ?? false)
      )
    }

    // 정렬
    list.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortAsc ? diff : -diff
    })

    return list
  }, [meetings, activeTab, selectedStageId, search, sortAsc, stages])

  // ── 액션 ──
  async function handleConfirm(requestId: string, confirmedTime: string) {
    setLoadingId(requestId)
    try {
      const res = await fetch('/api/meetings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, confirmedTime }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('오류: ' + data.error)
        return
      }
      // 응답에서 meetLink를 즉시 반영 (router.refresh 전에도 표시)
      if (data.meetLink) {
        setConfirmedLinks(prev => ({ ...prev, [requestId]: data.meetLink }))
      }
      startTransition(() => router.refresh())
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleReject(requestId: string, vendorNote: string) {
    setLoadingId(requestId)
    try {
      const res = await fetch('/api/meetings/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, vendorNote }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert('오류: ' + data.error)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setLoadingId(null)
    }
  }

  // ── UI ────────────────────────────────────────────────────
  const TABS: { key: 'all' | MeetingStatus; label: string; count: number }[] = [
    { key: 'pending', label: '응답 필요', count: stats.pending },
    { key: 'confirmed', label: '확정됨', count: stats.confirmed },
    { key: 'rejected', label: '거절됨', count: stats.rejected },
    { key: 'all', label: '전체', count: meetings.length },
  ]

  return (
    <div className="space-y-5">
      {/* 상단 헤더 */}
      <div className="glass rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            미팅 요청 인박스
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            안녕하세요, <span className="font-semibold">{vendorName}</span>님 · 총 {meetings.length}건
          </p>
        </div>

        {/* 통계 요약 칩 */}
        <div className="flex gap-2 flex-wrap">
          {stats.pending > 0 && (
            <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              응답 필요 {stats.pending}건
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-semibold"
            style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
            확정 {stats.confirmed}건
          </div>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="glass rounded-2xl px-5 py-4 space-y-3">
        {/* 상태 탭 */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--bg-muted)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--border-default)',
                    color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                  }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 검색 + 단계 필터 + 정렬 */}
        <div className="flex gap-2 flex-col sm:flex-row">
          {/* 검색 */}
          <input
            type="text"
            placeholder="원장님 이름 또는 병원명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-muted)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />

          {/* 단계 필터 */}
          <select
            value={selectedStageId ?? ''}
            onChange={e => setSelectedStageId(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 rounded-xl border text-sm outline-none"
            style={{
              background: 'var(--bg-muted)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">전체 단계</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* 정렬 */}
          <button
            onClick={() => setSortAsc(v => !v)}
            className="px-4 py-2 rounded-xl border text-sm font-medium transition-all hover:opacity-80 whitespace-nowrap"
            style={{
              background: 'var(--bg-muted)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            {sortAsc ? '오래된 순 ↑' : '최신 순 ↓'}
          </button>
        </div>
      </div>

      {/* 결과 카운트 */}
      {(search || selectedStageId !== null) && (
        <p className="text-sm px-1" style={{ color: 'var(--text-muted)' }}>
          검색 결과 {filtered.length}건
          <button onClick={() => { setSearch(''); setSelectedStageId(null) }}
            className="ml-2 underline" style={{ color: 'var(--brand-primary)' }}>
            초기화
          </button>
        </p>
      )}

      {/* 미팅 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {activeTab === 'pending' ? '응답이 필요한 요청이 없습니다' : '해당 요청이 없습니다'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            원장님으로부터 미팅 요청이 오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onConfirm={handleConfirm}
                onReject={handleReject}
                loading={loadingId}
                overrideMeetLink={confirmedLinks[meeting.id]}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
