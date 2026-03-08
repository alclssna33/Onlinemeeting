/**
 * POST /api/meetings/confirm
 * 벤더사가 미팅 시간 확정
 * → Google Calendar 일정 생성 + Meet 링크 생성
 * → DB 업데이트 (confirmed_time, meet_link, calendar_event_id)
 * → 원장에게 이메일 발송
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyDoctorMeetingConfirmed } from '@/lib/email'
import { createMeetSpace } from '@/lib/google-meet'
import { createMeetingEvent } from '@/lib/google-calendar'

export async function POST(req: NextRequest) {
  try {
    const { requestId, confirmedTime } = await req.json()
    if (!requestId || !confirmedTime) {
      return NextResponse.json({ error: 'requestId, confirmedTime 필요' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: vendor } = await (supabase
      .from('vendors')
      .select('id, company_name, email')
      .eq('profile_id', user.id)
      .single() as any)

    if (!vendor) return NextResponse.json({ error: '벤더사 계정을 찾을 수 없습니다.' }, { status: 403 })

    const { data: meeting, error: fetchError } = await (supabase
      .from('meeting_requests')
      .select(`id, status, vendor_id, doctor_id, note, stage:stages(name)`)
      .eq('id', requestId)
      .eq('vendor_id', vendor.id)
      .single() as any)

    if (fetchError || !meeting) {
      return NextResponse.json({ error: '미팅 요청을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (meeting.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 요청입니다.' }, { status: 409 })
    }

    const stage = Array.isArray(meeting.stage) ? meeting.stage[0] : meeting.stage

    // 원장 프로필 admin client로 조회 (RLS 우회)
    const { data: doctorProfile } = await (createAdminClient()
      .from('profiles')
      .select('name, email')
      .eq('id', meeting.doctor_id)
      .single() as any)

    // ── 1. Google Meet 링크 생성 (캘린더와 무관) ─────────────────
    let meetLink: string | null = null
    meetLink = await createMeetSpace()  // 실패 시 null 반환 (non-blocking)

    // ── 2. Google Calendar 일정 생성 (선택, 토글 ON일 때만) ──────
    const adminClient = createAdminClient()
    const { data: calSetting } = await (adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'calendar_enabled')
      .single() as any)
    const calendarEnabled = calSetting?.value !== 'false'

    let calendarEventId: string | null = null
    if (calendarEnabled) try {
      const attendees = [doctorProfile?.email, vendor.email].filter(Boolean)
      const noteText = meeting.note ? `\n원장님 전달사항: ${meeting.note}` : ''
      const { eventId } = await createMeetingEvent({
        title: `[개비공] ${doctorProfile?.name ?? '원장님'} × ${vendor.company_name}`,
        description: `개원 단계: ${stage?.name}\n참석: ${doctorProfile?.name} 원장님, ${vendor.company_name}${noteText}`,
        startTime: confirmedTime,
        durationMinutes: 60,
        attendeeEmails: attendees,
      })
      calendarEventId = eventId
      console.log('[confirm] 캘린더 이벤트 생성 완료:', eventId)
    } catch (calErr: any) {
      console.error('[confirm] 캘린더 생성 실패 (non-blocking):', calErr.message ?? calErr)
    }

    // ── DB 업데이트 ──────────────────────────────────────────
    const { error: updateError } = await (supabase as any)
      .from('meeting_requests')
      .update({
        status: 'confirmed',
        confirmed_time: confirmedTime,
        meet_link: meetLink,
        calendar_event_id: calendarEventId,
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    // ── 원장에게 이메일 발송 ──────────────────────────────────
    if (doctorProfile?.email) {
      await notifyDoctorMeetingConfirmed({
        doctorEmail: doctorProfile.email,
        doctorName: doctorProfile.name,
        vendorName: vendor.company_name,
        stageName: stage?.name,
        confirmedTime,
        meetLink,
      }).catch(err => console.error('[confirm] 이메일 발송 실패 (non-blocking):', err))
    }

    return NextResponse.json({ ok: true, meetLink })
  } catch (err: any) {
    console.error('[confirm]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
