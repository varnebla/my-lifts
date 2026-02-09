/**
 * OAuth callback endpoint
 * Supabase redirects here after successful authentication
 * GET /api/auth/callback
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  
  if (!code) {
    return sendRedirect(event, '/?error=no_code')
  }

  const supabase = getServerSupabase(event)

  // Exchange code for session - Supabase will set cookies automatically
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[Auth] Callback error:', error)
    return sendRedirect(event, '/?error=auth_failed')
  }

  // Redirect to home - session is now active
  return sendRedirect(event, '/')
})
