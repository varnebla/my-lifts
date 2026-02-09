import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'
import type { Database } from '~/types/database'

/**
 * Creates a Supabase server client for server routes
 * Handles cookies automatically via H3 event
 */
export function getServerSupabase(event: H3Event) {
  const config = useRuntimeConfig()

  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseAnonKey = config.public.supabaseAnonKey as string

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = getHeader(event, 'cookie') ?? ''
        return parseCookies(cookieHeader)
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(event, name, value, options)
        })
      }
    }
  })
}

// Helper to parse cookie header
function parseCookies(cookieHeader: string): Array<{ name: string, value: string }> {
  if (!cookieHeader) return []

  return cookieHeader.split(';').map((cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=')
    return {
      name: name || '',
      value: valueParts.join('=') || ''
    }
  }).filter(c => c.name)
}
