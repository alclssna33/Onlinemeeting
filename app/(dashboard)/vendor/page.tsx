import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VendorInbox from './VendorInbox'

export default async function VendorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string } | null; error: unknown }

  if (profile?.role !== 'vendor' && profile?.role !== 'admin') redirect('/login')

  // 일반 벤더사 record 조회
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, company_name')
    .eq('profile_id', user.id)
    .single() as { data: { id: string; company_name: string } | null; error: unknown }

  // 비딩 벤더 record 조회 (일반 벤더와 별개)
  const adminClient = createAdminClient()
  const { data: biddingVendor } = await (adminClient
    .from('bidding_vendors')
    .select('id, company_name, is_active')
    .eq('profile_id', user.id)
    .single() as any)

  // 둘 다 없으면 계정 연결 필요
  if (!vendor && !biddingVendor) {
    return (
      <main className="gradient-bg min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              계정 연결 필요
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              현재 로그인한 구글 계정이 벤더사 계정과 연결되지 않았습니다.<br />
              관리자에게 계정 연결을 요청해주세요.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 비딩 벤더만 있고 일반 벤더 없는 경우 → 비딩 보드로 리디렉트
  if (!vendor && biddingVendor) {
    redirect('/vendor/bidding')
  }

  // 일반 벤더 미팅 목록 조회
  const { data: meetings, error: meetingsError } = await (adminClient
    .from('meeting_requests')
    .select(`
      id, status, selection_status, proposed_times, confirmed_time, meet_link, note, vendor_note, product_name, created_at,
      stage:stages(name, color, icon),
      doctor_profile:profiles!meeting_requests_doctor_id_fkey(name, phone, doctors(clinic_name))
    `)
    .eq('vendor_id', vendor!.id)
    .order('created_at', { ascending: false }) as any)

  if (meetingsError) {
    console.error('[vendor/page] meetings query error:', meetingsError)
  }

  const normalizedMeetings = ((meetings as any[]) ?? []).map((m: any) => {
    const stage = Array.isArray(m.stage) ? m.stage[0] : m.stage
    const rawProfile = Array.isArray(m.doctor_profile) ? m.doctor_profile[0] : m.doctor_profile
    const doctorsDirect = rawProfile?.doctors
    const doctorInfo = Array.isArray(doctorsDirect)
      ? (doctorsDirect[0] ?? null)
      : (doctorsDirect ?? null)
    return {
      ...m,
      stage,
      doctor_profile: rawProfile ? { name: rawProfile.name ?? '알 수 없음', phone: rawProfile.phone ?? null } : { name: '알 수 없음', phone: null },
      doctor_info: doctorInfo,
    }
  })

  return (
    <main className="gradient-bg min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* 비딩 벤더이기도 하면 비딩 보드 링크 표시 */}
        {biddingVendor && (
          <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between"
            style={{ borderLeft: '4px solid #f59e0b' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>🏆 비딩 보드 이용 가능</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                배정된 원장님의 비딩 슬롯을 선점하세요.
              </p>
            </div>
            <a href="/vendor/bidding"
              className="text-sm px-4 py-2 rounded-xl font-bold shrink-0"
              style={{ background: '#f59e0b', color: '#fff' }}>
              비딩 보드 →
            </a>
          </div>
        )}

        <VendorInbox
          meetings={normalizedMeetings}
          vendorName={vendor!.company_name}
        />
      </div>
    </main>
  )
}
