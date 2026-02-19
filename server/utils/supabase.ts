import { createServerClient } from '@supabase/ssr'
import { getHeader } from 'h3'
import type { H3Event } from 'h3'
import { serialize } from 'cookie-es'
import type { CookieSerializeOptions } from 'cookie-es'
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
          const cookieStr = serialize(name, value, options as CookieSerializeOptions)
          appendSetCookieHeader(event, cookieStr)
        })
      }
    }
  })
}

function appendSetCookieHeader(event: H3Event, cookieValue: string) {
  const current = event.node.res.getHeader('Set-Cookie')

  if (!current) {
    event.node.res.setHeader('Set-Cookie', cookieValue)
    return
  }

  const currentList = Array.isArray(current)
    ? current.map(value => String(value))
    : [String(current)]

  event.node.res.setHeader('Set-Cookie', [...currentList, cookieValue])
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
