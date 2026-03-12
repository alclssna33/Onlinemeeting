'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MeetingRequestModal from './MeetingRequestModal'
import DoctorMeetings from './DoctorMeetings'
import DoctorBiddingBoard from './bidding/DoctorBiddingBoard'
import Toast, { ToastItem } from '@/app/components/Toast'
import { createClient } from '@/lib/supabase/client'

type Stage = {
  id: number
  name: string
  color: string
  icon: string
}

type Vendor = {
  id: string
  company_name: string
  rep_name: string | null
  description: string | null
  website: string | null
  category_id: number
  email: string | null
  phone: string | null
  profile_id: string | null
}

type Meeting = {
  id: string
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  vendor_id: string
  stage_id: number
  selection_status: 'selected' | 'eliminated' | null
  meeting_type: 'standard' | 'express' | null
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

type Props = {
  stages: Stage[]
  vendorsByStage: Record<number, Vendor[]>
  doctorId: string
  doctorName: string
  meetings: Meeting[]
  authExpress: boolean
  authBidding: boolean
}

export default function DoctorDashboard({ stages, vendorsByStage, doctorId, doctorName, meetings: initialMeetings, authExpress, authBidding }: Props) {
  const [tab, setTab] = useState<'vendors' | 'meetings' | 'bidding' | 'express'>(authExpress ? 'express' : 'vendors')
  const [selectedStage, setSelectedStage] = useState<Stage>(stages[0])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Supabase Realtime — 내 미팅 상태 변경 감지
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('doctor-meetings-' + doctorId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_requests',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload: any) => {
          const updated = payload.new
          if (!updated) return

          // 로컬 상태 업데이트
          setMeetings(prev => prev.map(m =>
            m.id === updated.id
              ? { ...m, status: updated.status, confirmed_time: updated.confirmed_time, meet_link: updated.meet_link, vendor_note: updated.vendor_note, updated_at: updated.updated_at, selection_status: updated.selection_status }
              : (m as any).doctor_id === updated.doctor_id && (m as any).stage_id === updated.stage_id && updated.selection_status === 'eliminated' && m.id !== updated.id
              ? { ...m, selection_status: 'eliminated' }
              : m
          ))

          // 확정 or 거절 시 토스트 표시
          if (updated.status === 'confirmed' || updated.status === 'rejected') {
            setMeetings(prev => {
              const target = prev.find(m => m.id === updated.id)
              if (target) {
                setToasts(t => [...t, {
                  id: updated.id + '-' + Date.now(),
                  type: updated.status,
                  vendorName: target.vendor?.company_name ?? '업체',
                  stageName: target.stage?.name ?? '',
                }])
              }
              return prev
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [doctorId])

  // vendor_id → 가장 최근 미팅 맵
  const vendorMeetingMap = useMemo(() => {
    const map: Record<string, Meeting> = {}
    for (const m of [...meetings].reverse()) { // 최신순(내림차순) → 마지막 assign이 최신
      map[m.vendor_id] = m
    }
    return map
  }, [meetings])

  async function handleSelect(meetingId: string) {
    if (!confirm('이 업체를 최종 선정하시겠습니까? 같은 단계의 다른 업체들은 탈락 처리됩니다.')) return
    const res = await fetch('/api/meetings/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: meetingId }),
    })
    if (!res.ok) {
      const d = await res.json()
      alert('오류: ' + d.error)
      return
    }
    // 로컬 상태 즉시 반영
    setMeetings(prev => {
      const target = prev.find(m => m.id === meetingId)
      if (!target) return prev
      return prev.map(m => {
        if (m.id === meetingId) return { ...m, selection_status: 'selected' }
        if (m.stage_id === target.stage_id && m.status !== 'rejected' && m.status !== 'cancelled') {
          return { ...m, selection_status: 'eliminated' }
        }
        return m
      })
    })
  }

  const pendingCount = meetings.filter(m => m.status === 'pending').length
  const confirmedCount = meetings.filter(m => m.status === 'confirmed').length

  const vendors = vendorsByStage[selectedStage?.id] ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* 상단 헤더 */}
      <div className="glass rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            개비공 — 온라인 미팅 시스템
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            안녕하세요,{' '}
            <span className="font-semibold">
              {doctorName && doctorName !== '__pending__' ? doctorName : '?'}
            </span>
            {' '}원장님
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(!doctorName || doctorName === '__pending__') && (
            <a href="/setup"
              className="text-xs px-3 py-1.5 rounded-xl font-semibold animate-pulse"
              style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
              닉네임 설정 필요
            </a>
          )}
          <a href="/setup"
            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            ✏️ 닉네임 변경
          </a>
          <div className="text-sm px-3 py-1.5 rounded-full font-medium"
            style={{ background: 'var(--brand-primary)', color: '#fff' }}>
            원장님
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('vendors')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: tab === 'vendors' ? 'var(--brand-primary)' : 'var(--glass-bg)',
            color: tab === 'vendors' ? '#fff' : 'var(--text-primary)',
            border: `1px solid ${tab === 'vendors' ? 'var(--brand-primary)' : 'var(--border-default)'}`,
          }}>
          🏢 업체 찾기
        </button>
        {!authExpress && (
          <button onClick={() => setTab('meetings')}
            className="relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === 'meetings' ? 'var(--brand-primary)' : 'var(--glass-bg)',
              color: tab === 'meetings' ? '#fff' : 'var(--text-primary)',
              border: `1px solid ${tab === 'meetings' ? 'var(--brand-primary)' : 'var(--border-default)'}`,
            }}>
            📅 내 미팅
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: '#f59e0b', color: '#fff' }}>
                {pendingCount}
              </span>
            )}
            {confirmedCount > 0 && pendingCount === 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: '#16a34a', color: '#fff' }}>
                {confirmedCount}
              </span>
            )}
          </button>
        )}
        {authBidding && (
          <button onClick={() => setTab('bidding')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === 'bidding' ? '#d97706' : 'var(--glass-bg)',
              color: tab === 'bidding' ? '#fff' : '#d97706',
              border: `1px solid ${tab === 'bidding' ? '#d97706' : 'rgba(245,158,11,0.4)'}`,
            }}>
            🏆 비딩
          </button>
        )}
        {authExpress && (
          <button onClick={() => setTab('express')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === 'express' ? '#6366f1' : 'var(--glass-bg)',
              color: tab === 'express' ? '#fff' : '#6366f1',
              border: `1px solid ${tab === 'express' ? '#6366f1' : 'rgba(99,102,241,0.4)'}`,
            }}>
            ⚡ 일사천리
          </button>
        )}
      </div>

      {/* 내 미팅 탭 */}
      {tab === 'meetings' && (
        <DoctorMeetings meetings={meetings} />
      )}

      {/* 비딩 탭 */}
      {tab === 'bidding' && (
        <DoctorBiddingBoard doctorId={doctorId} doctorName={doctorName} />
      )}

      {/* 일사천리 탭 */}
      {tab === 'express' && (
        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl px-6 py-4 flex items-center gap-3"
            style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="font-bold text-base" style={{ color: '#6366f1' }}>일사천리 미팅</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                일사천리 모드로 신청된 미팅 목록입니다. 업체 찾기에서 미팅 신청 시 일사천리 방식으로 처리됩니다.
              </p>
            </div>
          </div>
          <DoctorMeetings meetings={meetings.filter(m => m.meeting_type === 'express')} />
        </div>
      )}

      {/* 메인 2단 레이아웃 */}
      {tab === 'vendors' && <div className="flex gap-4 min-h-[600px]">

        {/* 좌측: 개원 단계 카테고리 */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          <p className="text-xs font-semibold px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
            개원 단계
          </p>
          {stages.map(stage => {
            const isActive = selectedStage?.id === stage.id
            const count = (vendorsByStage[stage.id] ?? []).length
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between gap-2"
                style={{
                  background: isActive ? stage.color : 'var(--glass-bg)',
                  color: isActive ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${isActive ? stage.color : 'var(--border-default)'}`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: isActive ? `0 4px 16px ${stage.color}40` : 'none',
                }}
              >
                <span className="truncate">{stage.name}</span>
                {count > 0 && (
                  <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-default)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                    }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 우측: 선택된 단계의 벤더사 목록 */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStage?.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {/* 단계 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: selectedStage?.color }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedStage?.name}
                </h2>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  제휴 업체 {vendors.length}곳
                </span>
              </div>

              {/* 벤더사 카드 그리드 */}
              {vendors.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center"
                  style={{ color: 'var(--text-muted)' }}>
                  이 단계에 등록된 제휴업체가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vendors.map((vendor, i) => {
                    const isLinked = !!vendor.profile_id
                    return (
                    <motion.div
                      key={vendor.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass rounded-2xl p-5 flex flex-col gap-3 transition-shadow cursor-default"
                      style={{
                        opacity: isLinked ? 1 : 0.5,
                        filter: isLinked ? 'none' : 'grayscale(0.6)',
                        boxShadow: isLinked ? undefined : 'none',
                      }}
                    >
                      {/* 업체 정보 */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                            {vendor.company_name}
                          </h3>
                          {vendor.rep_name && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              담당: {vendor.rep_name}
                            </p>
                          )}
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                          style={{ background: isLinked ? selectedStage.color : '#9ca3af' }} />
                      </div>

                      {vendor.description && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {vendor.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 gap-2 flex-wrap"
                        style={{ borderTop: '1px solid var(--border-default)' }}>
                        {vendor.phone && (
                          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {vendor.phone}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                          {!isLinked ? (
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                              style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                              신청불가
                            </span>
                          ) : (() => {
                            const m = vendorMeetingMap[vendor.id]
                            if (!m) return (
                              <button onClick={() => setSelectedVendor(vendor)}
                                className="text-sm font-semibold px-4 py-1.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                                style={{ background: selectedStage.color }}>
                                미팅 신청
                              </button>
                            )
                            if (m.selection_status === 'selected') return (
                              <span className="text-xs font-bold px-3 py-1.5 rounded-xl"
                                style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                ✅ 선정됨
                              </span>
                            )
                            if (m.selection_status === 'eliminated') return (
                              <span className="text-xs font-bold px-3 py-1.5 rounded-xl"
                                style={{ background: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                                탈락
                              </span>
                            )
                            if (m.status === 'confirmed') return (
                              <>
                                <button onClick={() => handleSelect(m.id)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:opacity-80 active:scale-95"
                                  style={{ background: '#6366f1', color: '#fff' }}>
                                  선정
                                </button>
                                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                                  style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                  확정
                                </span>
                              </>
                            )
                            if (m.status === 'pending') return (
                              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl animate-pulse"
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid #fde68a' }}>
                                진행중
                              </span>
                            )
                            if (m.status === 'rejected') return (
                              <>
                                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                                  style={{ background: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                                  거절
                                </span>
                                <button onClick={() => setSelectedVendor(vendor)}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all hover:opacity-90"
                                  style={{ background: selectedStage.color }}>
                                  재신청
                                </button>
                              </>
                            )
                            return null
                          })()}
                        </div>
                      </div>
                    </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>}

      {/* 미팅 신청 모달 */}
      {selectedVendor && (
        <MeetingRequestModal
          vendor={selectedVendor}
          stage={selectedStage}
          doctorId={doctorId}
          meetingType={authExpress ? 'express' : 'standard'}
          onClose={() => setSelectedVendor(null)}
        />
      )}

      {/* 실시간 알림 토스트 */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
