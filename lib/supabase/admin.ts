/**
 * Supabase 서비스 롤 클라이언트 (RLS 우회 — 서버 전용)
 * Admin API에서만 사용할 것
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
