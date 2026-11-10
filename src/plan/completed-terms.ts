// Terms a current student has already finished (2026-11 beta feedback: a
// second-year student's first move was rewriting freshman fall to match what
// they actually took). Setup collects the course codes per finished term;
// after the normal seed, this lays them in and plans only what is left.
//
// Rules, in order, for each finished term:
//   1. VIPR program rows stay where the program puts them.
//   2. Every other seeded line is lifted out of the finished term.
//   3. Each entered code goes into that term: the seed's own line for that
//      code if it has one (keeping its slot and degree), else an open slot it
//      fills (renamed in place, so the audit keeps the slot), else a new line.
//   4. Whatever the seed had put in a finished term and the student did not
//      take moves to the earliest remaining term it is offered in, under the
//      6.5 CU cap when possible. Nothing is dropped: an untaken required
//      course is still required.
// Nothing here invents a course: the codes are the student's.

import { ALL_SEMESTER_KEYS, SEMESTER_KEYS, isFallSem, type SemesterKey } from '../data/semesters'
import { lookupCourse } from '../data/courses'
import { FALL, SPRING } from '../data/types'
import { CAP } from '../ui/load'
import { effectiveFulfillments } from './fulfillments'
import { addCourse, recomputeDerived, renameCourse } from './mutations'
import { isOpenSlot, slotFilledBy, uniquifyOpenSlots } from './open-slot'
import type { AugmentedCourse, Plan, PlannedCourse } from './types'

/** Finished term → the course codes the student took in it. */
export type CompletedTerms = Partial<Record<SemesterKey, readonly string[]>>

/** The finished terms, in calendar order. */
export function completedTermKeys(completed: CompletedTerms | undefined): SemesterKey[] {
  if (!completed) return []
  return ALL_SEMESTER_KEYS.filter((k) => completed[k] !== undefined)
}

const isViper = (c: PlannedCourse) => c.category === 'viper' || c.code.startsWith('VIPR ')

function asAugmented(plan: Plan, c: PlannedCourse): AugmentedCourse {
  const marks = plan.fulfillments?.[c.originalCode ?? c.code]
  return {
    ...c,
    userFulfills: [],
    removedFulfills: [],
    requirementCount: 0,
    overlapKind: null,
    effectiveFulfills: effectiveFulfillments(c, marks),
  }
}

function offeredIn(code: string, k: SemesterKey): boolean {
  const off = lookupCourse(code)?.off
  if (off === FALL) return isFallSem(k)
  if (off === SPRING) return !isFallSem(k)
  return true
}

export function applyCompletedTerms(seed: Plan, completed: CompletedTerms | undefined): Plan {
  const done = completedTermKeys(completed)
  if (done.length === 0 || !completed) return seed
  const doneSet = new Set<SemesterKey>(done)
  let plan: Plan = structuredClone(seed)

  // 2. Lift every non-VIPR line out of the finished terms.
  const lifted: PlannedCourse[] = []
  for (const k of done) {
    const keep: PlannedCourse[] = []
    for (const c of plan.semesters[k]) (isViper(c) ? keep : lifted).push(c)
    plan.semesters[k] = keep
  }

  // 3. Lay in what the student took.
  for (const k of done) {
    for (const raw of completed[k] ?? []) {
      const code = raw.trim()
      if (!code || plan.semesters[k].some((c) => c.code === code)) continue
      // a) the seed's own line for this course (lifted, or in a later term)
      const liftedAt = lifted.findIndex((c) => !isOpenSlot(c) && c.code === code)
      if (liftedAt >= 0) {
        plan.semesters[k].push(lifted.splice(liftedAt, 1)[0]!)
        continue
      }
      const later = ALL_SEMESTER_KEYS.filter((s) => !doneSet.has(s)).find((s) => plan.semesters[s].some((c) => c.code === code))
      if (later) {
        const i = plan.semesters[later].findIndex((c) => c.code === code)
        plan.semesters[k].push(plan.semesters[later].splice(i, 1)[0]!)
        continue
      }
      // b) an open slot it fills: lifted ones first (they were meant for now)
      const slotAt = lifted.findIndex((c) => isOpenSlot(c) && slotFilledBy(asAugmented(plan, c), code))
      let slot: PlannedCourse | undefined = slotAt >= 0 ? lifted.splice(slotAt, 1)[0] : undefined
      if (!slot) {
        for (const s of ALL_SEMESTER_KEYS) {
          if (doneSet.has(s)) continue
          const i = plan.semesters[s].findIndex((c) => isOpenSlot(c) && slotFilledBy(asAugmented(plan, c), code))
          if (i >= 0) {
            slot = plan.semesters[s].splice(i, 1)[0]
            break
          }
        }
      }
      if (slot) {
        plan.semesters[k].push(slot)
        const filled = renameCourse(recomputeDerived(plan), slot.code, code)
        if (filled.ok) plan = filled.plan
        continue
      }
      // c) a new line
      const added = addCourse(recomputeDerived(plan), k, { code, title: lookupCourse(code)?.title ?? code })
      if (added.ok) {
        plan = added.plan
        const line = plan.semesters[k].find((c) => c.code === code)
        if (line) {
          // Taken, not a student-added plan line.
          line.isUserAdded = false
          line.tags = (line.tags ?? []).filter((t) => t !== 'USER-ADDED')
        }
      }
    }
  }

  // 4. Re-home what was planned for a finished term but not taken.
  recomputeDerived(plan)
  const remaining = SEMESTER_KEYS.filter((k) => !doneSet.has(k))
  for (const c of lifted) {
    const fits = remaining.filter((k) => offeredIn(c.code, k))
    const pool = fits.length > 0 ? fits : remaining
    const target =
      pool.find((k) => (plan.loads[k] ?? 0) + (c.cu || 0) <= CAP) ??
      [...pool].sort((a, b) => (plan.loads[a] ?? 0) - (plan.loads[b] ?? 0))[0]
    if (!target) continue
    plan.semesters[target].push(c)
    plan.loads[target] = (plan.loads[target] ?? 0) + (c.cu || 0)
  }
  return uniquifyOpenSlots(recomputeDerived(plan))
}
