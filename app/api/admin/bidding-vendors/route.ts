/**
 * GET    /api/admin/bidding-vendors  — 비딩 벤더 목록
 * POST   /api/admin/bidding-vendors  — 비딩 벤더 추가
 * PATCH  /api/admin/bidding-vendors  — 비딩 벤더 수정
 * DELETE /api/admin/bidding-vendors  — 비딩 벤더 삭제
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as any
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const adminClient = createAdminClient()
  const ac = adminClient as any

  const { data, error } = await ac
    .from('bidding_vendors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // profile_id가 있으면 프로필 정보 함께 조회
  const profileIds = (data ?? [])
    .map((v: any) => v.profile_id)
    .filter(Boolean)

  let profileMap: Record<string, { name: string; email: string }> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await (adminClient
      .from('profiles')
      .select('id, name, email')
      .in('id', profileIds) as any)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { name: p.name, email: p.email }
    }
  }

  const result = (data ?? []).map((v: any) => ({
    ...v,
    linked_profile: v.profile_id ? (profileMap[v.profile_id] ?? null) : null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  if (!body.company_name) {
    return NextResponse.json({ error: '업체명 필수' }, { status: 400 })
  }

  const ac = createAdminClient() as any
  const { data, error } = await ac
    .from('bidding_vendors')
    .insert({
      company_name: body.company_name,
      rep_name: body.rep_name || null,
      email: body.email || null,
      phone: body.phone || null,
      description: body.description || null,
      website: body.website || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const ac = createAdminClient() as any
  const { error } = await ac
    .from('bidding_vendors')
    .update({
      company_name: body.company_name,
      rep_name: body.rep_name || null,
      email: body.email || null,
      phone: body.phone || null,
      description: body.description || null,
      website: body.website || null,
      is_active: body.is_active ?? true,
    })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const ac = createAdminClient() as any
  const { error } = await ac
    .from('bidding_vendors')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
