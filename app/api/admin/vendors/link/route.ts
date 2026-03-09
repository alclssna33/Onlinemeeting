/**
 * POST /api/admin/vendors/link
 * Admin이 특정 벤더사에 가입한 유저 계정을 연결
 * Body: { vendorId, userEmail }
 * → profiles.role = 'vendor' 변경
 * → vendors.profile_id = profile.id 연결
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Admin 권한 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single() as any
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    const { vendorId, userEmail } = await req.json()
    if (!vendorId || !userEmail) {
      return NextResponse.json({ error: 'vendorId, userEmail 필요' }, { status: 400 })
    }

    // 서비스 롤 클라이언트 (RLS 우회)
    const adminSupabase = createAdminClient()

    // 이메일로 가입된 유저 프로필 조회
    const { data: targetProfile } = await (adminSupabase
      .from('profiles')
      .select('id, name, role, email')
      .eq('email', userEmail)
      .single() as any)

    if (!targetProfile) {
      return NextResponse.json({ error: '해당 이메일로 가입된 유저가 없습니다.' }, { status: 404 })
    }

    // 1. profiles.role → vendor로 변경
    const { error: roleError } = await (adminSupabase as any)
      .from('profiles')
      .update({ role: 'vendor' })
      .eq('id', targetProfile.id)
    if (roleError) throw roleError

    // 2. vendors.profile_id 연결
    const { error: linkError } = await (adminSupabase as any)
      .from('vendors')
      .update({ profile_id: targetProfile.id })
      .eq('id', vendorId)
    if (linkError) throw linkError

    return NextResponse.json({ ok: true, linked: { name: targetProfile.name, email: targetProfile.email } })
  } catch (err: any) {
    console.error('[vendors/link]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/vendors/link
 * 계정 연결 해제
 * Body: { vendorId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single() as any
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    const { vendorId } = await req.json()
    const adminSupabase = createAdminClient()

    // profile_id 조회 후 role을 doctor로 복원
    const { data: vendor } = await (adminSupabase
      .from('vendors').select('profile_id').eq('id', vendorId).single() as any)

    if (vendor?.profile_id) {
      // 비딩 벤더로도 연결되어 있으면 role 유지 (접근 권한 보호)
      const { data: biddingLink } = await (adminSupabase
        .from('bidding_vendors')
        .select('id')
        .eq('profile_id', vendor.profile_id)
        .limit(1) as any)
      if (!biddingLink?.length) {
        await (adminSupabase as any)
          .from('profiles')
          .update({ role: 'doctor' })
          .eq('id', vendor.profile_id)
      }
    }

    await (adminSupabase as any)
      .from('vendors')
      .update({ profile_id: null })
      .eq('id', vendorId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
