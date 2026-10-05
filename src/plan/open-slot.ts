import type { SemesterKey } from '../data/semesters'
import { recomputeDerived } from './mutations'
import type { AugmentedCourse, Plan } from './types'

/**
 * A slot the student still has to fill: either a scheduler placeholder or
 * an elective line the seed left without a specific course (code "—").
 * Both mean the same thing to the student — "choose something here" — so
 * the UI treats them identically (open-slot row styling, picker-first modal).
 */
export function isOpenSlot(course: Pick<AugmentedCourse, 'isPlaceholder' | 'code'>): boolean {
  return !!course.isPlaceholder || course.code.startsWith('—') || course.code.trim() === ''
}

/**
 * Give every open-slot row a distinct code. The scheduler writes "—" for
 * all of them, and course identity everywhere (open, move, remove, tag) is
 * the code — so two "—" rows in one plan would act on each other. Plans
 * saved before this fix are repaired on load the same way.
 */
export function uniquifyOpenSlots(plan: Plan): Plan {
  const taken = new Set<string>()
  const renamed: string[] = []
  for (const k of Object.keys(plan.semesters) as SemesterKey[]) {
    plan.semesters[k] = plan.semesters[k].map((c) => {
      const open = c.isPlaceholder || c.code.trim() === '—'
      if (!open || (c.code !== '—' && !taken.has(c.code))) {
        taken.add(c.code)
        return c
      }
      const wasShared = c.code === '—'
      const base = wasShared ? `— ${c.slotId ?? 'slot'}` : c.code
      let code = base
      for (let n = 2; taken.has(code); n++) code = `${base} #${n}`
      taken.add(code)
      if (wasShared) renamed.push(code)
      return { ...c, code }
    })
  }
  // Marks a student put on the shared "—" key applied to every open slot;
  // keep showing them where they were seen.
  const shared = plan.fulfillments?.['—']
  if (shared && plan.fulfillments) {
    const next = { ...plan.fulfillments }
    delete next['—']
    for (const code of renamed) next[code] = [...shared]
    plan.fulfillments = next
  }
  return recomputeDerived(plan)
}
