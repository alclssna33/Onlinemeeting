/**
 * GET  /api/admin/settings        — 전체 설정 조회
 * PATCH /api/admin/settings       — 설정 업데이트
 * Body: { key: string, value: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as any
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await (admin.from('app_settings').select('key, value') as any)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // key-value 객체로 변환
  const settings: Record<string, string> = {}
  for (const row of (data ?? [])) settings[row.key] = row.value

  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { key, value } = await req.json()
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key, value 필요' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await ((admin as any)
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
