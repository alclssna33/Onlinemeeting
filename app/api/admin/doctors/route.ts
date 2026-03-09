/**
 * GET  /api/admin/doctors — 원장 목록 (프로필 + 권한 정보)
 * PATCH /api/admin/doctors — auth_express / auth_bidding 토글
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as any
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const adminClient = createAdminClient()

  // profiles(role=doctor) + doctors 테이블 JOIN
  const { data, error } = await (adminClient
    .from('profiles')
    .select(`
      id, name, email, phone, created_at,
      doctors (
        clinic_name, specialty, open_target_date,
        auth_express, auth_bidding
      )
    `)
    .eq('role', 'doctor')
    .order('created_at', { ascending: false }) as any)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // doctors 레코드가 없는 원장도 포함 (아직 setup 안 한 경우)
  const list = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    created_at: p.created_at,
    clinic_name: p.doctors?.clinic_name ?? null,
    specialty: p.doctors?.specialty ?? null,
    open_target_date: p.doctors?.open_target_date ?? null,
    auth_express: p.doctors?.auth_express ?? false,
    auth_bidding: p.doctors?.auth_bidding ?? false,
  }))

  return NextResponse.json(list)
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { doctorId, field, value } = await req.json()
  if (!doctorId || !field) {
    return NextResponse.json({ error: 'doctorId, field 필요' }, { status: 400 })
  }
  if (!['auth_express', 'auth_bidding'].includes(field)) {
    return NextResponse.json({ error: '유효하지 않은 field' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // doctors 레코드가 없으면 먼저 생성
  const { data: existing } = await (adminClient
    .from('doctors')
    .select('id')
    .eq('id', doctorId)
    .single() as any)

  if (!existing) {
    await (adminClient.from('doctors') as any).insert({ id: doctorId })
  }

  const { error } = await ((adminClient as any)
    .from('doctors')
    .update({ [field]: value })
    .eq('id', doctorId))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
