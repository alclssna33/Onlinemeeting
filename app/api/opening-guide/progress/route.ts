/**
 * GET  /api/opening-guide/progress  → 현재 원장의 완료 step 목록 반환
 * PATCH /api/opening-guide/progress → completed_steps 배열 전체 업서트
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await ((supabase as any)
    .from('doctor_guide_progress')
    .select('completed_steps')
    .eq('profile_id', user.id)
    .maybeSingle())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ completed_steps: (data?.completed_steps as number[]) ?? [] })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { completed_steps } = await req.json()
  if (!Array.isArray(completed_steps)) {
    return NextResponse.json({ error: 'completed_steps 배열 필요' }, { status: 400 })
  }

  const { error } = await ((supabase as any)
    .from('doctor_guide_progress')
    .upsert({ profile_id: user.id, completed_steps }, { onConflict: 'profile_id' }))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
