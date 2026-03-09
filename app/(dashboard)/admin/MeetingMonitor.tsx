'use client'

import { useState, useEffect, useMemo } from 'react'
import MiniCalendar from '@/app/components/MiniCalendar'

type MeetingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'
type MeetingType = 'standard' | 'express'

type Meeting = {
  id: string
  status: MeetingStatus
  meeting_type: MeetingType
  confirmed_time: string | null
  meet_link: string | null
  created_at: string
  note: string | null
  vendor_note: string | null
  stage: { name: string; color: string }
  doctor_profile: { name: string; email: string }
  doctor_info: { clinic_name: string | null } | null
  vendor: { company_name: string; rep_name: string | null; email: string | null }
}

const STATUS_LABEL: Record<MeetingStatus, string> = {
  pending: '응답 대기',
  confirmed: '확정',
  rejected: '거절',
  cancelled: '취소',
}
const STATUS_COLOR: Record<MeetingStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#16a34a',
  rejected: '#6b7280',
  cancelled: '#9ca3af',
}
const STATUS_BG: Record<MeetingStatus, string> = {
  pending: 'rgba(245,158,11,0.12)',
  confirmed: 'rgba(22,163,74,0.12)',
  rejected: 'rgba(107,114,128,0.10)',
  cancelled: 'rgba(156,163,175,0.10)',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

type Props = {
  meetingType?: 'standard' | 'express'  // undefined = 전체
}

export default function MeetingMonitor({ meetingType }: Props) {
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | MeetingStatus>('all')
  const [search, setSearch] = useState('')

  // meetingType prop으로 사전 필터링
  const meetings = meetingType
    ? allMeetings.filter(m => m.meeting_type === meetingType)
    : allMeetings

  useEffect(() => {
    fetch('/api/admin/meetings')
      .then(r => r.json())
      .then(data => { setAllMeetings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const stats = useMemo(() => ({
    total: meetings.length,
    pending: meetings.filter(m => m.status === 'pending').length,
    confirmed: meetings.filter(m => m.status === 'confirmed').length,
    rejected: meetings.filter(m => m.status === 'rejected').length,
  }), [meetings])

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? meetings : meetings.filter(m => m.status === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        (m.doctor_profile?.name ?? '').toLowerCase().includes(q) ||
        (m.vendor?.company_name ?? '').toLowerCase().includes(q) ||
        (m.doctor_info?.clinic_name?.toLowerCase().includes(q) ?? false) ||
        (m.stage?.name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [meetings, activeTab, search])

  const TABS: { key: 'all' | MeetingStatus; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: stats.total },
    { key: 'pending', label: '응답 대기', count: stats.pending },
    { key: 'confirmed', label: '확정', count: stats.confirmed },
    { key: 'rejected', label: '거절', count: stats.rejected },
  ]

  const calendarMeetings = useMemo(() =>
    meetings
      .filter(m => m.status === 'confirmed' && m.confirmed_time)
      .map(m => ({
        date: m.confirmed_time!,
        label: `${m.doctor_profile?.name ?? '원장님'} × ${m.vendor?.company_name ?? ''}`,
        color: m.stage?.color,
      })),
    [meetings]
  )

  if (loading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '총 미팅 요청', value: stats.total, color: '#6366f1' },
          { label: '응답 대기', value: stats.pending, color: '#f59e0b' },
          { label: '확정 완료', value: stats.confirmed, color: '#16a34a' },
          { label: '거절', value: stats.rejected, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 2단 레이아웃: 좌측 필터+테이블 / 우측 캘린더 */}
      <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0 space-y-4">

      {/* 필터 */}
      <div className="glass rounded-2xl px-5 py-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--bg-muted)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              }}>
              {tab.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--border-default)',
                  color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="원장명, 병원명, 업체명, 단계 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border text-sm outline-none"
          style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* 테이블 */}
      <div className="glass rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p style={{ color: 'var(--text-muted)' }}>해당 미팅이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}>
                  {['상태', '신청일', '단계', '원장님', '업체', '확정 일시', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                      style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border-default)' : 'none',
                    }}>
                    {/* 상태 */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                          style={{ background: STATUS_BG[m.status], color: STATUS_COLOR[m.status] }}>
                          {STATUS_LABEL[m.status]}
                        </span>
                        {m.meeting_type === 'express' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full w-fit"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                            ⚡ 일사천리
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 신청일 */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>
                      {formatDate(m.created_at)}
                    </td>

                    {/* 단계 */}
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: (m.stage?.color ?? '#888') + '22', color: m.stage?.color ?? '#888' }}>
                        {m.stage?.name ?? '-'}
                      </span>
                    </td>

                    {/* 원장님 */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                        {m.doctor_profile?.name ?? '알 수 없음'} 원장님
                      </p>
                      {m.doctor_info?.clinic_name && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {m.doctor_info.clinic_name}
                        </p>
                      )}
                    </td>

                    {/* 업체 */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                        {m.vendor?.company_name ?? '알 수 없음'}
                      </p>
                      {m.vendor?.rep_name && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {m.vendor.rep_name}
                        </p>
                      )}
                    </td>

                    {/* 확정 일시 */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: m.confirmed_time ? '#16a34a' : 'var(--text-muted)' }}>
                      {m.confirmed_time ? formatDate(m.confirmed_time) : '—'}
                    </td>

                    {/* Meet 링크 / 거절 사유 */}
                    <td className="px-4 py-3">
                      {m.meet_link && (
                        <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                          style={{ background: '#1a73e8', color: '#fff' }}>
                          Meet
                        </a>
                      )}
                      {m.status === 'rejected' && m.vendor_note && (
                        <p className="text-xs italic max-w-[160px] truncate"
                          style={{ color: '#dc2626' }}
                          title={m.vendor_note}>
                          {m.vendor_note}
                        </p>
                      )}
                      {m.note && (
                        <p className="text-xs italic max-w-[160px] truncate mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                          title={m.note}>
                          💬 {m.note}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div>{/* end 좌측 */}

      {/* 우측: 캘린더 */}
      <div className="w-64 shrink-0 hidden lg:block">
        <MiniCalendar meetings={calendarMeetings} />
      </div>

      </div>{/* end 2단 레이아웃 */}
    </div>
  )
}
