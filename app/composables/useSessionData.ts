/**
 * Clear user-scoped cached data/state after logout or session loss.
 */
export function clearUserSessionData() {
  clearNuxtData((key) => {
    if (typeof key !== 'string') return false

    return key === 'user-sets'
      || key.startsWith('exercise-sets-')
      || key.startsWith('exercise-sets-slug-')
  })

  const exercises = useState('exercises', () => [])
  const exercisesLoading = useState('exercises-loading', () => false)
  const exercisesError = useState<string | null>('exercises-error', () => null)

  exercises.value = []
  exercisesLoading.value = false
  exercisesError.value = null
}
