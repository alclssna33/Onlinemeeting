import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return createAdminClient()
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('category_id')

  // vendors 기본 조회
  let query = (supabase.from('vendors') as any).select('*').order('company_name')
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data: vendors, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // profile_id가 있는 항목에 대해 profiles 정보를 별도로 조회해 합산
  const profileIds = (vendors ?? [])
    .map((v: any) => v.profile_id)
    .filter(Boolean)

  let profileMap: Record<string, { name: string; email: string }> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await (supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', profileIds) as any)
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, { name: p.name, email: p.email }]))
    }
  }

  const result = (vendors ?? []).map((v: any) => ({
    ...v,
    linked_profile: v.profile_id ? (profileMap[v.profile_id] ?? null) : null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await (supabase.from('vendors') as any).insert({
    company_name: body.company_name,
    rep_name: body.rep_name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    category_id: body.category_id,
    description: body.description ?? null,
    website: body.website ?? null,
    is_active: true,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, linked_profile, created_at, ...updates } = body
  const { data, error } = await (supabase.from('vendors') as any).update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { id } = await req.json()
  const { error } = await (supabase.from('vendors') as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
