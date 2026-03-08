/**
 * POST /api/meetings/confirm
 * 벤더사가 미팅 시간 확정 → DB 업데이트 + 원장에게 이메일
 * (Google Calendar 연동은 서비스 어카운트 설정 후 추가 예정)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyDoctorMeetingConfirmed } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { requestId, confirmedTime } = await req.json()
    if (!requestId || !confirmedTime) {
      return NextResponse.json({ error: 'requestId, confirmedTime 필요' }, { status: 400 })
    }

    const supabase = await createClient()

    // 요청자(벤더사) 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    // 벤더사 record 조회
    const { data: vendor } = await (supabase
      .from('vendors')
      .select('id, company_name')
      .eq('profile_id', user.id)
      .single() as any)

    if (!vendor) return NextResponse.json({ error: '벤더사 계정을 찾을 수 없습니다.' }, { status: 403 })

    // 해당 미팅이 이 벤더사 것인지 확인
    const { data: meeting, error: fetchError } = await (supabase
      .from('meeting_requests')
      .select(`
        id, status, vendor_id,
        stage:stages(name),
        doctor_profile:profiles!meeting_requests_doctor_id_fkey(name, email)
      `)
      .eq('id', requestId)
      .eq('vendor_id', vendor.id)
      .single() as any)

    if (fetchError || !meeting) {
      return NextResponse.json({ error: '미팅 요청을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (meeting.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 요청입니다.' }, { status: 409 })
    }

    // DB 업데이트 (meet_link는 Calendar 연동 후 채워짐, 현재는 null)
    const { error: updateError } = await (supabase as any)
      .from('meeting_requests')
      .update({ status: 'confirmed', confirmed_time: confirmedTime, meet_link: null })
      .eq('id', requestId)

    if (updateError) throw updateError

    // 원장에게 이메일 발송
    const stage = meeting.stage as any
    const doctorProfile = meeting.doctor_profile as any

    if (doctorProfile?.email) {
      await notifyDoctorMeetingConfirmed({
        doctorEmail: doctorProfile.email,
        doctorName: doctorProfile.name,
        vendorName: vendor.company_name,
        stageName: stage.name,
        confirmedTime,
        meetLink: null,
      }).catch(err => console.error('[confirm] 이메일 발송 실패 (non-blocking):', err))
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[confirm]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
