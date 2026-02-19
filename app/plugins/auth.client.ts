/**
 * Client-side auth plugin
 * Handles auth state changes (login/logout/session loss)
 */
export default defineNuxtPlugin(() => {
  const supabase = useSupabase()
  const authStore = useAuthStore()
  const { close } = useLoginModal()
  const { track } = useAnalytics()
  const toast = useToast()
  const LOGIN_TOAST_FLAG = 'my-lifts:show-login-toast'

  const showWelcomeToast = (name: string) => {
    toast.add({
      title: 'Sesión iniciada',
      description: `Bienvenido, ${name}`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  }

  const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      authStore.setUser(session.user)
      close()

      if (event === 'SIGNED_IN') {
        let shouldShowToast = false

        try {
          shouldShowToast = sessionStorage.getItem(LOGIN_TOAST_FLAG) === '1'
          if (shouldShowToast) {
            sessionStorage.removeItem(LOGIN_TOAST_FLAG)
          }
        } catch {
          shouldShowToast = false
        }

        if (shouldShowToast) {
          track('auth:login_success', {
            source: 'google_oauth'
          })

          const userName = session.user.user_metadata?.full_name ?? session.user.email
          if (userName) {
            showWelcomeToast(userName)
          }
        }
      }

      return
    }

    if (event !== 'SIGNED_IN') {
      authStore.clearAuth()
      clearUserSessionData()

      navigateTo('/', { replace: true })
    }
  })

  onScopeDispose(() => {
    authSubscription.subscription.unsubscribe()
  })
})
