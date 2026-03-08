'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MeetingMonitor from './MeetingMonitor'

type Stage = { id: number; name: string; color: string; order_index: number; description: string | null }
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
  linked_profile: LinkedProfile
}

const COLORS = ['#06b6d4','#f59e0b','#22c55e','#a855f7','#ec4899','#ef4444','#14b8a6','#8b5cf6','#6366f1','#0ea5e9','#78716c','#f97316','#16a34a','#dc2626']

const VENDOR_JOIN_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/join/vendor`
  : '/join/vendor'

export default function AdminPanel() {
  const [tab, setTab] = useState<'stages' | 'vendors' | 'meetings'>('stages')
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
  const [availableProfiles, setAvailableProfiles] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)

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

  useEffect(() => { loadStages() }, [loadStages])
  useEffect(() => {
    if (tab === 'vendors') loadVendors(selectedStage?.id)
  }, [tab, selectedStage, loadVendors])

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
    await fetch('/api/admin/vendors', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingVendor),
    })
    await loadVendors(selectedStage?.id)
    setShowVendorForm(false)
    setEditingVendor(null)
    setLoading(false)
  }

  // ── 벤더사 삭제 ──
  async function deleteVendor(id: string) {
    if (!confirm('이 업체를 삭제하시겠습니까?')) return
    await fetch('/api/admin/vendors', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
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
      <div className="glass rounded-2xl px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>관리자 패널</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>개원 단계 및 제휴업체 관리</p>
        </div>
        <div className="text-sm px-3 py-1.5 rounded-full font-medium text-white" style={{ background: '#6366f1' }}>
          관리자
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'stages', label: '🗂 개원 단계 관리' },
          { key: 'vendors', label: '🏢 제휴업체 관리' },
          { key: 'meetings', label: '📅 미팅 현황' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? 'var(--brand-primary)' : 'var(--glass-bg)',
              color: tab === t.key ? '#fff' : 'var(--text-primary)',
              border: `1px solid ${tab === t.key ? 'var(--brand-primary)' : 'var(--border-default)'}`,
            }}>
            {t.label}
          </button>
        ))}
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

              <div className="space-y-2">
                {vendors.map(vendor => (
                  <div key={vendor.id} className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-muted)' }}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {vendor.company_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {vendor.rep_name && `${vendor.rep_name} · `}{vendor.email ?? '이메일 없음'}
                        </p>
                      </div>

                      {/* 계정 연결 상태 */}
                      {vendor.linked_profile ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-medium" style={{ color: '#16a34a' }}>
                              🟢 {vendor.linked_profile.name}
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
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }}>
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

      {/* ── 미팅 현황 탭 ── */}
      {tab === 'meetings' && <MeetingMonitor />}

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
