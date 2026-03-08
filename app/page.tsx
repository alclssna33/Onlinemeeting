import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown }

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      doctor: '/doctor',
      vendor: '/vendor',
    }
    redirect(redirectMap[profile?.role ?? 'doctor'])
  }

  return (
    <main className="gradient-bg min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            개비공
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            개원비밀공간 — 온라인 미팅 시스템
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full py-3 px-6 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--brand-primary)' }}
        >
          로그인 / 시작하기
        </Link>

        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          v2.0 — Next.js + Supabase
        </p>
      </div>
    </main>
  )
}
