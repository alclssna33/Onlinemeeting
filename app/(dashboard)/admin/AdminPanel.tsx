'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MeetingMonitor from './MeetingMonitor'
import BiddingVendorManager from './BiddingVendorManager'
import DoctorBiddingAssigner from './DoctorBiddingAssigner'
import BiddingMeetingMonitor from './BiddingMeetingMonitor'

type Stage = { id: number; name: string; color: string; order_index: number; description: string | null; stage_type: string | null }
type LinkedProfile = { name: string; email: string } | null
type Vendor = {
  id: string
  company_name: string
  rep_name: string | null
  email: string | null
  phone: string | null
  category_id: number
  description: string | null
  website: string | null
  is_active: boolean
  profile_id: string | null
  region: string | null
  linked_profile: LinkedProfile
}

const COLORS = ['#06b6d4','#f59e0b','#22c55e','#a855f7','#ec4899','#ef4444','#14b8a6','#8b5cf6','#6366f1','#0ea5e9','#78716c','#f97316','#16a34a','#dc2626']

const VENDOR_JOIN_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/join/vendor`
  : '/join/vendor'

type DoctorItem = {
  id: string
  name: string
  email: string
  phone: string | null
  clinic_name: string | null
  specialty: string | null
  auth_express: boolean
  auth_bidding: boolean
  created_at: string
}

export default function AdminPanel() {
  const [tab, setTab] = useState<'stages' | 'vendors' | 'doctors' | 'bidding_vendors' | 'bidding_assign' | 'meetings' | 'express_meetings' | 'bidding_meetings'>('stages')
  const [stages, setStages] = useState<Stage[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [loading, setLoading] = useState(false)

  // 단계 편집 상태
  const [editingStage, setEditingStage] = useState<Partial<Stage> | null>(null)
  const [showStageForm, setShowStageForm] = useState(false)

  // 벤더사 편집 상태
  const [editingVendor, setEditingVendor] = useState<Partial<Vendor> | null>(null)
  const [showVendorForm, setShowVendorForm] = useState(false)

  // 계정 연결 모달 상태
  const [linkingVendor, setLinkingVendor] = useState<Vendor | null>(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [doctors, setDoctors] = useState<DoctorItem[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [togglingDoctor, setTogglingDoctor] = useState<string | null>(null)
  const [doctorSearch, setDoctorSearch] = useState('')
  const [availableProfiles, setAvailableProfiles] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [calendarEnabled, setCalendarEnabled] = useState<boolean | null>(null)
  const [calendarToggling, setCalendarToggling] = useState(false)
  const [calendarTestResult, setCalendarTestResult] = useState<{ ok: boolean; steps: { step: string; status: 'ok' | 'fail'; detail?: string }[] } | null>(null)
  const [calendarTesting, setCalendarTesting] = useState(false)

  const loadStages = useCallback(async () => {
    const res = await fetch('/api/admin/stages')
    setStages(await res.json())
  }, [])

  const loadVendors = useCallback(async (categoryId?: number) => {
    const url = categoryId ? `/api/admin/vendors?category_id=${categoryId}` : '/api/admin/vendors'
    const res = await fetch(url)
    const data = await res.json()
    setVendors(Array.isArray(data) ? data : [])
  }, [])

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true)
    const res = await fetch('/api/admin/doctors')
    const data = await res.json()
    setDoctors(Array.isArray(data) ? data : [])
    setDoctorsLoading(false)
  }, [])

  async function toggleDoctorAuth(doctorId: string, field: 'auth_express' | 'auth_bidding', current: boolean) {
    setTogglingDoctor(doctorId + field)
    await fetch('/api/admin/doctors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, field, value: !current }),
    })
    setDoctors(prev => prev.map(d =>
      d.id === doctorId ? { ...d, [field]: !current } : d
    ))
    setTogglingDoctor(null)
  }

  useEffect(() => { loadStages() }, [loadStages])
  useEffect(() => {
    if (tab === 'vendors') loadVendors(selectedStage?.id)
    if (tab === 'doctors') loadDoctors()
  }, [tab, selectedStage, loadVendors, loadDoctors])

  // 앱 설정 로드
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setCalendarEnabled(d.calendar_enabled !== 'false'))
      .catch(() => setCalendarEnabled(true))
  }, [])

  async function testCalendar() {
    setCalendarTesting(true)
    setCalendarTestResult(null)
    const res = await fetch('/api/admin/test-calendar')
    const data = await res.json()
    setCalendarTestResult(data)
    setCalendarTesting(false)
  }

  async function toggleCalendar() {
    if (calendarEnabled === null) return
    setCalendarToggling(true)
    const next = !calendarEnabled
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'calendar_enabled', value: String(next) }),
    })
    setCalendarEnabled(next)
    setCalendarToggling(false)
  }

  // ── 단계 저장 ──
  async function saveStage() {
    if (!editingStage?.name) return
    setLoading(true)
    const method = editingStage.id ? 'PATCH' : 'POST'
    await fetch('/api/admin/stages', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingStage),
    })
    await loadStages()
    setShowStageForm(false)
    setEditingStage(null)
    setLoading(false)
  }

  // ── 단계 삭제 ──
  async function deleteStage(id: number) {
    if (!confirm('이 단계를 삭제하면 해당 단계의 벤더사도 영향을 받습니다. 삭제하시겠습니까?')) return
    await fetch('/api/admin/stages', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadStages()
    if (selectedStage?.id === id) setSelectedStage(null)
  }

  // ── 벤더사 저장 ──
  async function saveVendor() {
    if (!editingVendor?.company_name || !editingVendor?.category_id) return
    setLoading(true)
    const method = editingVendor.id ? 'PATCH' : 'POST'
    const res = await fetch('/api/admin/vendors', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingVendor),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`저장 실패: ${err.error ?? res.status}`)
      setLoading(false)
      return
    }
    await loadVendors(selectedStage?.id)
    setShowVendorForm(false)
    setEditingVendor(null)
    setLoading(false)
  }

  // ── 벤더사 삭제 ──
  async function deleteVendor(id: string) {
    if (!confirm('이 업체를 삭제하시겠습니까?\n관련된 미팅 요청 내역도 함께 삭제됩니다.')) return
    const res = await fetch('/api/admin/vendors', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`삭제 실패: ${err.error ?? res.status}`)
      return
    }
    await loadVendors(selectedStage?.id)
  }

  // ── 연결 가능한 프로필 목록 로드 ──
  async function loadAvailableProfiles() {
    setProfilesLoading(true)
    const res = await fetch('/api/admin/profiles')
    const data = await res.json()
    setAvailableProfiles(Array.isArray(data) ? data : [])
    setProfilesLoading(false)
  }

  // ── 계정 연결 ──
  async function handleLink() {
    if (!linkingVendor || !linkEmail.trim()) return
    setLinkLoading(true)
    setLinkError(null)
    const res = await fetch('/api/admin/vendors/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId: linkingVendor.id, userEmail: linkEmail.trim() }),
    })
    const result = await res.json()
    setLinkLoading(false)
    if (!res.ok) {
      setLinkError(result.error)
      return
    }
    setLinkingVendor(null)
    setLinkEmail('')
    await loadVendors(selectedStage?.id)
  }

  // ── 계정 연결 해제 ──
  async function handleUnlink(vendorId: string) {
    if (!confirm('계정 연결을 해제하시겠습니까? 해당 유저의 역할이 doctor로 변경됩니다.')) return
    await fetch('/api/admin/vendors/link', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId }),
    })
    await loadVendors(selectedStage?.id)
  }

  // ── 가입 URL 복사 ──
  function copyJoinUrl() {
    const url = `${window.location.origin}/join/vendor`
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="glass rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>관리자 패널</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>개원 단계 및 제휴업체 관리</p>
        </div>
        <div className="flex items-center gap-4">
          {/* 구글 캘린더 연동 토글 */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                📅 구글 캘린더 연동
              </p>
              <p className="text-xs" style={{ color: calendarEnabled ? '#16a34a' : 'var(--text-muted)' }}>
                {calendarEnabled === null ? '...' : calendarEnabled ? '활성화됨' : '비활성화됨'}
              </p>
            </div>
            <button
              onClick={toggleCalendar}
              disabled={calendarToggling || calendarEnabled === null}
              className="relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-50"
              style={{ background: calendarEnabled ? '#16a34a' : '#d1d5db' }}>
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                style={{ transform: calendarEnabled ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </button>
            <button
              onClick={testCalendar}
              disabled={calendarTesting}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
              {calendarTesting ? '진단 중...' : '🔍 진단'}
            </button>
          </div>
          <div className="text-sm px-3 py-1.5 rounded-full font-medium text-white" style={{ background: '#6366f1' }}>
            관리자
          </div>
        </div>
      </div>

      {/* 캘린더 진단 결과 */}
      {calendarTestResult && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: calendarTestResult.ok ? '#16a34a' : '#dc2626' }}>
              {calendarTestResult.ok ? '✅ 캘린더 연동 정상' : '❌ 캘린더 연동 오류'}
            </p>
            <button onClick={() => setCalendarTestResult(null)}
              className="text-xs" style={{ color: 'var(--text-muted)' }}>닫기</button>
          </div>
          {calendarTestResult.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg"
              style={{ background: s.status === 'ok' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)' }}>
              <span>{s.status === 'ok' ? '✅' : '❌'}</span>
              <div>
                <p className="font-semibold" style={{ color: s.status === 'ok' ? '#16a34a' : '#dc2626' }}>
                  {s.step}
                </p>
                {s.detail && (
                  <p className="mt-0.5 break-all" style={{ color: 'var(--text-secondary)' }}>{s.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 탭 — 설정 그룹 / 현황 그룹 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>설정</p>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'stages',          label: '🗂 개원 단계' },
            { key: 'vendors',         label: '🏢 일반 업체' },
            { key: 'doctors',         label: '👨‍⚕️ 원장 관리' },
            { key: 'bidding_vendors', label: '🏆 비딩 업체' },
            { key: 'bidding_assign',  label: '📐 비딩 배정' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t.key ? 'var(--brand-primary)' : 'var(--glass-bg)',
                color: tab === t.key ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${tab === t.key ? 'var(--brand-primary)' : 'var(--border-default)'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold px-1 pt-1" style={{ color: 'var(--text-muted)' }}>미팅 현황</p>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'meetings',         label: '📋 일반 미팅',  color: '#6366f1' },
            { key: 'express_meetings', label: '⚡ 일사천리',    color: '#6366f1' },
            { key: 'bidding_meetings', label: '🏆 비딩 현황',  color: '#f59e0b' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t.key ? t.color : 'var(--glass-bg)',
                color: tab === t.key ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${tab === t.key ? t.color : 'var(--border-default)'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 단계 관리 탭 ── */}
      {tab === 'stages' && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>개원 단계 목록 ({stages.length})</h2>
            <button onClick={() => { setEditingStage({ color: '#16a34a', order_index: stages.length + 1 }); setShowStageForm(true) }}
              className="text-sm px-4 py-2 rounded-xl text-white font-semibold"
              style={{ background: 'var(--brand-primary)' }}>
              + 단계 추가
            </button>
          </div>
          <div className="space-y-2">
            {stages.map(stage => (
              <div key={stage.id} className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-muted)' }}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: stage.color }} />
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{stage.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>순서 {stage.order_index}</span>
                <button onClick={() => { setEditingStage(stage); setShowStageForm(true) }}
                  className="text-xs px-3 py-1 rounded-lg border transition-all hover:opacity-80"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  수정
                </button>
                <button onClick={() => deleteStage(stage.id)}
                  className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                  style={{ background: '#fee2e2', color: '#dc2626' }}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 벤더사 관리 탭 ── */}
      {tab === 'vendors' && (
        <div className="space-y-3">
          {/* 제휴업체 가입 링크 안내 */}
          <div className="glass rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                🔗 제휴업체 전용 가입 링크
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                이 링크를 업체 담당자에게 공유하세요. 가입 후 아래에서 계정을 연결해주세요.
              </p>
            </div>
            <button
              onClick={copyJoinUrl}
              className="shrink-0 text-sm px-4 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: copiedUrl ? '#16a34a' : 'var(--bg-muted)',
                color: copiedUrl ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}>
              {copiedUrl ? '✅ 복사됨!' : '링크 복사'}
            </button>
          </div>

          <div className="flex gap-4">
            {/* 좌측: 단계 선택 */}
            <div className="w-48 shrink-0 space-y-1">
              <p className="text-xs font-semibold px-2 mb-2" style={{ color: 'var(--text-muted)' }}>단계 선택</p>
              <button onClick={() => setSelectedStage(null)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: !selectedStage ? 'var(--brand-primary)' : 'var(--glass-bg)',
                  color: !selectedStage ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${!selectedStage ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                }}>
                전체 보기
              </button>
              {stages.map(stage => (
                <button key={stage.id} onClick={() => setSelectedStage(stage)}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all truncate"
                  style={{
                    background: selectedStage?.id === stage.id ? stage.color : 'var(--glass-bg)',
                    color: selectedStage?.id === stage.id ? '#fff' : 'var(--text-primary)',
                    border: `1px solid ${selectedStage?.id === stage.id ? stage.color : 'var(--border-default)'}`,
                  }}>
                  {stage.name}
                </button>
              ))}
            </div>

            {/* 우측: 벤더사 목록 */}
            <div className="flex-1 glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedStage ? `${selectedStage.name} 업체` : '전체 업체'} ({vendors.length})
                </h2>
                <button onClick={() => {
                  setEditingVendor({ category_id: selectedStage?.id, is_active: true })
                  setShowVendorForm(true)
                }}
                  className="text-sm px-4 py-2 rounded-xl text-white font-semibold"
                  style={{ background: selectedStage?.color ?? 'var(--brand-primary)' }}>
                  + 업체 추가
                </button>
              </div>

              {/* 연결 현황 요약 */}
              {vendors.length > 0 && (
                <div className="flex gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
                    ✅ 연결됨 {vendors.filter(v => v.linked_profile).length}
                  </span>
                  <span className="px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                    🔗 미연결 {vendors.filter(v => !v.linked_profile).length}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {vendors.map(vendor => (
                  <div key={vendor.id} className="rounded-xl border overflow-hidden"
                    style={{
                      borderColor: vendor.linked_profile ? '#16a34a' : '#f59e0b',
                      borderLeftWidth: '3px',
                      background: vendor.linked_profile
                        ? 'rgba(22,163,74,0.04)'
                        : 'rgba(245,158,11,0.04)',
                    }}>
                    <div className="flex items-center gap-3 p-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {vendor.company_name}
                          </p>
                          {vendor.linked_profile ? (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
                              style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>
                              연결됨
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                              미연결
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {vendor.rep_name && `${vendor.rep_name} · `}{vendor.email ?? '이메일 없음'}
                        </p>
                      </div>

                      {/* 계정 연결 상태 */}
                      {vendor.linked_profile ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                              {vendor.linked_profile.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {vendor.linked_profile.email}
                            </p>
                          </div>
                          <button onClick={() => handleUnlink(vendor.id)}
                            className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                            style={{ background: '#fee2e2', color: '#dc2626' }}>
                            해제
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setLinkingVendor(vendor); setLinkEmail(''); setLinkError(null); loadAvailableProfiles() }}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.4)' }}>
                          🔗 계정 연결
                        </button>
                      )}

                      <button onClick={() => { setEditingVendor(vendor); setShowVendorForm(true) }}
                        className="text-xs px-3 py-1 rounded-lg border shrink-0"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                        수정
                      </button>
                      <button onClick={() => deleteVendor(vendor.id)}
                        className="text-xs px-3 py-1 rounded-lg shrink-0"
                        style={{ background: '#fee2e2', color: '#dc2626' }}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                {vendors.length === 0 && (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                    등록된 업체가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 원장 관리 탭 ── */}
      {tab === 'doctors' && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
              원장 목록 ({doctors.length})
            </h2>
            <button onClick={loadDoctors}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              새로고침
            </button>
          </div>

          <input
            type="text"
            placeholder="이름, 이메일, 병원명으로 검색..."
            value={doctorSearch}
            onChange={e => setDoctorSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          />

          {doctorsLoading ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
          ) : doctors.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>가입한 원장이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {doctors.filter(d => {
                const q = doctorSearch.trim().toLowerCase()
                if (!q) return true
                return (
                  d.name.toLowerCase().includes(q) ||
                  d.email.toLowerCase().includes(q) ||
                  (d.clinic_name ?? '').toLowerCase().includes(q)
                )
              }).map(doctor => (
                <div key={doctor.id} className="rounded-xl border p-4 flex items-center gap-4 flex-wrap"
                  style={{ borderColor: 'var(--border-default)', background: 'var(--bg-muted)' }}>
                  {/* 원장 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {doctor.name}
                      {doctor.clinic_name && (
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                          {doctor.clinic_name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {doctor.email}{doctor.specialty ? ` · ${doctor.specialty}` : ''}
                    </p>
                  </div>

                  {/* 일사천리 토글 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold" style={{ color: doctor.auth_express ? '#6366f1' : 'var(--text-muted)' }}>
                      ⚡ 일사천리
                    </span>
                    <button
                      onClick={() => toggleDoctorAuth(doctor.id, 'auth_express', doctor.auth_express)}
                      disabled={togglingDoctor === doctor.id + 'auth_express'}
                      className="relative w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-50"
                      style={{ background: doctor.auth_express ? '#6366f1' : '#d1d5db' }}>
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                        style={{ transform: doctor.auth_express ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>

                  {/* 비딩 토글 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold" style={{ color: doctor.auth_bidding ? '#f59e0b' : 'var(--text-muted)' }}>
                      🏆 비딩
                    </span>
                    <button
                      onClick={() => toggleDoctorAuth(doctor.id, 'auth_bidding', doctor.auth_bidding)}
                      disabled={togglingDoctor === doctor.id + 'auth_bidding'}
                      className="relative w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-50"
                      style={{ background: doctor.auth_bidding ? '#f59e0b' : '#d1d5db' }}>
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                        style={{ transform: doctor.auth_bidding ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 비딩 업체 관리 탭 ── */}
      {tab === 'bidding_vendors' && <BiddingVendorManager />}

      {/* ── 비딩 배정 탭 ── */}
      {tab === 'bidding_assign' && <DoctorBiddingAssigner />}

      {/* ── 미팅 현황 탭들 ── */}
      {tab === 'meetings' && <MeetingMonitor meetingType="standard" />}
      {tab === 'express_meetings' && <MeetingMonitor meetingType="express" />}
      {tab === 'bidding_meetings' && <BiddingMeetingMonitor />}

      {/* ── 계정 연결 모달 ── */}
      <AnimatePresence>
        {linkingVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setLinkingVendor(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl p-7 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                계정 연결
              </h3>

              <div className="rounded-xl p-3" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {linkingVendor.company_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {linkingVendor.rep_name} · {linkingVendor.email}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  담당자 구글 계정 선택
                </label>

                {profilesLoading ? (
                  <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
                ) : availableProfiles.length > 0 ? (
                  <>
                    <select
                      value={linkEmail}
                      onChange={e => setLinkEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: linkEmail ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      <option value="">-- 가입한 계정 선택 --</option>
                      {availableProfiles.map(p => (
                        <option key={p.id} value={p.email}>
                          {p.name} ({p.email}) {p.role === 'vendor' ? '· 벤더' : '· 일반'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      목록에 없으면 아래에 직접 입력하세요.
                    </p>
                    <input
                      type="email"
                      placeholder="직접 입력: example@gmail.com"
                      value={linkEmail}
                      onChange={e => setLinkEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLink()}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    />
                  </>
                ) : (
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={linkEmail}
                    onChange={e => setLinkEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLink()}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                )}

                {linkError && (
                  <p className="text-xs" style={{ color: '#dc2626' }}>⚠️ {linkError}</p>
                )}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  담당자가 <strong>/join/vendor</strong> 링크로 먼저 가입해야 목록에 나타납니다.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setLinkingVendor(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  취소
                </button>
                <button onClick={handleLink} disabled={!linkEmail.trim() || linkLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#6366f1' }}>
                  {linkLoading ? '연결 중...' : '연결하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 단계 추가/수정 모달 ── */}
      <AnimatePresence>
        {showStageForm && editingStage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl p-7 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingStage.id ? '단계 수정' : '단계 추가'}
              </h3>
              <input placeholder="단계명 *" value={editingStage.name ?? ''}
                onChange={e => setEditingStage(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              <input placeholder="설명 (선택)" value={editingStage.description ?? ''}
                onChange={e => setEditingStage(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              <div className="flex items-center gap-3">
                <input type="number" placeholder="순서" value={editingStage.order_index ?? ''}
                  onChange={e => setEditingStage(p => ({ ...p, order_index: Number(e.target.value) }))}
                  className="w-24 px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditingStage(p => ({ ...p, color: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: editingStage.color === c ? '#fff' : 'transparent',
                        boxShadow: editingStage.color === c ? `0 0 0 2px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowStageForm(false); setEditingStage(null) }}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>취소</button>
                <button onClick={saveStage} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: editingStage.color ?? 'var(--brand-primary)' }}>
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 벤더사 추가/수정 모달 ── */}
      <AnimatePresence>
        {showVendorForm && editingVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl p-7 w-full max-w-md space-y-3">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingVendor.id ? '업체 수정' : '업체 추가'}
              </h3>
              {[
                { key: 'company_name', label: '업체명 *', type: 'text' },
                { key: 'rep_name', label: '담당자명', type: 'text' },
                { key: 'email', label: '이메일', type: 'email' },
                { key: 'phone', label: '전화번호', type: 'text' },
                { key: 'website', label: '웹사이트', type: 'text' },
              ].map(({ key, label, type }) => (
                <input key={key} type={type} placeholder={label}
                  value={(editingVendor as any)[key] ?? ''}
                  onChange={e => setEditingVendor(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              ))}
              <select value={editingVendor.category_id ?? ''}
                onChange={e => setEditingVendor(p => ({ ...p, category_id: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="">개원 단계 선택 *</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {/* 삼성메디슨 대리점 전용: 담당 지역 */}
              {stages.find(s => s.id === editingVendor.category_id)?.stage_type === 'samsung_medison' && (
                <div>
                  <input type="text" placeholder="담당 지역 (예: 유비케어 — 서울 강남·서초·관악 등)"
                    value={editingVendor.region ?? ''}
                    onChange={e => setEditingVendor(p => ({ ...p, region: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ background: 'rgba(29,78,216,0.05)', borderColor: '#1d4ed8', color: 'var(--text-primary)' }} />
                  <p className="text-xs mt-1 px-1" style={{ color: '#1d4ed8' }}>
                    📡 삼성메디슨 대리점 — 담당 지역 범위를 메모용으로 입력하세요 (원장 화면에는 표시되지 않음)
                  </p>
                </div>
              )}
              <textarea placeholder="업체 소개 (선택)" rows={2}
                value={editingVendor.description ?? ''}
                onChange={e => setEditingVendor(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowVendorForm(false); setEditingVendor(null) }}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>취소</button>
                <button onClick={saveVendor} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--brand-primary)' }}>
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
