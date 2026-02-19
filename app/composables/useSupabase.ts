import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

// Client-side singleton
let browserClient: SupabaseClient<Database> | null = null

export function useSupabase(): SupabaseClient<Database> {
  const config = useRuntimeConfig()

  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseAnonKey = config.public.supabaseAnonKey as string

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Check your environment variables.')
  }

  // Client-side: use browser client (automatically handles cookies)
  if (import.meta.client) {
    if (!browserClient) {
      browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    }
    return browserClient
  }

  // Server-side: create client with cookie handling
  const event = useRequestEvent()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(event?.node.req.headers.cookie ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (event?.node.res) {
            const cookieStr = serializeCookie(name, value, options)
            appendSetCookieHeader(event, cookieStr)
          }
        })
      }
    }
  })
}

function appendSetCookieHeader(event: ReturnType<typeof useRequestEvent>, cookieValue: string) {
  if (!event?.node?.res) return

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

// Helper to parse cookie header string
function parseCookieHeader(cookieHeader: string): Array<{ name: string, value: string }> {
  if (!cookieHeader) return []

  return cookieHeader.split(';').map((cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=')
    return {
      name: name || '',
      value: valueParts.join('=') || ''
    }
  }).filter(c => c.name)
}

// Helper to serialize cookie
function serializeCookie(name: string, value: string, options?: Record<string, unknown>): string {
  let cookie = `${name}=${value}`

  if (options) {
    if (options.path) cookie += `; Path=${options.path}`
    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`
    if (options.domain) cookie += `; Domain=${options.domain}`
    if (options.secure) cookie += '; Secure'
    if (options.httpOnly) cookie += '; HttpOnly'
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
  }

  return cookie
}
