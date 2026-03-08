import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await (supabase.from('stages') as any).select('*').order('order_index')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await (supabase.from('stages') as any).insert({
    name: body.name,
    description: body.description ?? null,
    order_index: body.order_index ?? 99,
    color: body.color ?? '#16a34a',
    icon: body.icon ?? 'building-2',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await (supabase.from('stages') as any).update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { id } = await req.json()
  const { error } = await (supabase.from('stages') as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
