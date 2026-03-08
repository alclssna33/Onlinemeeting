import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DoctorDashboard from './DoctorDashboard'

export default async function DoctorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string } | null; error: unknown }

  if (!profile) redirect('/login')
  if (profile.role !== 'doctor' && profile.role !== 'admin') redirect('/login')

  // 개원 단계 목록
  const { data: stages } = await supabase
    .from('stages')
    .select('id, name, color, icon')
    .order('order_index')

  // 전체 벤더사
  const { data: vendorsRaw } = await (supabase
    .from('vendors') as any)
    .select('id, company_name, rep_name, description, website, category_id, email, phone')
    .eq('is_active', true)

  const vendors: any[] = vendorsRaw ?? []

  // stage_id 기준으로 벤더사 그룹핑
  const vendorsByStage: Record<number, any[]> = {}
  for (const v of vendors) {
    if (!vendorsByStage[v.category_id]) vendorsByStage[v.category_id] = []
    vendorsByStage[v.category_id].push(v)
  }

  // 내 미팅 목록
  const { data: meetingsRaw } = await (supabase
    .from('meeting_requests')
    .select(`
      id, status, proposed_times, confirmed_time, meet_link, note, vendor_note, created_at,
      stage:stages(name, color),
      vendor:vendors(company_name, rep_name)
    `)
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false }) as any)

  const meetings = ((meetingsRaw as any[]) ?? []).map((m: any) => ({
    ...m,
    stage: Array.isArray(m.stage) ? m.stage[0] : m.stage,
    vendor: Array.isArray(m.vendor) ? m.vendor[0] : m.vendor,
  }))

  return (
    <main className="gradient-bg min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <DoctorDashboard
          stages={(stages ?? []) as any}
          vendorsByStage={vendorsByStage as any}
          doctorId={user.id}
          doctorName={profile.name}
          meetings={meetings as any}
        />
      </div>
    </main>
  )
}
