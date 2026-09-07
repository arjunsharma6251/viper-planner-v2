import type { AugmentedCourse } from './types'

/**
 * A slot the student still has to fill: either a scheduler placeholder or
 * an elective line the seed left without a specific course (code "—").
 * Both mean the same thing to the student — "choose something here" — so
 * the UI treats them identically (open-slot row styling, picker-first modal).
 */
export function isOpenSlot(course: Pick<AugmentedCourse, 'isPlaceholder' | 'code'>): boolean {
  return !!course.isPlaceholder || course.code === '—' || course.code.trim() === ''
}
