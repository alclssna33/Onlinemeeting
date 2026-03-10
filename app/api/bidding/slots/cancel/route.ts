/**
 * POST /api/bidding/slots/cancel
 * 비딩 벤더: 내가 선점한 슬롯 취소 (캘린더 이벤트도 삭제)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'
import { notifyDoctorBiddingSlotCancelled } from '@/lib/email'

async function deleteBiddingCalendarEvent(eventId: string) {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
    const subject = process.env.GOOGLE_CALENDAR_OWNER || process.env.GOOGLE_CALENDAR_ID!
    const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/calendar'], subject })
    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID_BIDDING!
    await calendar.events.delete({ calendarId, eventId }).catch(() => {})
  } catch {
    // 캘린더 삭제 실패는 무시
  }
}

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

  // 슬롯 조회 (내 것인지 확인)
  const { data: slot } = await (adminClient
    .from('bidding_slots')
    .select('id, bidding_event_id, proposed_time, status, claimed_by, calendar_event_id')
    .eq('id', slotId)
    .single() as any)

  if (!slot) return NextResponse.json({ error: '슬롯 없음' }, { status: 404 })
  if (slot.claimed_by !== bv.id) {
    return NextResponse.json({ error: '내가 선점한 슬롯이 아닙니다' }, { status: 403 })
  }
  if (slot.status !== 'claimed') {
    return NextResponse.json({ error: '선점된 슬롯이 아닙니다' }, { status: 400 })
  }

  // 원장 정보 조회 (이메일 발송용)
  const { data: event } = await (adminClient
    .from('bidding_events')
    .select('doctor_id, bidding_round')
    .eq('id', slot.bidding_event_id)
    .single() as any)

  const { data: doctorProfile } = event?.doctor_id
    ? await (adminClient.from('profiles').select('name, email, notify_email').eq('id', event.doctor_id).single() as any)
    : { data: null }

  // 캘린더 이벤트 삭제
  if (slot.calendar_event_id) {
    await deleteBiddingCalendarEvent(slot.calendar_event_id)
  }

  // 슬롯 취소 → available로 복원 (다른 업체가 다시 선점 가능)
  const { error } = await ((adminClient as any)
    .from('bidding_slots')
    .update({
      status: 'available',
      claimed_by: null,
      claimed_at: null,
      meet_link: null,
      calendar_event_id: null,
    })
    .eq('id', slotId))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 원장에게 취소 알림 이메일 (비동기, 실패해도 무시)
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlinemeeting-zeta.vercel.app'
  const doctorEmailTo = doctorProfile?.notify_email || doctorProfile?.email
  if (doctorEmailTo && event) {
    notifyDoctorBiddingSlotCancelled({
      doctorEmail: doctorEmailTo,
      doctorName: doctorProfile.name ?? '원장님',
      vendorName: bv.company_name,
      biddingRound: event.bidding_round,
      slotTime: slot.proposed_time,
      platformUrl: `${platformUrl}/doctor/bidding`,
    }).catch(e => console.error('[cancel] email error:', e))
  }

  return NextResponse.json({ ok: true })
}
