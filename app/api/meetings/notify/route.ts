/**
 * POST /api/meetings/notify
 * 원장이 미팅 신청 완료 후 호출 → 벤더사에게 이메일 알림
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyVendorMeetingRequest } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json()
    if (!requestId) return NextResponse.json({ error: 'requestId 필요' }, { status: 400 })

    const supabase = await createClient()

    // 미팅 요청 상세 조회
    const { data: meeting, error } = await (supabase
      .from('meeting_requests')
      .select(`
        proposed_times,
        stage:stages(name),
        vendor:vendors(company_name, rep_name, email),
        doctor_profile:profiles!meeting_requests_doctor_id_fkey(name)
      `)
      .eq('id', requestId)
      .single() as any)

    if (error || !meeting) {
      return NextResponse.json({ error: '미팅 요청을 찾을 수 없습니다.' }, { status: 404 })
    }

    const vendor = meeting.vendor as any
    const stage = meeting.stage as any
    const doctorProfile = meeting.doctor_profile as any

    if (!vendor?.email) {
      // 벤더사 이메일 없으면 스킵 (에러는 아님)
      return NextResponse.json({ ok: true, skipped: true })
    }

    await notifyVendorMeetingRequest({
      vendorEmail: vendor.email,
      vendorName: vendor.company_name,
      doctorName: doctorProfile.name,
      stageName: stage.name,
      proposedTimes: meeting.proposed_times,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[notify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
