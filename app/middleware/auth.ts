/**
 * Auth middleware to protect routes
 * Apply to routes that require authentication using:
 * definePageMeta({ middleware: 'auth' })
 *
 * The server plugin already initialized auth, so we just check the state
 */
export default defineNuxtRouteMiddleware(async (_to) => {
  const authStore = useAuthStore()

  // On client, ensure auth is initialized
  // (Server plugin already ran on SSR)
  if (import.meta.client && !authStore.initialized) {
    await authStore.initialize()
  }

  // If not authenticated, open login modal and stay on current page
  if (!authStore.isAuthenticated) {
    if (import.meta.client) {
      const { open } = useLoginModal()
      setTimeout(() => {
        open()
      }, 100)
    }
  }
})