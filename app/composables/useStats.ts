import type { SetWithExercise } from '~/types/database'

interface WeekStats {
  sets: number
  days: number
  volume: number
}

interface WeeklyComparison {
  current: WeekStats
  previous: WeekStats
  setsDiff: number
  daysDiff: number
  volumeDiff: number
  volumePercentChange: number | null
}

export function useStats() {
  /**
   * Get the start of a week (Monday) for a given date
   */
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    // Adjust to Monday (day 1). If Sunday (0), go back 6 days
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  /**
   * Check if a date string is within a date range
   */
  function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
    const date = new Date(dateStr + 'T00:00:00')
    return date >= start && date <= end
  }

  /**
   * Calculate stats for a given set of sets
   */
  function calculateWeekStats(sets: SetWithExercise[]): WeekStats {
    const uniqueDays = new Set(sets.map(s => s.date))
    const volume = sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

    return {
      sets: sets.length,
      days: uniqueDays.size,
      volume: Math.round(volume)
    }
  }

  /**
   * Calculate weekly stats with comparison to previous week
   */
  function calculateWeeklyComparison(allSets: SetWithExercise[]): WeeklyComparison {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Current week: from Monday of this week to today
    const currentWeekStart = getWeekStart(today)
    const currentWeekEnd = new Date(today)
    currentWeekEnd.setHours(23, 59, 59, 999)

    // Previous week: from Monday of last week to Sunday of last week
    const previousWeekStart = new Date(currentWeekStart)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    const previousWeekEnd = new Date(currentWeekStart)
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)
    previousWeekEnd.setHours(23, 59, 59, 999)

    // Filter sets for each week
    const currentWeekSets = allSets.filter(s =>
      isDateInRange(s.date, currentWeekStart, currentWeekEnd)
    )
    const previousWeekSets = allSets.filter(s =>
      isDateInRange(s.date, previousWeekStart, previousWeekEnd)
    )

    const current = calculateWeekStats(currentWeekSets)
    const previous = calculateWeekStats(previousWeekSets)

    // Calculate differences
    const setsDiff = current.sets - previous.sets
    const daysDiff = current.days - previous.days
    const volumeDiff = current.volume - previous.volume

    // Calculate percentage change for volume
    let volumePercentChange: number | null = null
    if (previous.volume > 0) {
      volumePercentChange = Math.round((volumeDiff / previous.volume) * 100)
    }

    return {
      current,
      previous,
      setsDiff,
      daysDiff,
      volumeDiff,
      volumePercentChange
    }
  }

  /**
   * Filter sets to only include those from the last N days
   */
  function filterLastNDays(sets: SetWithExercise[], days: number): SetWithExercise[] {
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - days)
    cutoff.setHours(0, 0, 0, 0)

    return sets.filter((s) => {
      const setDate = new Date(s.date + 'T00:00:00')
      return setDate >= cutoff
    })
  }

  /**
   * Format volume for display (e.g., 2450 -> "2.4k")
   */
  function formatVolume(volume: number): { value: string, unit: string } {
    if (volume >= 1000) {
      return {
        value: (volume / 1000).toFixed(1).replace(/\.0$/, ''),
        unit: 'k kg'
      }
    }
    return {
      value: volume.toString(),
      unit: 'kg'
    }
  }

  return {
    calculateWeeklyComparison,
    filterLastNDays,
    formatVolume
  }
}
