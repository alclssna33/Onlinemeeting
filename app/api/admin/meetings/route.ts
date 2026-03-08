/**
 * GET /api/admin/meetings
 * 전체 미팅 현황 조회 (Admin 전용)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await (supabase
    .from('profiles').select('role').eq('id', user.id).single() as any)
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  const { data, error } = await (supabase
    .from('meeting_requests')
    .select(`
      id, status, confirmed_time, meet_link, created_at, note, vendor_note,
      stage:stages(name, color),
      doctor_profile:profiles!meeting_requests_doctor_id_fkey(name, email),
      doctor_info:doctors(clinic_name),
      vendor:vendors(company_name, rep_name, email)
    `)
    .order('created_at', { ascending: false }) as any)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (data ?? []).map((m: any) => ({
    ...m,
    stage: Array.isArray(m.stage) ? m.stage[0] : m.stage,
    doctor_profile: Array.isArray(m.doctor_profile) ? m.doctor_profile[0] : m.doctor_profile,
    doctor_info: Array.isArray(m.doctor_info) ? (m.doctor_info[0] ?? null) : m.doctor_info,
    vendor: Array.isArray(m.vendor) ? m.vendor[0] : m.vendor,
  }))

  return NextResponse.json(normalized)
}
