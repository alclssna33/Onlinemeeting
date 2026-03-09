/**
 * GET    /api/admin/doctor-bidding?doctorId=xxx  — 원장의 회차별 배정 현황
 * POST   /api/admin/doctor-bidding               — 벤더 배정
 * DELETE /api/admin/doctor-bidding               — 배정 해제
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

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const doctorId = req.nextUrl.searchParams.get('doctorId')
  if (!doctorId) return NextResponse.json({ error: 'doctorId 필수' }, { status: 400 })

  const ac = createAdminClient() as any
  const { data, error } = await ac
    .from('doctor_bidding_vendors')
    .select('id, bidding_vendor_id, bidding_round')
    .eq('doctor_id', doctorId)
    .order('bidding_round')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { doctorId, biddingVendorId, biddingRound } = await req.json()
  if (!doctorId || !biddingVendorId || !biddingRound) {
    return NextResponse.json({ error: 'doctorId, biddingVendorId, biddingRound 필수' }, { status: 400 })
  }

  const ac = createAdminClient() as any
  const { error } = await ac
    .from('doctor_bidding_vendors')
    .upsert({
      doctor_id: doctorId,
      bidding_vendor_id: biddingVendorId,
      bidding_round: biddingRound,
    }, { onConflict: 'doctor_id,bidding_vendor_id,bidding_round' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { doctorId, biddingVendorId, biddingRound } = await req.json()
  if (!doctorId || !biddingVendorId || !biddingRound) {
    return NextResponse.json({ error: 'doctorId, biddingVendorId, biddingRound 필수' }, { status: 400 })
  }

  const ac = createAdminClient() as any
  const { error } = await ac
    .from('doctor_bidding_vendors')
    .delete()
    .eq('doctor_id', doctorId)
    .eq('bidding_vendor_id', biddingVendorId)
    .eq('bidding_round', biddingRound)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
