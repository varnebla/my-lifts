import type { SetWithExercise, Exercise } from '~/types/database'

export interface ExercisePR {
  exercise: Exercise
  /** Most recent set for this exercise */
  latestSet: SetWithExercise
  /** Estimated 1RM from the latest set - main reference for training */
  current1RM: number
  /** All-time best estimated 1RM (only set if higher than current) */
  allTimeBest1RM?: number
  /** The set that achieved the all-time best (only set if higher than current) */
  allTimeBestSet?: SetWithExercise
}

/**
 * Composable to calculate Personal Records (PRs) from sets
 */
export function usePRs() {
  const { calculate } = use1RM()

  function sortByLatestSet(prs: ExercisePR[]): ExercisePR[] {
    return [...prs].sort((a, b) => {
      const dateCompare = b.latestSet.date.localeCompare(a.latestSet.date)
      if (dateCompare !== 0) return dateCompare
      return b.latestSet.created_at.localeCompare(a.latestSet.created_at)
    })
  }

  /**
   * Calculate current (latest) 1RM for each exercise, with optional all-time best
   */
  function calculatePRs(sets: SetWithExercise[]): ExercisePR[] {
    // Group sets by exercise
    const setsByExercise = new Map<string, SetWithExercise[]>()

    for (const set of sets) {
      const existing = setsByExercise.get(set.exercise_id) ?? []
      existing.push(set)
      setsByExercise.set(set.exercise_id, existing)
    }

    const results: ExercisePR[] = []

    for (const [, exerciseSets] of setsByExercise) {
      // Sort by date desc, then created_at desc to get the latest
      const sorted = [...exerciseSets].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        return b.created_at.localeCompare(a.created_at)
      })

      const latestSet = sorted[0]
      if (!latestSet) continue

      const current1RM = calculate(latestSet.weight_kg, latestSet.reps)

      // Find all-time best
      let allTimeBest1RM = current1RM
      let allTimeBestSet = latestSet

      for (const set of exerciseSets) {
        const estimated = calculate(set.weight_kg, set.reps)
        if (estimated > allTimeBest1RM) {
          allTimeBest1RM = estimated
          allTimeBestSet = set
        }
      }

      const pr: ExercisePR = {
        exercise: latestSet.exercise,
        latestSet,
        current1RM
      }

      // Only include all-time best if it's higher than current
      if (allTimeBest1RM > current1RM) {
        pr.allTimeBest1RM = allTimeBest1RM
        pr.allTimeBestSet = allTimeBestSet
      }

      results.push(pr)
    }

    // Sort by exercise name
    return results.sort((a, b) =>
      a.exercise.name.localeCompare(b.exercise.name)
    )
  }

  /**
   * Check if a set is a new PR compared to existing sets
   */
  function isNewPR(newSet: SetWithExercise, existingSets: SetWithExercise[]): boolean {
    const new1RM = calculate(newSet.weight_kg, newSet.reps)

    const existingPR = existingSets
      .filter(s => s.exercise_id === newSet.exercise_id && s.id !== newSet.id)
      .reduce((max, set) => {
        const estimated = calculate(set.weight_kg, set.reps)
        return estimated > max ? estimated : max
      }, 0)

    return new1RM > existingPR
  }

  return {
    calculatePRs,
    sortByLatestSet,
    isNewPR
  }
}
