/**
 * Composable wrapper for auth store
 * Provides a cleaner API for components to interact with authentication
 * Uses server-side authentication via API routes
 */
export function useAuth() {
  const authStore = useAuthStore()

  // Initialize auth on first use - fetches session from server
  const initAuth = async () => {
    await authStore.initialize()
  }

  // Login with Google OAuth - redirects to server endpoint
  const loginWithGoogle = async () => {
    try {
      const route = useRoute()
      const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/dashboard'

      // Navigate to server login endpoint
      // This will redirect to Google OAuth, then back to /api/auth/callback
      await navigateTo(`/api/auth/login?next=${encodeURIComponent(redirect)}`, { external: true })
      return { success: true }
    } catch (error) {
      console.error('Google login error:', error)
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
