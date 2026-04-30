'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEALERS, PROVINCE_LIST, getDealerKey, type ProvinceEntry } from '@/lib/samsung-medison-dealers'
import MeetingRequestModal from './MeetingRequestModal'

type Vendor = {
  id: string
  company_name: string
  rep_name: string | null
  email: string | null
  phone: string | null
  profile_id: string | null
}

type Meeting = {
  id: string
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  vendor_id: string
  selection_status: 'selected' | 'eliminated' | null
}

type Stage = { id: number; name: string; color: string }

type Props = {
  stage: Stage
  vendors: Vendor[]
  doctorId: string
  meetingType: 'standard' | 'express'
  vendorMeetingMap: Record<string, Meeting>
  onSelect: (meetingId: string) => void
}

function hasDistricts(p: ProvinceEntry): p is { name: string; districts: { name: string; dealer: string | null }[] } {
  return 'districts' in p
}
function isDirect(p: ProvinceEntry): p is { name: string; dealer: string } {
  return 'dealer' in p && p.dealer !== null && !('districts' in p)
}
function isUnavailable(p: ProvinceEntry): p is { name: string; dealer: null } {
  return 'dealer' in p && p.dealer === null && !('districts' in p)
}

export default function SamsungMedisonSection({ stage, vendors, doctorId, meetingType, vendorMeetingMap, onSelect }: Props) {
  const [productName, setProductName] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [modalVendor, setModalVendor] = useState<Vendor | null>(null)

  const province = PROVINCE_LIST.find(p => p.name === selectedProvince) ?? null

  // 선택된 지역에 해당하는 dealer key 계산
  const dealerKey = selectedProvince
    ? getDealerKey(selectedProvince, selectedDistrict || undefined)
    : null

  const dealer = dealerKey ? DEALERS[dealerKey] : null

  // DB에서 이 대리점 벤더 레코드 찾기 (email 기준)
  const vendorRecord = dealer
    ? vendors.find(v => v.email === dealer.email)
    : null

  // 현재 미팅 상태 (vendorRecord가 있을 때)
  const currentMeeting = vendorRecord ? vendorMeetingMap[vendorRecord.id] : undefined

  function handleRequestMeeting() {
    if (!vendorRecord) return
    setModalVendor(vendorRecord)
  }

  const provinceEntry = province

  // 가나다순 정렬
  const sortedProvinces = [...PROVINCE_LIST].sort((a, b) =>
    a.name.localeCompare(b.name, 'ko-KR')
  )
  const sortedDistricts = provinceEntry && hasDistricts(provinceEntry)
    ? [...provinceEntry.districts].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
    : []

  return (
    <div className="flex flex-col gap-5">
      {/* 섹션 설명 */}
      <div className="glass rounded-2xl p-5 flex gap-4 items-start"
        style={{ border: '1px solid rgba(29,78,216,0.25)' }}>
        <div className="text-3xl shrink-0">📡</div>
        <div>
          <h2 className="font-bold text-base" style={{ color: '#1d4ed8' }}>
            삼성메디슨 초음파 대리점 미팅
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            개원 지역에 따라 담당 대리점이 다릅니다. 원하시는 장비명과 개원 지역을 선택하면
            해당 지역 담당 대리점으로 미팅 요청이 전달됩니다.
          </p>
        </div>
      </div>

      {/* 입력 카드 */}
      <div className="glass rounded-2xl p-6 flex flex-col gap-5">

        {/* 장비명 입력 */}
        <div>
          <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-primary)' }}>
            원하시는 장비명
          </label>
          <input
            type="text"
            placeholder="예: HERA W10, RS85A, HS50A 등 (모르시면 상담 요청으로 입력)"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{
              background: 'var(--bg-muted)',
              borderColor: productName ? '#1d4ed8' : 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* 시도 선택 */}
        <div>
          <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-primary)' }}>
            개원 지역 선택 — 시/도
          </label>
          <select
            value={selectedProvince}
            onChange={e => { setSelectedProvince(e.target.value); setSelectedDistrict('') }}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{
              background: 'var(--bg-muted)',
              borderColor: selectedProvince ? '#1d4ed8' : 'var(--border-default)',
              color: selectedProvince ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <option value="">시/도 선택</option>
            {sortedProvinces.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 구/시 선택 (시/도가 다중 대리점 지역일 때만) */}
        <AnimatePresence>
          {provinceEntry && hasDistricts(provinceEntry) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-primary)' }}>
                구/시/군 선택
              </label>
              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{
                  background: 'var(--bg-muted)',
                  borderColor: selectedDistrict ? '#1d4ed8' : 'var(--border-default)',
                  color: selectedDistrict ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <option value="">구/시/군 선택</option>
                {sortedDistricts.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 결과 카드 */}
      <AnimatePresence mode="wait">
        {/* 담당 대리점 없음 */}
        {selectedProvince && !dealer && (
          (provinceEntry && isUnavailable(provinceEntry)) ||
          (provinceEntry && hasDistricts(provinceEntry) && selectedDistrict && !dealerKey)
        ) && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-2xl p-6 text-center"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <div className="text-3xl mb-2">📭</div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              해당 지역 담당 대리점이 없습니다
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              가까운 지역 대리점으로 문의하시거나 관리자에게 연락해 주세요.
            </p>
          </motion.div>
        )}

        {/* 대리점 매칭 완료 */}
        {dealer && (provinceEntry && (isDirect(provinceEntry) || (hasDistricts(provinceEntry) && selectedDistrict && dealerKey))) && (
          <motion.div
            key={dealer.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-2xl p-6 flex flex-col gap-4"
            style={{ border: '1px solid rgba(29,78,216,0.3)' }}
          >
            {/* 대리점 헤더 */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(29,78,216,0.1)', color: '#1d4ed8' }}>
                    삼성메디슨 공식 대리점
                  </span>
                </div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {dealer.company}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {dealer.rep}
                </p>
              </div>
              <div className="w-3 h-3 rounded-full mt-1 shrink-0"
                style={{ background: vendorRecord ? '#1d4ed8' : '#9ca3af' }} />
            </div>

            {/* 연락처 */}
            <div className="flex gap-4 flex-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
              {dealer.phone && (
                <span>📞 {dealer.phone}</span>
              )}
              <span>✉️ {dealer.email}</span>
            </div>

            {/* 장비명 요약 */}
            {productName && (
              <div className="px-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(29,78,216,0.07)', color: '#1d4ed8' }}>
                요청 장비: <strong>{productName}</strong>
              </div>
            )}

            {/* 미팅 신청 버튼 / 상태 표시 */}
            <div className="pt-1" style={{ borderTop: '1px solid var(--border-default)' }}>
              {!vendorRecord ? (
                <div className="text-sm text-center py-1" style={{ color: 'var(--text-muted)' }}>
                  ⏳ 대리점 시스템 등록 준비 중입니다. 담당자에게 직접 연락해 주세요.
                </div>
              ) : !vendorRecord.profile_id ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    계정 연결 준비 중
                  </span>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                    신청불가
                  </span>
                </div>
              ) : (() => {
                const m = currentMeeting
                if (!m) return (
                  <button
                    onClick={handleRequestMeeting}
                    disabled={!productName.trim()}
                    className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#1d4ed8' }}
                  >
                    {!productName.trim() ? '장비명을 먼저 입력해주세요' : '미팅 신청하기'}
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
                  <div className="flex items-center gap-2">
                    <button onClick={() => onSelect(m.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl"
                      style={{ background: '#6366f1', color: '#fff' }}>
                      선정
                    </button>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                      확정
                    </span>
                  </div>
                )
                if (m.status === 'pending') return (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl animate-pulse"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid #fde68a' }}>
                    진행중
                  </span>
                )
                if (m.status === 'rejected') return (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ background: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                      거절
                    </span>
                    <button
                      onClick={handleRequestMeeting}
                      disabled={!productName.trim()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white disabled:opacity-40"
                      style={{ background: '#1d4ed8' }}>
                      재신청
                    </button>
                  </div>
                )
                return null
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 미팅 신청 모달 */}
      {modalVendor && (
        <MeetingRequestModal
          vendor={modalVendor}
          stage={stage}
          doctorId={doctorId}
          meetingType={meetingType}
          productName={productName.trim()}
          onClose={() => setModalVendor(null)}
        />
      )}
    </div>
  )
}
