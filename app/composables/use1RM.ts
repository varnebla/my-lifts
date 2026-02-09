/**
 * Composable for 1RM (One Rep Max) calculations
 * Uses the Epley formula: 1RM = weight × (1 + reps/30)
 * Also provides Brzycki formula as alternative
 */

export function use1RM() {
  /**
   * Calculate estimated 1RM using Epley formula
   * Best for reps > 1, most commonly used
   */
  function epley(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0
    if (reps === 1) return weight
    return Math.round(weight * (1 + reps / 30) * 10) / 10
  }

  /**
   * Calculate estimated 1RM using Brzycki formula
   * Slightly more conservative for higher reps
   */
  function brzycki(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0
    if (reps === 1) return weight
    if (reps >= 37) return weight * 2 // Avoid division by zero/negative
    return Math.round((weight * 36 / (37 - reps)) * 10) / 10
  }

  /**
   * Calculate estimated 1RM using average of Epley and Brzycki
   * Provides a balanced estimate
   */
  function calculate(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0
    if (reps === 1) return weight

    const epleyResult = epley(weight, reps)
    const brzyckiResult = brzycki(weight, reps)

    return Math.round((epleyResult + brzyckiResult) / 2 * 10) / 10
  }

  /**
   * Calculate percentage of 1RM
   */
  function percentageOf1RM(weight: number, oneRepMax: number): number {
    if (oneRepMax <= 0) return 0
    return Math.round((weight / oneRepMax) * 100)
  }

  /**
   * Estimate weight for target reps based on 1RM
   */
  function weightForReps(oneRepMax: number, targetReps: number): number {
    if (oneRepMax <= 0 || targetReps <= 0) return 0
    if (targetReps === 1) return oneRepMax
    // Inverse of Epley formula
    return Math.round((oneRepMax / (1 + targetReps / 30)) * 10) / 10
  }

  return {
    epley,
    brzycki,
    calculate,
    percentageOf1RM,
    weightForReps
  }
}
