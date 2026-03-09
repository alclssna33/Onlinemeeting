/**
 * GET  /api/bidding/events   — 원장: 내 비딩 이벤트 목록 (슬롯 포함)
 * POST /api/bidding/events   — 원장: 비딩 이벤트 + 슬롯 생성
 * PATCH /api/bidding/events  — 원장: 이벤트 상태 변경 (open/closed/completed)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyVendorBiddingEventCreated } from '@/lib/email'

async function getAuthDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as any
  if (profile?.role !== 'doctor' && profile?.role !== 'admin') return null

  // 비딩 권한 확인 — adminClient로 RLS 우회
  const adminClient = createAdminClient()
  const { data: doctorAuth } = await (adminClient
    .from('doctors').select('auth_bidding').eq('id', user.id).single() as any)
  if (!doctorAuth?.auth_bidding && profile?.role !== 'admin') return null

  return user.id
}

export async function GET() {
  const doctorId = await getAuthDoctor()
  if (!doctorId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const adminClient = createAdminClient()

  const { data: events, error } = await (adminClient
    .from('bidding_events')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false }) as any)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!events?.length) return NextResponse.json([])

  const eventIds = events.map((e: any) => e.id)
  const { data: slots } = await (adminClient
    .from('bidding_slots')
    .select('*, vendor:bidding_vendors(company_name, rep_name)')
    .in('bidding_event_id', eventIds)
    .order('proposed_time', { ascending: true }) as any)

  const slotsByEvent: Record<string, any[]> = {}
  for (const s of slots ?? []) {
    if (!slotsByEvent[s.bidding_event_id]) slotsByEvent[s.bidding_event_id] = []
    slotsByEvent[s.bidding_event_id].push({
      id: s.id,
      proposed_time: s.proposed_time,
      status: s.status,
      claimed_at: s.claimed_at,
      meet_link: s.meet_link,
      calendar_event_id: s.calendar_event_id,
      vendor: s.claimed_by ? (s.vendor ?? null) : null,
    })
  }

  const result = events.map((e: any) => {
    const eventSlots = slotsByEvent[e.id] ?? []
    return {
      ...e,
      slots: eventSlots,
      slots_total: eventSlots.length,
      slots_claimed: eventSlots.filter((s: any) => s.status === 'claimed').length,
      slots_available: eventSlots.filter((s: any) => s.status === 'available').length,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const doctorId = await getAuthDoctor()
  if (!doctorId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { bidding_round, title, note, proposed_times } = body

  if (!bidding_round || ![1, 2, 3].includes(bidding_round)) {
    return NextResponse.json({ error: '유효하지 않은 회차' }, { status: 400 })
  }
  if (!Array.isArray(proposed_times) || proposed_times.length < 1) {
    return NextResponse.json({ error: '슬롯을 1개 이상 등록해주세요' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 이벤트 생성
  const { data: event, error: eventError } = await (adminClient
    .from('bidding_events')
    .insert({ doctor_id: doctorId, bidding_round, title: title || null, note: note || null, status: 'open' } as any)
    .select()
    .single() as any)

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

  // 슬롯 생성
  const slotRows = proposed_times.map((t: string) => ({
    bidding_event_id: event.id,
    proposed_time: t,
    status: 'available',
  }))

  const { error: slotsError } = await (adminClient
    .from('bidding_slots')
    .insert(slotRows as any) as any)

  if (slotsError) return NextResponse.json({ error: slotsError.message }, { status: 500 })

  // 이 회차에 배정된 벤더사들에게 이메일 알림 (비동기, 실패해도 무시)
  ;(async () => {
    try {
      const { data: assignments } = await (adminClient
        .from('doctor_bidding_vendors')
        .select('bidding_vendor_id')
        .eq('doctor_id', doctorId)
        .eq('bidding_round', bidding_round) as any)

      if (!assignments?.length) return

      const vendorIds = assignments.map((a: any) => a.bidding_vendor_id)
      const { data: vendors } = await (adminClient
        .from('bidding_vendors')
        .select('company_name, email')
        .in('id', vendorIds)
        .eq('is_active', true) as any)

      const { data: doctorProfile } = await (adminClient
        .from('profiles')
        .select('name')
        .eq('id', doctorId)
        .single() as any)

      const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

      for (const vendor of vendors ?? []) {
        if (!vendor.email) continue
        notifyVendorBiddingEventCreated({
          vendorEmail: vendor.email,
          vendorName: vendor.company_name,
          doctorName: doctorProfile?.name ?? '원장님',
          biddingRound: bidding_round,
          title: title || null,
          slotsCount: proposed_times.length,
          platformUrl: `${platformUrl}/vendor/bidding`,
        }).catch(e => console.error('[bidding/events] email error:', e))
      }
    } catch (e) {
      console.error('[bidding/events] email dispatch error:', e)
    }
  })()

  return NextResponse.json({ id: event.id }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const doctorId = await getAuthDoctor()
  if (!doctorId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { eventId, status } = body

  if (!eventId || !['open', 'closed', 'completed'].includes(status)) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 소유 확인
  const { data: event } = await (adminClient
    .from('bidding_events').select('doctor_id').eq('id', eventId).single() as any)
  if (event?.doctor_id !== doctorId) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { error } = await ((adminClient as any)
    .from('bidding_events').update({ status }).eq('id', eventId))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
