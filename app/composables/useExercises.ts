import type { Exercise } from '~/types/database'

/**
 * Composable for fetching all exercises with SSR caching
 */
export async function useExercisesData() {
  const nuxtApp = useNuxtApp()

  const result = await useFetch<Exercise[]>('/api/exercises', {
    key: 'exercises',
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
 * Composable for fetching a single exercise by ID with SSR caching
 */
export async function useExerciseData(exerciseId: string) {
  const nuxtApp = useNuxtApp()

  const result = await useFetch<Exercise>(`/api/exercises/${exerciseId}`, {
    key: `exercise-${exerciseId}`,
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    getCachedData: (key) => {
      if (import.meta.server) return undefined
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    }
  })

  return {
    data: result.data,
    status: result.status,
    error: result.error,
    pending: result.pending
  }
}

/**
 * Composable for fetching a single exercise by slug with SSR caching
 */
export async function useExerciseBySlug(slug: string) {
  const nuxtApp = useNuxtApp()

  const result = await useFetch<Exercise>(`/api/exercises/by-slug/${slug}`, {
    key: `exercise-slug-${slug}`,
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    getCachedData: (key) => {
      if (import.meta.server) return undefined
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    }
  })

  return {
    data: result.data,
    status: result.status,
    error: result.error,
    pending: result.pending
  }
}

/**
 * Legacy composable - kept for backward compatibility with SetModal
 * Uses useState for global state shared across components
 */
export function useExercises() {
  const supabase = useSupabase()

  const exercises = useState<Exercise[]>('exercises', () => [])
  const loading = useState<boolean>('exercises-loading', () => false)
  const error = useState<string | null>('exercises-error', () => null)

  async function fetch() {
    // Skip if already loaded
    if (exercises.value.length > 0) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      exercises.value = data ?? []
    } catch (e) {
      console.error('Error fetching exercises:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar ejercicios'
    } finally {
      loading.value = false
    }
  }

  return {
    exercises,
    loading,
    error,
    fetch
  }
}
