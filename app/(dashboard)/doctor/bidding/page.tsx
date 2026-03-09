import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DoctorBiddingBoard from './DoctorBiddingBoard'

export default async function DoctorBiddingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, name').eq('id', user.id).single() as any

  if (!profile || (profile.role !== 'doctor' && profile.role !== 'admin')) redirect('/login')

  const { data: doctorAuth } = await (supabase
    .from('doctors').select('auth_bidding').eq('id', user.id).single() as any)

  if (!doctorAuth?.auth_bidding && profile.role !== 'admin') {
    redirect('/doctor')
  }

  return (
    <main className="gradient-bg min-h-screen p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <DoctorBiddingBoard doctorId={user.id} doctorName={profile.name} />
      </div>
    </main>
  )
}
