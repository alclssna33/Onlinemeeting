/**
 * POST   /api/admin/bidding-vendors/link  — 비딩벤더 ↔ 프로필 연결
 * DELETE /api/admin/bidding-vendors/link  — 연결 해제
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

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { biddingVendorId, userEmail } = await req.json()
  if (!biddingVendorId || !userEmail) {
    return NextResponse.json({ error: 'biddingVendorId, userEmail 필수' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const ac = adminClient as any

  // 이메일로 프로필 조회
  const { data: profile } = await (ac
    .from('profiles')
    .select('id, role')
    .eq('email', userEmail.trim())
    .single())

  if (!profile) {
    return NextResponse.json({ error: '해당 이메일로 가입한 계정이 없습니다.' }, { status: 404 })
  }

  // profile role을 vendor로 변경
  await ac.from('profiles').update({ role: 'vendor' }).eq('id', profile.id)

  // 비딩벤더에 profile_id 연결
  const { error } = await ac
    .from('bidding_vendors')
    .update({ profile_id: profile.id })
    .eq('id', biddingVendorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { biddingVendorId } = await req.json()
  if (!biddingVendorId) {
    return NextResponse.json({ error: 'biddingVendorId 필수' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const ac = adminClient as any

  // 현재 연결된 profile_id 조회
  const { data: bv } = await (ac
    .from('bidding_vendors')
    .select('profile_id')
    .eq('id', biddingVendorId)
    .single())

  if (bv?.profile_id) {
    // 일반 vendors에 연결이 없을 경우 role을 doctor로 복원
    const { data: otherLinks } = await (adminClient
      .from('vendors')
      .select('id')
      .eq('profile_id', bv.profile_id)
      .limit(1) as any)
    if (!otherLinks?.length) {
      await ac.from('profiles').update({ role: 'doctor' }).eq('id', bv.profile_id)
    }
  }

  const { error } = await ac
    .from('bidding_vendors')
    .update({ profile_id: null })
    .eq('id', biddingVendorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
