/**
 * GET /api/admin/bidding/overview
 * 비딩 전체 현황 (bidding_events + bidding_slots + doctor/vendor 정보)
 * Admin 전용
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await (supabase
    .from('profiles').select('role').eq('id', user.id).single() as any)
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // 1. 비딩 이벤트 전체 조회
  const { data: events, error: eventsError } = await (adminClient
    .from('bidding_events')
    .select('*')
    .order('created_at', { ascending: false }) as any)

  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 })
  if (!events?.length) return NextResponse.json([])

  // 2. 슬롯 전체 조회
  const eventIds = events.map((e: any) => e.id)
  const { data: slots } = await (adminClient
    .from('bidding_slots')
    .select('*')
    .in('bidding_event_id', eventIds) as any)

  // 3. 원장 프로필 조회
  const doctorIds = [...new Set(events.map((e: any) => e.doctor_id))]
  const { data: doctorProfiles } = await (adminClient
    .from('profiles')
    .select('id, name, email, phone')
    .in('id', doctorIds) as any)

  const { data: doctorInfos } = await (adminClient
    .from('doctors')
    .select('id, clinic_name, specialty')
    .in('id', doctorIds) as any)

  // 4. 비딩 벤더 조회 (슬롯에서 claimed_by 수집)
  const vendorIds = [...new Set(
    (slots ?? []).map((s: any) => s.claimed_by).filter(Boolean)
  )]
  let vendorMap: Record<string, { company_name: string; rep_name: string | null; email: string | null }> = {}
  if (vendorIds.length > 0) {
    const { data: vendors } = await (adminClient
      .from('bidding_vendors')
      .select('id, company_name, rep_name, email')
      .in('id', vendorIds) as any)
    for (const v of vendors ?? []) {
      vendorMap[v.id] = { company_name: v.company_name, rep_name: v.rep_name, email: v.email }
    }
  }

  // 5. 조립
  const profileMap: Record<string, any> = {}
  for (const p of doctorProfiles ?? []) profileMap[p.id] = p

  const doctorInfoMap: Record<string, any> = {}
  for (const d of doctorInfos ?? []) doctorInfoMap[d.id] = d

  const slotsByEvent: Record<string, any[]> = {}
  for (const s of slots ?? []) {
    if (!slotsByEvent[s.bidding_event_id]) slotsByEvent[s.bidding_event_id] = []
    slotsByEvent[s.bidding_event_id].push({
      ...s,
      vendor: s.claimed_by ? (vendorMap[s.claimed_by] ?? null) : null,
    })
  }

  const result = events.map((e: any) => {
    const doctor = profileMap[e.doctor_id]
    const info = doctorInfoMap[e.doctor_id]
    const eventSlots = slotsByEvent[e.id] ?? []
    return {
      id: e.id,
      bidding_round: e.bidding_round,
      title: e.title,
      note: e.note,
      status: e.status,
      created_at: e.created_at,
      doctor: doctor ? {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        clinic_name: info?.clinic_name ?? null,
      } : null,
      slots: eventSlots,
      slots_total: eventSlots.length,
      slots_claimed: eventSlots.filter((s: any) => s.status === 'claimed').length,
      slots_available: eventSlots.filter((s: any) => s.status === 'available').length,
    }
  })

  return NextResponse.json(result)
}
