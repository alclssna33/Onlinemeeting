'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type BiddingVendor = {
  id: string
  company_name: string
  rep_name: string | null
  email: string | null
  phone: string | null
  description: string | null
  website: string | null
  is_active: boolean
  profile_id: string | null
  linked_profile: { name: string; email: string } | null
}

export default function BiddingVendorManager() {
  const [vendors, setVendors] = useState<BiddingVendor[]>([])
  const [loading, setLoading] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Partial<BiddingVendor> | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [linkingVendor, setLinkingVendor] = useState<BiddingVendor | null>(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [availableProfiles, setAvailableProfiles] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)

  const loadVendors = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/bidding-vendors')
    const data = await res.json()
    setVendors(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { loadVendors() }, [loadVendors])

  async function saveVendor() {
    if (!editingVendor?.company_name) return
    setLoading(true)
    const method = editingVendor.id ? 'PATCH' : 'POST'
    await fetch('/api/admin/bidding-vendors', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingVendor),
    })
    await loadVendors()
    setShowForm(false)
    setEditingVendor(null)
    setLoading(false)
  }

  async function deleteVendor(id: string) {
    if (!confirm('이 비딩 업체를 삭제하시겠습니까?\n연결된 배정 정보도 함께 삭제됩니다.')) return
    await fetch('/api/admin/bidding-vendors', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadVendors()
  }

  async function loadAvailableProfiles() {
    setProfilesLoading(true)
    const res = await fetch('/api/admin/profiles?target=bidding')
    const data = await res.json()
    setAvailableProfiles(Array.isArray(data) ? data : [])
    setProfilesLoading(false)
  }

  async function handleLink() {
    if (!linkingVendor || !linkEmail.trim()) return
    setLinkLoading(true)
    setLinkError(null)
    const res = await fetch('/api/admin/bidding-vendors/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biddingVendorId: linkingVendor.id, userEmail: linkEmail.trim() }),
    })
    const result = await res.json()
    setLinkLoading(false)
    if (!res.ok) { setLinkError(result.error); return }
    setLinkingVendor(null)
    setLinkEmail('')
    await loadVendors()
  }

  async function handleUnlink(vendorId: string) {
    if (!confirm('계정 연결을 해제하시겠습니까?')) return
    await fetch('/api/admin/bidding-vendors/link', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biddingVendorId: vendorId }),
    })
    await loadVendors()
  }

  return (
    <div className="space-y-3">
      {/* 안내 배너 */}
      <div className="glass rounded-2xl px-5 py-4"
        style={{ borderLeft: '4px solid #f59e0b' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          🏆 비딩 전용 업체 관리
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          일반 제휴업체와 완전히 분리된 인테리어 비딩 전용 업체 풀입니다.
          등록 후 [비딩 배정] 탭에서 원장별로 배정하세요.
        </p>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
            비딩 업체 목록 ({vendors.length})
          </h2>
          <button
            onClick={() => { setEditingVendor({ is_active: true }); setShowForm(true) }}
            className="text-sm px-4 py-2 rounded-xl text-white font-semibold"
            style={{ background: '#f59e0b' }}>
            + 업체 추가
          </button>
        </div>

        {loading && vendors.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
            불러오는 중...
          </p>
        ) : vendors.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
            등록된 비딩 업체가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {vendors.map(vendor => (
              <div key={vendor.id} className="rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-muted)' }}>
                <div className="flex items-center gap-3 p-3 flex-wrap">
                  {/* 업체 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {vendor.company_name}
                      </p>
                      {!vendor.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: '#fee2e2', color: '#dc2626' }}>
                          비활성
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {vendor.rep_name && `${vendor.rep_name} · `}{vendor.email ?? '이메일 없음'}
                      {vendor.phone && ` · ${vendor.phone}`}
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
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: '#fee2e2', color: '#dc2626' }}>
                        해제
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setLinkingVendor(vendor); setLinkEmail(''); setLinkError(null); loadAvailableProfiles() }}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
                      🔗 계정 연결
                    </button>
                  )}

                  <button
                    onClick={() => { setEditingVendor(vendor); setShowForm(true) }}
                    className="text-xs px-3 py-1 rounded-lg border shrink-0"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                    수정
                  </button>
                  <button
                    onClick={() => deleteVendor(vendor.id)}
                    className="text-xs px-3 py-1 rounded-lg shrink-0"
                    style={{ background: '#fee2e2', color: '#dc2626' }}>
                    삭제
                  </button>
                </div>

                {vendor.description && (
                  <div className="px-3 pb-3">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {vendor.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가/수정 모달 */}
      <AnimatePresence>
        {showForm && editingVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl p-7 w-full max-w-md space-y-3">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingVendor.id ? '비딩 업체 수정' : '비딩 업체 추가'}
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
              <textarea placeholder="업체 소개 (선택)" rows={2}
                value={editingVendor.description ?? ''}
                onChange={e => setEditingVendor(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox"
                  checked={editingVendor.is_active ?? true}
                  onChange={e => setEditingVendor(p => ({ ...p, is_active: e.target.checked }))} />
                <span style={{ color: 'var(--text-secondary)' }}>활성화</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowForm(false); setEditingVendor(null) }}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  취소
                </button>
                <button onClick={saveVendor} disabled={!editingVendor.company_name || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#f59e0b' }}>
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 계정 연결 모달 */}
      <AnimatePresence>
        {linkingVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setLinkingVendor(null) }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl p-7 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                계정 연결 — {linkingVendor.company_name}
              </h3>

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
                  style={{ background: '#f59e0b' }}>
                  {linkLoading ? '연결 중...' : '연결하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
