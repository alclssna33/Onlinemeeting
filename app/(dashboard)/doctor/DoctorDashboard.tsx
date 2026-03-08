'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MeetingRequestModal from './MeetingRequestModal'
import DoctorMeetings from './DoctorMeetings'

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
}

type Meeting = {
  id: string
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  proposed_times: string[]
  confirmed_time: string | null
  meet_link: string | null
  note: string | null
  vendor_note: string | null
  created_at: string
  stage: { name: string; color: string }
  vendor: { company_name: string; rep_name: string | null }
}

type Props = {
  stages: Stage[]
  vendorsByStage: Record<number, Vendor[]>
  doctorId: string
  doctorName: string
  meetings: Meeting[]
}

export default function DoctorDashboard({ stages, vendorsByStage, doctorId, doctorName, meetings }: Props) {
  const [tab, setTab] = useState<'vendors' | 'meetings'>('vendors')
  const [selectedStage, setSelectedStage] = useState<Stage>(stages[0])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

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
      <div className="flex gap-2">
        <button onClick={() => setTab('vendors')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: tab === 'vendors' ? 'var(--brand-primary)' : 'var(--glass-bg)',
            color: tab === 'vendors' ? '#fff' : 'var(--text-primary)',
            border: `1px solid ${tab === 'vendors' ? 'var(--brand-primary)' : 'var(--border-default)'}`,
          }}>
          🏢 업체 찾기
        </button>
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
      </div>

      {/* 내 미팅 탭 */}
      {tab === 'meetings' && (
        <DoctorMeetings meetings={meetings} />
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
                  {vendors.map((vendor, i) => (
                    <motion.div
                      key={vendor.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass rounded-2xl p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow cursor-default"
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
                          style={{ background: selectedStage.color }} />
                      </div>

                      {vendor.description && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {vendor.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2"
                        style={{ borderTop: '1px solid var(--border-default)' }}>
                        {vendor.phone && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {vendor.phone}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="ml-auto text-sm font-semibold px-4 py-1.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                          style={{ background: selectedStage.color }}
                        >
                          미팅 신청
                        </button>
                      </div>
                    </motion.div>
                  ))}
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
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </div>
  )
}
