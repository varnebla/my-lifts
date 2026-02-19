/**
 * Composable wrapper for auth store
 * Provides a cleaner API for components to interact with authentication
 * Uses server-side authentication via API routes
 */
export function useAuth() {
  const authStore = useAuthStore()
  const { track } = useAnalytics()

  // Initialize auth on first use - fetches session from server
  const initAuth = async () => {
    await authStore.initialize()
  }

  // Login with Google OAuth - redirects to server endpoint
  const loginWithGoogle = async () => {
    try {
      const LOGIN_TOAST_FLAG = 'my-lifts:show-login-toast'
      const route = useRoute()
      const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/dashboard'

      track('auth:login_start', {
        source: 'google_oauth',
        redirect
      })

      try {
        sessionStorage.setItem(LOGIN_TOAST_FLAG, '1')
      } catch {
        // no-op: if storage is unavailable, skip login toast
      }

      // Navigate to server login endpoint
      // This will redirect to Google OAuth, then back to /api/auth/callback
      await navigateTo(`/api/auth/login?next=${encodeURIComponent(redirect)}`, { external: true })
      return { success: true }
    } catch (error) {
      console.error('Google login error:', error)
      track('auth:login_error', {
        source: 'google_oauth'
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al iniciar sesión con Google'
      }
    }
  }

  // Logout - calls server endpoint and clears local state
  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })

      track('auth:logout', {
        source: 'user_action'
      })
      
      // Clear local state
      authStore.clearAuth()
      clearUserSessionData()

      // Show logout toast
      const toast = useToast()
      toast.add({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
        icon: 'i-lucide-log-out',
        color: 'neutral'
      })

      await navigateTo('/', { replace: true })

      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      track('auth:logout_error', {
        source: 'user_action'
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al cerrar sesión'
      }
    }
  }

  return {
    // State (reactive)
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    userEmail: computed(() => authStore.userEmail),
    userAvatar: computed(() => authStore.userAvatar),
    userName: computed(() => authStore.userName),
    loading: computed(() => authStore.loading),
    initialized: computed(() => authStore.initialized),

    // Actions
    initAuth,
    loginWithGoogle,
    logout
  }
}
