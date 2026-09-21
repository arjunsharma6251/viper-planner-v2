/**
 * Penn's course-load ladder, as the reviewer stated it (2026-09-21):
 *   first semester capped at 5.5 CU · later semesters capped at 6.5 CU ·
 *   7+ CU needs a Max CU Increase request.
 * Loads between 5.5 and 6.5 in a later term are the normal dual-degree
 * overload and carry no note.
 */
export const FIRST_SEMESTER_CAP = 5.5
export const CAP = 6.5
export const FORM_THRESHOLD = 7

/**
 * The SRFS Path forms page lists "Max CU Increase" under Academic Program
 * Requests. Linked as the page, not the form's deep link, which rotates.
 */
export const MAX_CU_FORM_URL = 'https://srfs.upenn.edu/registrar/studentforms'

export type LoadTone = 'normal' | 'caution' | 'problem'

export interface LoadStatus {
  tone: LoadTone
  /** One line for the term header, or null when nothing needs saying. */
  word: string | null
  /** True when the note should link to the Max CU Increase form. */
  form: boolean
}

export function loadStatus(load: number, summer: boolean, firstSemester: boolean): LoadStatus {
  if (summer || load === 0) return { tone: 'normal', word: null, form: false }
  if (firstSemester && load > FIRST_SEMESTER_CAP) {
    return { tone: 'problem', word: `Above the ${FIRST_SEMESTER_CAP} CU first-semester cap`, form: false }
  }
  if (load >= FORM_THRESHOLD) {
    return { tone: 'problem', word: `${FORM_THRESHOLD}+ CU needs a Max CU Increase`, form: true }
  }
  if (load > CAP) return { tone: 'caution', word: `Above the ${CAP} CU cap`, form: false }
  return { tone: 'normal', word: null, form: false }
}
