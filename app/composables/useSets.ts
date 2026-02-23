import type { SetInsert, SetUpdate, SetWithExercise } from '~/types/database'

type SetMutationResult = {
  success: boolean
  error?: string
  queued?: boolean
}

function isOfflineClient() {
  return import.meta.client && !navigator.onLine
}

function shouldQueueFromError(error: unknown) {
  if (!import.meta.client) return false
  if (!navigator.onLine) return true

  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  return normalized.includes('network')
    || normalized.includes('failed to fetch')
    || normalized.includes('fetch failed')
}

/**
 * Composable for fetching sets with caching across navigation
 * Uses the same key so data is shared between pages
 */
export async function useSetsData() {
  const nuxtApp = useNuxtApp()

  const result = await useFetch<SetWithExercise[]>('/api/sets', {
    key: 'user-sets',
    default: () => [],
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    // Use cached data on client navigation (not during SSR)
    getCachedData: (key) => {
      if (import.meta.server) return undefined
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    }
  })

  // Helper to clear cache and refetch fresh data
  const refetch = async () => {
    await result.clear()
    return result.refresh()
  }

  return {
    data: result.data,
    status: result.status,
    error: result.error,
    pending: result.pending,
    refresh: result.refresh,
    clear: result.clear,
    refetch
  }
}

/**
 * Standalone mutations - for use in components that emit 'saved' and let parent refresh
 */
export function useSetActions() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const { enqueueCreateSet, enqueueUpdateSet, enqueueRemoveSet, syncPendingSets } = useOfflineSetQueue()

  async function create(data: Omit<SetInsert, 'user_id'>): Promise<SetMutationResult> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    if (isOfflineClient()) {
      enqueueCreateSet(user.value.id, data)
      return { success: true, queued: true }
    }

    try {
      const insertData: SetInsert = {
        ...data,
        user_id: user.value.id
      }

      const { error: insertError } = await supabase
        .from('sets')
        .insert(insertData)

      if (insertError) throw insertError

      await refreshNuxtData('user-sets')

      if (import.meta.client && navigator.onLine) {
        await syncPendingSets(user.value.id)
      }

      return { success: true }
    } catch (e) {
      if (shouldQueueFromError(e)) {
        enqueueCreateSet(user.value.id, data)
        return { success: true, queued: true }
      }

      console.error('Error creating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al crear registro'
      }
    }
  }

  async function update(id: string, data: SetUpdate): Promise<SetMutationResult> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    if (isOfflineClient()) {
      enqueueUpdateSet(user.value.id, id, data)
      return { success: true, queued: true }
    }

    try {
      const { error: updateError } = await supabase
        .from('sets')
        .update(data)
        .eq('id', id)

      if (updateError) throw updateError

      await refreshNuxtData('user-sets')

      if (import.meta.client && navigator.onLine) {
        await syncPendingSets(user.value.id)
      }

      return { success: true }
    } catch (e) {
      if (shouldQueueFromError(e)) {
        enqueueUpdateSet(user.value.id, id, data)
        return { success: true, queued: true }
      }

      console.error('Error updating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al actualizar registro'
      }
    }
  }

  async function remove(id: string): Promise<SetMutationResult> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    if (isOfflineClient()) {
      enqueueRemoveSet(user.value.id, id)
      return { success: true, queued: true }
    }

    try {
      const { error: deleteError } = await supabase
        .from('sets')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      if (import.meta.client && navigator.onLine) {
        await syncPendingSets(user.value.id)
      }

      return { success: true }
    } catch (e) {
      if (shouldQueueFromError(e)) {
        enqueueRemoveSet(user.value.id, id)
        return { success: true, queued: true }
      }

      console.error('Error deleting set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al eliminar registro'
      }
    }
  }

  return { create, update, remove }
}

/**
 * Mutations with local state sync - for use with useFetch data
 */
