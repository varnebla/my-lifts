/**
 * Auth middleware to protect routes
 * Apply to routes that require authentication using:
 * definePageMeta({ middleware: 'auth' })
 *
 * The server plugin already initialized auth, so we just check the state
 */
export default defineNuxtRouteMiddleware(async (_to) => {
  const authStore = useAuthStore()

  // On client, always revalidate auth state to detect lost/expired sessions
  // (Server plugin already ran on SSR)
  if (import.meta.client) {
    await authStore.initialize(true)
  }

  // Hard-gate private routes: redirect to home and request login modal
  if (!authStore.isAuthenticated) {
    return navigateTo({
      path: '/',
      query: {
        login: '1',
        redirect: _to.fullPath
      }
    }, { replace: true })
  }
})