/**
 * POST /api/bidding/slots/claim
 * 비딩 벤더: 슬롯 선점 → Google Calendar(비딩 캘린더) 이벤트 생성 + Meet 링크
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMeetingEvent } from '@/lib/google-calendar'
import { createMeetSpace } from '@/lib/google-meet'
import { notifyDoctorBiddingSlotClaimed } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const adminClient = createAdminClient()

  // 비딩 벤더 확인
  const { data: bv } = await (adminClient
    .from('bidding_vendors')
    .select('id, company_name')
    .eq('profile_id', user.id)
    .single() as any)

  if (!bv) return NextResponse.json({ error: '비딩 벤더 계정 없음' }, { status: 403 })

  const { slotId } = await req.json()
  if (!slotId) return NextResponse.json({ error: 'slotId 필요' }, { status: 400 })

  // 슬롯 조회
  const { data: slot } = await (adminClient
    .from('bidding_slots')
    .select('id, bidding_event_id, proposed_time, status, claimed_by')
    .eq('id', slotId)
    .single() as any)

  if (!slot) return NextResponse.json({ error: '슬롯 없음' }, { status: 404 })
  if (slot.status !== 'available') {
    return NextResponse.json({ error: '이미 선점된 슬롯입니다' }, { status: 409 })
  }

  // 비딩 이벤트 조회 (doctor_id 확인)
  const { data: event } = await (adminClient
    .from('bidding_events')
    .select('id, doctor_id, bidding_round, title, note, status')
    .eq('id', slot.bidding_event_id)
    .single() as any)

  if (!event || event.status !== 'open') {
    return NextResponse.json({ error: '참여 가능한 이벤트가 아닙니다' }, { status: 400 })
  }

  // 내가 이 (doctor, round)에 배정되어 있는지 확인
  const { data: assignment } = await (adminClient
    .from('doctor_bidding_vendors')
    .select('id')
    .eq('doctor_id', event.doctor_id)
    .eq('bidding_vendor_id', bv.id)
    .eq('bidding_round', event.bidding_round)
    .single() as any)

  if (!assignment) {
    return NextResponse.json({ error: '배정되지 않은 이벤트입니다' }, { status: 403 })
  }

  // 원장 프로필 조회
  const { data: doctorProfile } = await (adminClient
    .from('profiles').select('name, email, notify_email').eq('id', event.doctor_id).single() as any)
  const { data: doctorInfo } = await (adminClient
    .from('doctors').select('clinic_name').eq('id', event.doctor_id).single() as any)

  // Google Meet 공간 생성 (confirm/route.ts 패턴 동일)
  let meetLink: string | null = null
  let calendarEventId: string | null = null

  try {
    meetLink = await createMeetSpace()
  } catch (e) {
    console.error('[bidding/slots/claim] Meet space error:', e)
  }

  // Google Calendar 이벤트 생성 (비딩 캘린더)
  const biddingCalendarId = process.env.GOOGLE_CALENDAR_ID_BIDDING
  if (biddingCalendarId) {
    try {
      const doctorName = doctorProfile?.name ?? '원장님'
      const clinicName = doctorInfo?.clinic_name ? ` (${doctorInfo.clinic_name})` : ''
      const roundLabel = `${event.bidding_round}차`
      const result = await createMeetingEvent(
        {
          title: `[개비공 비딩 ${roundLabel}] ${doctorName} 원장님${clinicName} × ${bv.company_name}`,
          description: [
            `비딩 회차: ${roundLabel}`,
            event.title ? `제목: ${event.title}` : '',
            event.note ? `원장 전달사항: ${event.note}` : '',
            `업체: ${bv.company_name}`,
            meetLink ? `Google Meet: ${meetLink}` : '',
          ].filter(Boolean).join('\n'),
          startTime: slot.proposed_time,
          durationMinutes: 60,
          attendeeEmails: [
            doctorProfile?.email,
          ].filter(Boolean) as string[],
        },
        biddingCalendarId
      )
      calendarEventId = result.eventId
    } catch (e) {
      console.error('[bidding/slots/claim] Calendar error:', e)
      // 캘린더 실패해도 선점은 진행
    }
  }

  // 슬롯 업데이트
  const { error: updateError } = await ((adminClient as any)
    .from('bidding_slots')
    .update({
      status: 'claimed',
      claimed_by: bv.id,
      claimed_at: new Date().toISOString(),
      meet_link: meetLink,
      calendar_event_id: calendarEventId,
    })
    .eq('id', slotId)
    .eq('status', 'available'))  // 동시성 보호

  if (updateError) {
    return NextResponse.json({ error: '선점에 실패했습니다. 다른 업체가 먼저 선점했을 수 있습니다.' }, { status: 409 })
  }

  // 원장에게 선점 알림 이메일 (비동기, 실패해도 무시)
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlinemeeting-zeta.vercel.app'
  const doctorEmailTo = doctorProfile?.notify_email || doctorProfile?.email
  if (doctorEmailTo) {
    notifyDoctorBiddingSlotClaimed({
      doctorEmail: doctorEmailTo,
      doctorName: doctorProfile.name ?? '원장님',
      vendorName: bv.company_name,
      biddingRound: event.bidding_round,
      slotTime: slot.proposed_time,
      meetLink,
      platformUrl: `${platformUrl}/doctor/bidding`,
    }).catch(e => console.error('[claim] email error:', e))
  }

  return NextResponse.json({ ok: true, meet_link: meetLink })
}
