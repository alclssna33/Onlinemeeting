'use client'

import { useState, useEffect, useCallback } from 'react'

type Doctor = {
  id: string
  name: string
  email: string
  clinic_name: string | null
  auth_bidding: boolean
}

type BiddingVendor = {
  id: string
  company_name: string
  rep_name: string | null
  is_active: boolean
}

type Assignment = {
  id: string
  bidding_vendor_id: string
  bidding_round: 1 | 2 | 3
}

const ROUNDS: (1 | 2 | 3)[] = [1, 2, 3]
const ROUND_LABEL: Record<number, string> = { 1: '1차', 2: '2차', 3: '3차' }
const ROUND_COLOR: Record<number, string> = { 1: '#16a34a', 2: '#6366f1', 3: '#f59e0b' }

export default function DoctorBiddingAssigner() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [allVendors, setAllVendors] = useState<BiddingVendor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedRound, setSelectedRound] = useState<1 | 2 | 3>(1)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [drRes, bvRes] = await Promise.all([
      fetch('/api/admin/doctors'),
      fetch('/api/admin/bidding-vendors'),
    ])
    const drData = await drRes.json()
    const bvData = await bvRes.json()
    // auth_bidding 권한이 있는 원장만 표시
    setDoctors((Array.isArray(drData) ? drData : []).filter((d: Doctor) => d.auth_bidding))
    setAllVendors(Array.isArray(bvData) ? bvData : [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const loadAssignments = useCallback(async (doctorId: string) => {
    const res = await fetch(`/api/admin/doctor-bidding?doctorId=${doctorId}`)
    const data = await res.json()
    setAssignments(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    if (selectedDoctor) loadAssignments(selectedDoctor.id)
    else setAssignments([])
  }, [selectedDoctor, loadAssignments])

  // 현재 선택된 원장+회차에 배정된 vendor id 세트
  const assignedIds = new Set(
    assignments
      .filter(a => a.bidding_round === selectedRound)
      .map(a => a.bidding_vendor_id)
  )

  async function toggleAssign(vendorId: string, isAssigned: boolean) {
    if (!selectedDoctor) return
    setSaving(vendorId)
    if (isAssigned) {
      await fetch('/api/admin/doctor-bidding', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          biddingVendorId: vendorId,
          biddingRound: selectedRound,
        }),
      })
    } else {
      await fetch('/api/admin/doctor-bidding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          biddingVendorId: vendorId,
          biddingRound: selectedRound,
        }),
      })
    }
    await loadAssignments(selectedDoctor.id)
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 안내 배너 */}
      <div className="glass rounded-2xl px-5 py-4"
        style={{ borderLeft: '4px solid #6366f1' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          📐 원장별 비딩 업체 배정
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          비딩 권한(🏆)이 부여된 원장만 표시됩니다.
          원장을 선택하고 회차별로 참여할 업체를 체크하세요.
        </p>
      </div>

      <div className="flex gap-4 min-h-[500px]">
        {/* 좌측: 원장 목록 */}
        <div className="w-56 shrink-0 space-y-1">
          <p className="text-xs font-semibold px-2 mb-2" style={{ color: 'var(--text-muted)' }}>
            원장 선택 ({doctors.length}명)
          </p>
          {doctors.length === 0 ? (
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                비딩 권한을 가진 원장이 없습니다.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                [원장 관리] 탭에서 🏆 비딩 권한을 부여하세요.
              </p>
            </div>
          ) : doctors.map(doctor => (
            <button
              key={doctor.id}
              onClick={() => setSelectedDoctor(doctor)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: selectedDoctor?.id === doctor.id ? '#6366f1' : 'var(--glass-bg)',
                color: selectedDoctor?.id === doctor.id ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${selectedDoctor?.id === doctor.id ? '#6366f1' : 'var(--border-default)'}`,
              }}>
              <p className="font-semibold truncate">{doctor.name}</p>
              {doctor.clinic_name && (
                <p className="text-xs truncate mt-0.5"
                  style={{ color: selectedDoctor?.id === doctor.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                  {doctor.clinic_name}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* 우측: 배정 UI */}
        <div className="flex-1">
          {!selectedDoctor ? (
            <div className="glass rounded-2xl p-10 text-center h-full flex items-center justify-center">
              <p style={{ color: 'var(--text-muted)' }}>← 원장을 선택하세요</p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedDoctor.name} 원장님
                  </h2>
                  {selectedDoctor.clinic_name && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selectedDoctor.clinic_name}
                    </p>
                  )}
                </div>

                {/* 회차 탭 */}
                <div className="flex gap-1.5">
                  {ROUNDS.map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRound(r)}
                      className="px-4 py-1.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: selectedRound === r ? ROUND_COLOR[r] : 'var(--bg-muted)',
                        color: selectedRound === r ? '#fff' : 'var(--text-muted)',
                        border: `1px solid ${selectedRound === r ? ROUND_COLOR[r] : 'var(--border-default)'}`,
                      }}>
                      {ROUND_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {ROUND_LABEL[selectedRound]} 미팅에 참여할 업체를 선택하세요. ({assignedIds.size}개 배정됨)
              </p>

              {/* 업체 체크리스트 */}
              {allVendors.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  등록된 비딩 업체가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {allVendors.map(vendor => {
                    const isAssigned = assignedIds.has(vendor.id)
                    const isSaving = saving === vendor.id
                    return (
                      <button
                        key={vendor.id}
                        onClick={() => toggleAssign(vendor.id, isAssigned)}
                        disabled={isSaving || !vendor.is_active}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-90 disabled:opacity-40"
                        style={{
                          background: isAssigned
                            ? `${ROUND_COLOR[selectedRound]}18`
                            : 'var(--bg-muted)',
                          borderColor: isAssigned
                            ? `${ROUND_COLOR[selectedRound]}60`
                            : 'var(--border-default)',
                        }}>
                        {/* 체크박스 */}
                        <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                          style={{
                            background: isAssigned ? ROUND_COLOR[selectedRound] : 'transparent',
                            borderColor: isAssigned ? ROUND_COLOR[selectedRound] : 'var(--border-default)',
                          }}>
                          {isAssigned && <span className="text-white text-xs font-bold">✓</span>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {vendor.company_name}
                          </p>
                          {vendor.rep_name && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {vendor.rep_name}
                            </p>
                          )}
                        </div>

                        {isSaving && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>저장 중...</span>
                        )}
                        {!vendor.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: '#fee2e2', color: '#dc2626' }}>
                            비활성
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 회차별 배정 요약 */}
              {assignments.length > 0 && (
                <div className="pt-3 mt-3"
                  style={{ borderTop: '1px solid var(--border-default)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    전체 배정 요약
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {ROUNDS.map(r => {
                      const cnt = assignments.filter(a => a.bidding_round === r).length
                      return (
                        <span key={r} className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{
                            background: cnt > 0 ? `${ROUND_COLOR[r]}18` : 'var(--bg-muted)',
                            color: cnt > 0 ? ROUND_COLOR[r] : 'var(--text-muted)',
                          }}>
                          {ROUND_LABEL[r]}: {cnt}개
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
