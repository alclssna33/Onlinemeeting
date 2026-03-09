/**
 * GET /api/bidding/slots?round=1
 * 비딩 벤더용: 내가 배정된 원장들의 슬롯 조회 (경쟁사 블라인드)
 * - claimed_by 마스킹: is_mine / is_taken 으로 대체
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const adminClient = createAdminClient()

  // 비딩 벤더 확인 (profile_id로 연결)
  const { data: bv } = await (adminClient
    .from('bidding_vendors')
    .select('id, company_name')
    .eq('profile_id', user.id)
    .single() as any)

  if (!bv) return NextResponse.json({ error: '비딩 벤더 계정 없음' }, { status: 403 })

  const round = req.nextUrl.searchParams.get('round')
  const roundNum = round ? parseInt(round) : null

  // 내가 배정된 (doctor, round) 목록
  const assignmentQuery = adminClient
    .from('doctor_bidding_vendors')
    .select('doctor_id, bidding_round')
    .eq('bidding_vendor_id', bv.id)

  const { data: assignments } = await (assignmentQuery as any)
  if (!assignments?.length) return NextResponse.json([])

  // 회차 필터
  const filteredAssignments = roundNum
    ? assignments.filter((a: any) => a.bidding_round === roundNum)
    : assignments

  if (!filteredAssignments.length) return NextResponse.json([])

  // 해당 원장들의 비딩 이벤트 조회
  const doctorIds = [...new Set(filteredAssignments.map((a: any) => a.doctor_id))]
  const rounds = [...new Set(filteredAssignments.map((a: any) => a.bidding_round))]

  const { data: events } = await (adminClient
    .from('bidding_events')
    .select('id, doctor_id, bidding_round, title, note, status, created_at')
    .in('doctor_id', doctorIds)
    .in('bidding_round', rounds)
    .eq('status', 'open')
    .order('created_at', { ascending: false }) as any)

  if (!events?.length) return NextResponse.json([])

  // 원장 프로필 조회
  const { data: doctorProfiles } = await (adminClient
    .from('profiles')
    .select('id, name')
    .in('id', doctorIds) as any)

  const { data: doctorInfos } = await (adminClient
    .from('doctors')
    .select('id, clinic_name')
    .in('id', doctorIds) as any)

  const profileMap: Record<string, any> = {}
  for (const p of doctorProfiles ?? []) profileMap[p.id] = p
  const infoMap: Record<string, any> = {}
  for (const d of doctorInfos ?? []) infoMap[d.id] = d

  // 슬롯 조회
  const eventIds = events.map((e: any) => e.id)
  const { data: slots } = await (adminClient
    .from('bidding_slots')
    .select('id, bidding_event_id, proposed_time, status, claimed_by, claimed_at, meet_link, calendar_event_id')
    .in('bidding_event_id', eventIds)
    .order('proposed_time', { ascending: true }) as any)

  const slotsByEvent: Record<string, any[]> = {}
  for (const s of slots ?? []) {
    if (!slotsByEvent[s.bidding_event_id]) slotsByEvent[s.bidding_event_id] = []
    const isMine = s.claimed_by === bv.id
    const isTaken = !!s.claimed_by && !isMine
    slotsByEvent[s.bidding_event_id].push({
      id: s.id,
      proposed_time: s.proposed_time,
      status: s.status,
      claimed_at: isMine ? s.claimed_at : null,
      meet_link: isMine ? s.meet_link : null,
      calendar_event_id: isMine ? s.calendar_event_id : null,
      is_mine: isMine,
      is_taken: isTaken,
    })
  }

  const result = events.map((e: any) => {
    const eventSlots = slotsByEvent[e.id] ?? []
    const doctor = profileMap[e.doctor_id]
    const info = infoMap[e.doctor_id]
    // 이 이벤트에 내가 배정된 회차인지 확인
    const isAssigned = filteredAssignments.some(
      (a: any) => a.doctor_id === e.doctor_id && a.bidding_round === e.bidding_round
    )
    if (!isAssigned) return null
    return {
      id: e.id,
      bidding_round: e.bidding_round,
      title: e.title,
      note: e.note,
      status: e.status,
      created_at: e.created_at,
      doctor: {
        name: doctor?.name ?? '원장님',
        clinic_name: info?.clinic_name ?? null,
      },
      slots: eventSlots,
      slots_total: eventSlots.length,
      slots_claimed: eventSlots.filter((s: any) => s.status === 'claimed').length,
      slots_mine: eventSlots.filter((s: any) => s.is_mine).length,
    }
  }).filter(Boolean)

  return NextResponse.json(result)
}
