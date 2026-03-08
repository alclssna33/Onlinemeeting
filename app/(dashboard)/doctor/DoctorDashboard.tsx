'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MeetingRequestModal from './MeetingRequestModal'

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

type Props = {
  stages: Stage[]
  vendorsByStage: Record<number, Vendor[]>
  doctorId: string
  doctorName: string
}

export default function DoctorDashboard({ stages, vendorsByStage, doctorId, doctorName }: Props) {
  const [selectedStage, setSelectedStage] = useState<Stage>(stages[0])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  const vendors = vendorsByStage[selectedStage?.id] ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* 상단 헤더 */}
      <div className="glass rounded-2xl px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            개비공 — 온라인 미팅 시스템
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            안녕하세요, <span className="font-semibold">{doctorName}</span>님
          </p>
        </div>
        <div className="text-sm px-3 py-1.5 rounded-full font-medium"
          style={{ background: 'var(--brand-primary)', color: '#fff' }}>
          원장님
        </div>
      </div>

      {/* 메인 2단 레이아웃 */}
      <div className="flex gap-4 min-h-[600px]">

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
      </div>

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