export function useSetMutations(sets: Ref<SetWithExercise[] | null>) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const { enqueueCreateSet, enqueueUpdateSet, enqueueRemoveSet, syncPendingSets } = useOfflineSetQueue()

  async function create(data: Omit<SetInsert, 'user_id'>): Promise<SetMutationResult> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    if (isOfflineClient()) {
      enqueueCreateSet(user.value.id, data)
      return { success: true, queued: true }
    }

    try {
      const insertData: SetInsert = {
        ...data,
        user_id: user.value.id
      }

      const { data: newSet, error: insertError } = await supabase
        .from('sets')
        .insert(insertData)
        .select(`
          *,
          exercise:exercises(*)
        `)
        .single()

      if (insertError) throw insertError

      // Add to local state at the beginning (most recent first)
      if (sets.value) {
        sets.value = [newSet as SetWithExercise, ...sets.value]
      }

      if (import.meta.client && navigator.onLine) {
        await syncPendingSets(user.value.id)
      }

      return { success: true }
    } catch (e) {
      if (shouldQueueFromError(e)) {
        enqueueCreateSet(user.value.id, data)
        return { success: true, queued: true }
      }

      console.error('Error creating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al crear registro'
      }
    }
  }

  async function update(id: string, data: SetUpdate): Promise<SetMutationResult> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    if (isOfflineClient()) {
      enqueueUpdateSet(user.value.id, id, data)

      if (sets.value) {
        sets.value = sets.value.map(s =>
          s.id === id ? { ...s, ...data } : s
        )
      }

      return { success: true, queued: true }
    }

    try {
      const { error: updateError } = await supabase
        .from('sets')
        .update(data)
        .eq('id', id)

      if (updateError) throw updateError

      // Update local state
      if (sets.value) {
        sets.value = sets.value.map(s =>
          s.id === id ? { ...s, ...data } : s
        )
      }

      if (import.meta.client && navigator.onLine) {
        await syncPendingSets(user.value.id)
      }

      return { success: true }
    } catch (e) {
      if (shouldQueueFromError(e)) {
        enqueueUpdateSet(user.value.id, id, data)

        if (sets.value) {
          sets.value = sets.value.map(s =>
            s.id === id ? { ...s, ...data } : s
          )
        }

        return { success: true, queued: true }
      }

      console.error('Error updating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al actualizar registro'
      }
    }
  }

  async function remove(id: string): Promise<SetMutationResult> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    if (isOfflineClient()) {
      enqueueRemoveSet(user.value.id, id)

      if (sets.value) {
        sets.value = sets.value.filter(s => s.id !== id)
      }

      return { success: true, queued: true }
    }

    try {
      const { error: deleteError } = await supabase
        .from('sets')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Remove from local state
      if (sets.value) {
        sets.value = sets.value.filter(s => s.id !== id)
      }

      if (import.meta.client && navigator.onLine) {
        await syncPendingSets(user.value.id)
      }

      return { success: true }
    } catch (e) {
      if (shouldQueueFromError(e)) {
        enqueueRemoveSet(user.value.id, id)

        if (sets.value) {
          sets.value = sets.value.filter(s => s.id !== id)
        }

        return { success: true, queued: true }
      }

      console.error('Error deleting set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al eliminar registro'
      }
    }
  }

  return {
    create,
    update,
    remove
  }
}

/**
 * Composable for fetching sets by exercise with caching
 */
export async function useExerciseSetsData(exerciseId: string) {
  const nuxtApp = useNuxtApp()

  const result = await useFetch<SetWithExercise[]>(`/api/sets/${exerciseId}`, {
    key: `exercise-sets-${exerciseId}`,
    default: () => [],
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    getCachedData: (key) => {
      if (import.meta.server) return undefined
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    }
  })

  const refetch = async () => {
    await result.clear()
    return result.refresh()
  }

  return {
    data: result.data,
    status: result.status,
    error: result.error,
    pending: result.pending,
    refresh: result.refresh,
    clear: result.clear,
    refetch
  }
}

/**
 * Composable for fetching sets by exercise slug with caching
 */
export async function useExerciseSetsBySlug(slug: string) {
  const nuxtApp = useNuxtApp()

  const result = await useFetch<SetWithExercise[]>(`/api/sets/by-exercise-slug/${slug}`, {
    key: `exercise-sets-slug-${slug}`,
    default: () => [],
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    getCachedData: (key) => {
      if (import.meta.server) return undefined
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    }
  })

  const refetch = async () => {
    await result.clear()
    return result.refresh()
  }

  return {
    data: result.data,
    status: result.status,
    error: result.error,
    pending: result.pending,
    refresh: result.refresh,
    clear: result.clear,
    refetch
  }
}
