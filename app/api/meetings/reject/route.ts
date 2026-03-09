/**
 * POST /api/meetings/reject
 * 벤더사가 미팅 요청 거절 → DB 업데이트 + 원장에게 이메일
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyDoctorMeetingRejected } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { requestId, vendorNote } = await req.json()
    if (!requestId) return NextResponse.json({ error: 'requestId 필요' }, { status: 400 })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: vendor } = await (supabase
      .from('vendors')
      .select('id, company_name')
      .eq('profile_id', user.id)
      .single() as any)

    if (!vendor) return NextResponse.json({ error: '벤더사 계정을 찾을 수 없습니다.' }, { status: 403 })

    const { data: meeting, error: fetchError } = await (supabase
      .from('meeting_requests')
      .select('id, status, vendor_id, doctor_id, stage:stages(name)')
      .eq('id', requestId)
      .eq('vendor_id', vendor.id)
      .single() as any)

    if (fetchError || !meeting) {
      return NextResponse.json({ error: '미팅 요청을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (meeting.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 요청입니다.' }, { status: 409 })
    }

    const { error: updateError } = await (supabase as any)
      .from('meeting_requests')
      .update({ status: 'rejected', vendor_note: vendorNote || null })
      .eq('id', requestId)

    if (updateError) throw updateError

    const stage = meeting.stage as any

    // RLS로 인해 벤더사 세션에서 원장 프로필 조회 불가 → adminClient 사용
    const { data: doctorProfile } = await (createAdminClient()
      .from('profiles')
      .select('name, email, notify_email')
      .eq('id', meeting.doctor_id)
      .single() as any)

    const doctorEmailTo = doctorProfile?.notify_email || doctorProfile?.email
    if (doctorEmailTo) {
      await notifyDoctorMeetingRejected({
        doctorEmail: doctorEmailTo,
        doctorName: doctorProfile.name,
        vendorName: vendor.company_name,
        stageName: stage?.name,
      }).catch(err => console.error('[reject] 이메일 발송 실패 (non-blocking):', err))
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[reject]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
