/**
 * POST /api/meetings/select
 * 원장이 확정된 미팅 중 한 업체를 최종 선정
 * → 선정 업체: selection_status = 'selected'
 * → 같은 단계의 다른 업체: selection_status = 'eliminated'
 * → 각 벤더사에 이메일 알림
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyVendorSelected, notifyVendorEliminated } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json()
    if (!requestId) return NextResponse.json({ error: 'requestId 필요' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single() as any
    if (profile?.role !== 'doctor' && profile?.role !== 'admin') {
      return NextResponse.json({ error: '원장 권한 필요' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // 선정 대상 미팅 조회
    const { data: selected, error: selErr } = await (adminClient
      .from('meeting_requests')
      .select('id, doctor_id, stage_id, vendor_id, status, meet_link, selection_status')
      .eq('id', requestId)
      .single() as any)

    if (selErr || !selected) {
      return NextResponse.json({ error: '미팅을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (selected.doctor_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    if (selected.status !== 'confirmed') {
      return NextResponse.json({ error: '확정된 미팅만 선정할 수 있습니다.' }, { status: 409 })
    }
    if (selected.selection_status === 'selected') {
      return NextResponse.json({ ok: true }) // 이미 선정됨, 중복 처리
    }

    // 같은 doctor + stage의 다른 업체 미팅 조회
    // - 선정된 미팅(requestId) 제외
    // - 선정된 vendor_id 제외 (같은 업체의 이전 rejected 미팅 등 중복 방지)
    // - rejected/cancelled 제외 (Supabase 문법: 괄호 안 따옴표 없이)
    const { data: others } = await (adminClient
      .from('meeting_requests')
      .select('id, vendor_id')
      .eq('doctor_id', selected.doctor_id)
      .eq('stage_id', selected.stage_id)
      .neq('id', requestId)
      .neq('vendor_id', selected.vendor_id)
      .not('status', 'in', '(rejected,cancelled)') as any)

    // 선정 미팅 업데이트
    await (adminClient as any)
      .from('meeting_requests')
      .update({ selection_status: 'selected' })
      .eq('id', requestId)

    // 나머지 탈락 처리 — vendor당 중복 제거
    const seenVendors = new Set<string>()
    const uniqueOthers = (others ?? []).filter((m: any) => {
      if (seenVendors.has(m.vendor_id)) return false
      seenVendors.add(m.vendor_id)
      return true
    })
    const eliminatedIds = uniqueOthers.map((m: any) => m.id)

    if (eliminatedIds.length > 0) {
      // 해당 vendor의 모든 미팅을 eliminated로 (이전 rejected 미팅 포함)
      const eliminatedVendorIds = uniqueOthers.map((m: any) => m.vendor_id)
      await (adminClient as any)
        .from('meeting_requests')
        .update({ selection_status: 'eliminated' })
        .eq('doctor_id', selected.doctor_id)
        .eq('stage_id', selected.stage_id)
        .in('vendor_id', eliminatedVendorIds)
        .neq('id', requestId)
    }

    // 부가 정보 조회 (원장 이름+전화번호, 단계명, 선정 업체)
    const [stageRes, doctorRes, selectedVendorRes] = await Promise.all([
      adminClient.from('stages').select('name').eq('id', selected.stage_id).single() as any,
      adminClient.from('profiles').select('name, phone').eq('id', selected.doctor_id).single() as any,
      adminClient.from('vendors').select('company_name, email').eq('id', selected.vendor_id).single() as any,
    ])

    const stageName = stageRes.data?.name ?? ''
    const doctorName = doctorRes.data?.name ?? '원장님'
    const doctorPhone = doctorRes.data?.phone ?? null
    const selectedVendor = selectedVendorRes.data

    // 선정 업체 이메일
    if (selectedVendor?.email) {
      notifyVendorSelected({
        vendorEmail: selectedVendor.email,
        vendorName: selectedVendor.company_name,
        doctorName,
        doctorPhone,
        stageName,
        meetLink: selected.meet_link,
      }).catch(err => console.error('[select] 선정 이메일 실패:', err))
    }

    // 탈락 업체 이메일 — vendor당 1통만 발송
    if (uniqueOthers.length > 0) {
      const { data: eliminatedVendors } = await (adminClient
        .from('vendors')
        .select('company_name, email')
        .in('id', uniqueOthers.map((m: any) => m.vendor_id)) as any)

      for (const v of eliminatedVendors ?? []) {
        if (v?.email) {
          notifyVendorEliminated({
            vendorEmail: v.email,
            vendorName: v.company_name,
            doctorName,
            stageName,
          }).catch(err => console.error('[select] 탈락 이메일 실패:', err))
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[select]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
