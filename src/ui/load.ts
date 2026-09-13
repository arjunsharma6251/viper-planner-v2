/** Penn's load ladder: rated 5.5 · overload 6.5 · trip 7.5 (first semester trips at 5.5). */
export const RATED = 5.5
export const OVERLOAD = 6.5
export const TRIP = 7.5

export type LoadTone = 'normal' | 'caution' | 'problem'

export function loadStatus(
  load: number,
  summer: boolean,
  firstSemester: boolean,
): { tone: LoadTone; word: string | null } {
  if (summer || load === 0) return { tone: 'normal', word: null }
  if (firstSemester && load > RATED) return { tone: 'problem', word: 'over first-semester cap' }
  if (load > TRIP) return { tone: 'problem', word: 'over hard cap' }
  if (load > OVERLOAD) return { tone: 'problem', word: 'needs approval' }
  if (load > RATED) return { tone: 'caution', word: 'overload' }
  return { tone: 'normal', word: null }
}
