import { createClient } from '@/lib/supabase/server'
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

  // 벤더사 record 조회 (profile_id로 연결)
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, company_name')
    .eq('profile_id', user.id)
    .single() as { data: { id: string; company_name: string } | null; error: unknown }

  // 벤더사 계정이 연결되지 않은 경우
  if (!vendor) {
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

  // 미팅 요청 전체 조회 (이 벤더사에게 온 것)
  const { data: meetings } = await (supabase
    .from('meeting_requests')
    .select(`
      id, status, proposed_times, confirmed_time, meet_link, note, created_at,
      stage:stages(name, color, icon),
      doctor_profile:profiles!meeting_requests_doctor_id_fkey(name),
      doctor_info:doctors(clinic_name)
    `)
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false }) as any)

  // 필터 드롭다운용 단계 목록
  const { data: stages } = await (supabase
    .from('stages')
    .select('id, name, color')
    .order('order_index') as any)

  // 타입 정규화
  const normalizedMeetings = ((meetings as any[]) ?? []).map((m: any) => ({
    ...m,
    stage: Array.isArray(m.stage) ? m.stage[0] : m.stage,
    doctor_profile: Array.isArray(m.doctor_profile) ? m.doctor_profile[0] : m.doctor_profile,
    doctor_info: Array.isArray(m.doctor_info) ? (m.doctor_info[0] ?? null) : m.doctor_info,
  }))

  return (
    <main className="gradient-bg min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <VendorInbox
          meetings={normalizedMeetings}
          stages={stages ?? []}
          vendorName={vendor.company_name}
        />
      </div>
    </main>
  )
}
