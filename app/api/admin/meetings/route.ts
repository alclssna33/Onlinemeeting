/**
 * GET /api/admin/meetings
 * 전체 미팅 현황 조회 (Admin 전용)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  // 인증·권한 확인은 유저 세션으로
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await (supabase
    .from('profiles').select('role').eq('id', user.id).single() as any)
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  // 데이터 조회는 adminClient로 — RLS 우회하여 전체 미팅 + 정확한 닉네임 조회
  const adminClient = createAdminClient()
  const { data, error } = await (adminClient
    .from('meeting_requests')
    .select(`
      id, status, meeting_type, confirmed_time, meet_link, created_at, note, vendor_note,
      stage:stages(name, color),
      doctor_profile:profiles!meeting_requests_doctor_id_fkey(name, email, doctors(clinic_name)),
      vendor:vendors(company_name, rep_name, email)
    `)
    .order('created_at', { ascending: false }) as any)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (data ?? []).map((m: any) => {
    const doctorProfile = Array.isArray(m.doctor_profile) ? m.doctor_profile[0] : m.doctor_profile
    const doctorsDirect = doctorProfile?.doctors
    const doctorInfo = Array.isArray(doctorsDirect)
      ? (doctorsDirect[0] ?? null)
      : (doctorsDirect ?? null)
    return {
      ...m,
      stage: Array.isArray(m.stage) ? m.stage[0] : m.stage,
      doctor_profile: doctorProfile ? { name: doctorProfile.name, email: doctorProfile.email } : null,
      doctor_info: doctorInfo,
      vendor: Array.isArray(m.vendor) ? m.vendor[0] : m.vendor,
    }
  })

  return NextResponse.json(normalized)
}
