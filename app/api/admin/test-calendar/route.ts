/**
 * GET /api/admin/test-calendar
 * Google Calendar 연동 진단 (Admin 전용)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMeetSpace } from '@/lib/google-meet'
import { createMeetingEvent, deleteMeetingEvent } from '@/lib/google-calendar'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as any
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  const steps: { step: string; status: 'ok' | 'fail'; detail?: string }[] = []

  // 1. 환경변수 확인
  const envCheck = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_CALENDAR_ID: !!process.env.GOOGLE_CALENDAR_ID,
  }
  const envOk = Object.values(envCheck).every(Boolean)
  steps.push({
    step: '환경변수 확인',
    status: envOk ? 'ok' : 'fail',
    detail: JSON.stringify(envCheck),
  })

  if (!envOk) {
    return NextResponse.json({ ok: false, steps })
  }

  // 2. Google Meet 스페이스 생성 테스트
  try {
    const meetUri = await createMeetSpace()
    steps.push({
      step: 'Google Meet 스페이스 생성',
      status: meetUri ? 'ok' : 'fail',
      detail: meetUri ?? 'meetingUri가 null로 반환됨',
    })
  } catch (err: any) {
    steps.push({
      step: 'Google Meet 스페이스 생성',
      status: 'fail',
      detail: err.message ?? String(err),
    })
  }

  // 3. Google Calendar 이벤트 생성 테스트 (선택)
  let eventId: string | null = null
  try {
    const startTime = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    const result = await createMeetingEvent({
      title: '[개비공] 캘린더 연동 테스트',
      description: '테스트용 이벤트. 자동 삭제됩니다.',
      startTime,
      durationMinutes: 30,
      attendeeEmails: [],
    })
    eventId = result.eventId
    steps.push({
      step: 'Google Calendar 이벤트 생성',
      status: 'ok',
      detail: `eventId: ${result.eventId}`,
    })
  } catch (err: any) {
    steps.push({
      step: 'Google Calendar 이벤트 생성',
      status: 'fail',
      detail: err.message ?? String(err),
    })
  }

  // 4. 테스트 이벤트 삭제
  if (eventId) {
    try {
      await deleteMeetingEvent(eventId)
      steps.push({ step: '테스트 캘린더 이벤트 삭제', status: 'ok' })
    } catch {
      steps.push({ step: '테스트 캘린더 이벤트 삭제', status: 'fail', detail: '수동 삭제 필요' })
    }
  }

  const allOk = steps.every(s => s.status === 'ok')
  return NextResponse.json({ ok: allOk, steps })
}
