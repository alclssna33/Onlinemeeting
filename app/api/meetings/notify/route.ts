/**
 * POST /api/meetings/notify
 * 원장이 미팅 신청 완료 후 호출 → 벤더사에게 이메일 알림
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyVendorMeetingRequest } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json()
    if (!requestId) return NextResponse.json({ error: 'requestId 필요' }, { status: 400 })

    // admin client로 RLS 우회하여 정확한 데이터 조회
    const adminClient = createAdminClient()

    const { data: meeting, error } = await (adminClient
      .from('meeting_requests')
      .select(`
        doctor_id,
        proposed_times,
        stage:stages(name),
        vendor:vendors(company_name, rep_name, email)
      `)
      .eq('id', requestId)
      .single() as any)

    if (error || !meeting) {
      return NextResponse.json({ error: '미팅 요청을 찾을 수 없습니다.' }, { status: 404 })
    }

    const vendor = Array.isArray(meeting.vendor) ? meeting.vendor[0] : meeting.vendor
    const stage = Array.isArray(meeting.stage) ? meeting.stage[0] : meeting.stage

    // 원장 닉네임 직접 조회 (RLS 우회)
    const { data: doctorProfile } = await (adminClient
      .from('profiles')
      .select('name')
      .eq('id', meeting.doctor_id)
      .single() as any)

    const doctorName = doctorProfile?.name && doctorProfile.name !== '__pending__'
      ? doctorProfile.name
      : '원장님'

    if (!vendor?.email) {
      console.warn('[notify] 벤더사 이메일 없음 - 스킵. vendor:', vendor)
      return NextResponse.json({ ok: true, skipped: true, reason: 'no vendor email' })
    }

    await notifyVendorMeetingRequest({
      vendorEmail: vendor.email,
      vendorName: vendor.company_name,
      doctorName,
      stageName: stage.name,
      proposedTimes: meeting.proposed_times,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[notify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
