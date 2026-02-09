/**
 * Initiates Google OAuth flow
 * GET /api/auth/login
 */
export default defineEventHandler(async (event) => {
  const supabase = getServerSupabase(event)
  const requestUrl = getRequestURL(event)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${requestUrl.origin}/api/auth/callback`
    }
  })

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Error iniciando sesión con Google'
    })
  }

  // Redirect to Google OAuth
  return sendRedirect(event, data.url)
})
