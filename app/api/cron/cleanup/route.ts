/**
 * GET /api/cron/cleanup
 * 7일 이상 지난 미팅 자동 삭제
 * - 확정 미팅: confirmed_time 기준 7일 경과 시 삭제
 * - 그 외 (대기/거절/취소): created_at 기준 7일 경과 시 삭제
 *
 * Vercel Cron으로 매일 자정 실행 (vercel.json 설정)
 * 로컬 테스트: GET /api/cron/cleanup?secret=CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  // 보안: Vercel Cron 헤더 또는 secret 파라미터로 인증
  const authHeader = req.headers.get('authorization')
  const secret = req.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const isVercelCron = authHeader === `Bearer ${cronSecret}`
    const isManual = secret === cronSecret
    if (!isVercelCron && !isManual) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
  }

  const adminClient = createAdminClient()
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 확정 미팅: confirmed_time 기준
  const { count: confirmedCount, error: e1 } = await (adminClient
    .from('meeting_requests')
    .delete({ count: 'exact' })
    .eq('status', 'confirmed')
    .lt('confirmed_time', cutoff) as any)

  // 그 외(대기/거절/취소): created_at 기준
  const { count: otherCount, error: e2 } = await (adminClient
    .from('meeting_requests')
    .delete({ count: 'exact' })
    .in('status', ['pending', 'rejected', 'cancelled'])
    .lt('created_at', cutoff) as any)

  if (e1 || e2) {
    console.error('[cron/cleanup]', e1 ?? e2)
    return NextResponse.json({ error: '삭제 중 오류 발생' }, { status: 500 })
  }

  const total = (confirmedCount ?? 0) + (otherCount ?? 0)
  console.log(`[cron/cleanup] 삭제 완료: 확정 ${confirmedCount}건, 기타 ${otherCount}건`)

  return NextResponse.json({
    ok: true,
    deleted: { confirmed: confirmedCount ?? 0, other: otherCount ?? 0, total },
    cutoff,
  })
}
