import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VendorBiddingBoard from './VendorBiddingBoard'

export default async function VendorBiddingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, name').eq('id', user.id).single() as any

  if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) redirect('/login')

  const adminClient = createAdminClient()

  // 비딩 벤더 확인
  const { data: bv } = await (adminClient
    .from('bidding_vendors')
    .select('id, company_name, is_active')
    .eq('profile_id', user.id)
    .single() as any)

  if (!bv) {
    return (
      <main className="gradient-bg min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              비딩 계정 연결 필요
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              비딩 벤더 계정이 연결되지 않았습니다.<br />
              관리자에게 계정 연결을 요청해주세요.
            </p>
            <a href="/vendor" className="mt-4 inline-block text-sm px-4 py-2 rounded-xl"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
              ← 인박스로
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="gradient-bg min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <VendorBiddingBoard vendorId={bv.id} vendorName={bv.company_name} />
      </div>
    </main>
  )
}
