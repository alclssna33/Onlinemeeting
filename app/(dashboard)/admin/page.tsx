import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/login')

  return (
    <main className="gradient-bg min-h-screen p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <AdminPanel />
      </div>
    </main>
  )
}
