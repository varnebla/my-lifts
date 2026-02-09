/**
 * Server-side auth plugin
 * Initializes user session on server during SSR
 * Runs on every request to populate auth state
 */
export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  try {
    // Use getUser() to validate with Supabase Auth server (more secure than getSession)
    const supabase = useSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (!error && user) {
      authStore.setUser(user)
    }
  } catch (error) {
    console.error('[Auth Plugin] Server error:', error)
  }
})
