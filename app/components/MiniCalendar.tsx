'use client'

import { useState } from 'react'

export type CalendarMeeting = {
  date: string   // ISO string (confirmed_time)
  label: string  // 표시할 이름 (업체명 또는 원장명)
  color?: string // 단계 색상
}

type Props = {
  meetings: CalendarMeeting[]
  listTitle?: string
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function MiniCalendar({ meetings, listTitle = '이번 달 확정 미팅' }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // 현재 월의 확정 미팅을 day → meetings[] 맵으로 변환
  const markedMap: Record<number, CalendarMeeting[]> = {}
  meetings.forEach(m => {
    const d = new Date(m.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!markedMap[day]) markedMap[day] = []
      markedMap[day].push(m)
    }
  })

  // 달력 셀 배열
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // 이번 달에 미팅이 있으면 자동으로 그 달로 이동하는 초기값 설정은 생략 (사용자가 직접 탐색)
  const thisMonthCount = Object.values(markedMap).flat().length

  return (
    <div className="glass rounded-2xl p-4 sticky top-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-lg font-bold transition-all hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}>
          ‹
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-lg font-bold transition-all hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}>
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={d} className="text-center text-xs font-semibold py-1"
            style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          const col = idx % 7
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const dayMeetings = day ? (markedMap[day] ?? []) : []
          const hasMarking = dayMeetings.length > 0

          return (
            <div key={idx} className="relative flex flex-col items-center py-0.5 group">
              {day && (
                <>
                  <div
                    className="w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all"
                    style={{
                      fontWeight: hasMarking ? 700 : 400,
                      background: isToday
                        ? 'var(--brand-primary)'
                        : hasMarking
                          ? 'rgba(22,163,74,0.18)'
                          : 'transparent',
                      color: isToday
                        ? '#fff'
                        : col === 0 ? '#ef4444'
                        : col === 6 ? '#3b82f6'
                        : 'var(--text-primary)',
                    }}>
                    {day}
                  </div>

                  {/* 점 인디케이터 */}
                  {hasMarking && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayMeetings.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-1 h-1 rounded-full"
                          style={{ background: m.color ?? '#16a34a' }} />
                      ))}
                    </div>
                  )}

                  {/* 호버 툴팁 */}
                  {hasMarking && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 hidden group-hover:block pointer-events-none">
                      <div className="rounded-xl px-3 py-2 text-xs shadow-xl whitespace-nowrap"
                        style={{
                          background: 'var(--bg-muted)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                        }}>
                        {dayMeetings.map((m, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: m.color ?? '#16a34a' }} />
                            <span>{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* 이번 달 미팅 목록 */}
      {thisMonthCount > 0 ? (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--border-default)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            {month + 1}월 {listTitle}
          </p>
          {Object.entries(markedMap)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([day, mts]) =>
              mts.map((m, i) => (
                <div key={`${day}-${i}`} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color ?? '#16a34a' }} />
                  <span className="shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {month + 1}/{day}
                  </span>
                  <span className="truncate" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                </div>
              ))
            )}
        </div>
      ) : (
        <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid var(--border-default)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>이번 달 {listTitle} 없음</p>
        </div>
      )}
    </div>
  )
}
