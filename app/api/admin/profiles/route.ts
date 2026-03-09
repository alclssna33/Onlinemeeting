/**
 * GET /api/admin/profiles
 * 아직 벤더사에 연결되지 않은 가입 유저 목록 반환 (Admin 전용)
 * 드롭다운 선택용
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as any
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const target = searchParams.get('target') // 'bidding' | null(=일반 vendor)

  const adminSupabase = createAdminClient()

  // target에 따라 이미 연결된 profile_id 목록을 다른 테이블에서 조회
  const tableName = target === 'bidding' ? 'bidding_vendors' : 'vendors'
  const { data: linked } = await (adminSupabase
    .from(tableName)
    .select('profile_id')
    .not('profile_id', 'is', null) as any)

  const linkedIds = (linked ?? []).map((v: any) => v.profile_id).filter(Boolean)

  // admin 제외, 이미 연결된 프로필 제외한 전체 가입자
  let query = adminSupabase
    .from('profiles')
    .select('id, name, email, role')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })

  if (linkedIds.length > 0) {
    query = (query as any).not('id', 'in', `(${linkedIds.join(',')})`)
  }

  const { data, error } = await (query as any)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
