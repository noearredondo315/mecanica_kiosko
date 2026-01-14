'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Singleton pattern to ensure we use the same client instance
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Creates a Supabase browser client for client-side operations.
 * 
 * STORAGE STRATEGY:
 * - Uses cookies by default (via @supabase/ssr createBrowserClient)
 * - This is consistent with middleware.ts which uses createServerClient with cookies
 * - Cookies are NOT httpOnly, allowing client-side access for session management
 * - Session tokens are stored in `sb-<project-ref>-auth-token` cookie
 * 
 * IMPORTANT: Both client and middleware must use the same storage strategy (cookies)
 * to prevent session desynchronization after page refresh (F5).
 */
export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}
