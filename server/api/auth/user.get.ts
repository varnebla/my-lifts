/**
 * Get current user session
 * GET /api/auth/user
 */
export default defineEventHandler(async (event) => {
  const supabase = getServerSupabase(event)

  // Use getUser() to validate the session with Supabase Auth server
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      avatar: user.user_metadata?.avatar_url,
      name: user.user_metadata?.full_name
    }
  }
})
