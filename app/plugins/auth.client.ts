/**
 * Client-side auth plugin
 * Handles post-login actions (close modal, show toast)
 */
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const route = useRoute()

  // Check if we just came back from OAuth callback
  if (route.path === '/' && authStore.isAuthenticated) {
    // Close login modal if open
    const { close } = useLoginModal()
    close()

    // Show welcome toast
    const toast = useToast()
    const userName = authStore.userName || authStore.userEmail

    if (userName) {
      toast.add({
        title: 'Sesión iniciada',
        description: `Bienvenido, ${userName}`,
        icon: 'i-lucide-check-circle',
        color: 'success'
      })
    }
  }
})
