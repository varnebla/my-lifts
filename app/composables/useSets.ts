import type { SetInsert, SetUpdate, SetWithExercise } from '~/types/database'

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

  async function create(data: Omit<SetInsert, 'user_id'>): Promise<{ success: boolean, error?: string }> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
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

      return { success: true }
    } catch (e) {
      console.error('Error creating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al crear registro'
      }
    }
  }

  async function update(id: string, data: SetUpdate): Promise<{ success: boolean, error?: string }> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    try {
      const { error: updateError } = await supabase
        .from('sets')
        .update(data)
        .eq('id', id)

      if (updateError) throw updateError

      await refreshNuxtData('user-sets')

      return { success: true }
    } catch (e) {
      console.error('Error updating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al actualizar registro'
      }
    }
  }

  async function remove(id: string): Promise<{ success: boolean, error?: string }> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
    }

    try {
      const { error: deleteError } = await supabase
        .from('sets')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      return { success: true }
    } catch (e) {
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

  async function create(data: Omit<SetInsert, 'user_id'>): Promise<{ success: boolean, error?: string }> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
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

      return { success: true }
    } catch (e) {
      console.error('Error creating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al crear registro'
      }
    }
  }

  async function update(id: string, data: SetUpdate): Promise<{ success: boolean, error?: string }> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
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

      return { success: true }
    } catch (e) {
      console.error('Error updating set:', e)
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al actualizar registro'
      }
    }
  }

  async function remove(id: string): Promise<{ success: boolean, error?: string }> {
    if (!user.value) {
      return { success: false, error: 'No autenticado' }
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

      return { success: true }
    } catch (e) {
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
