/**
 * Client plugin to sync pending offline set mutations when connectivity/session is available.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  const { syncPendingSets, refreshPendingSetCount } = useOfflineSetQueue()

  const syncForCurrentUser = async () => {
    const userId = authStore.user?.id
    if (!userId) {
      refreshPendingSetCount()
      return
    }

    refreshPendingSetCount(userId)

    if (!navigator.onLine) return

    await syncPendingSets(userId)
  }

  const onOnline = () => {
    void syncForCurrentUser()
  }

  const stopWatchingUser = watch(
    () => authStore.user?.id,
    () => {
      void syncForCurrentUser()
    },
    { immediate: true }
  )

  window.addEventListener('online', onOnline)

  onScopeDispose(() => {
    stopWatchingUser()
    window.removeEventListener('online', onOnline)
  })
})
