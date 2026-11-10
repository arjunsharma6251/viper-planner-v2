import type { SemesterKey } from '../data/semesters'
import { recomputeDerived } from './mutations'
import type { AugmentedCourse, AugmentedPlan, FulfillmentTag, Plan } from './types'
import { ALL_SEMESTER_KEYS } from '../data/semesters'
import { lookupCourse } from '../data/courses'
import { FOUNDATION_IDS, derivedFulfillments } from './fulfillments'
import { COMMON_DOUBLE_COUNTS } from '../data/common-double-counts'
import type { DoubleCountRef } from '../data/types'

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

/** An open slot in the plan, located. */
export interface OpenSlotRef {
  semKey: SemesterKey
  /** The slot's plan key (its placeholder code) — what open/rename/move act on. */
  code: string
  /** What the slot is for ("Sector IV: …", "Tech Elective"). */
  label: string
}

/** Every open slot in the plan, in term order (2026-11: "to fill" list in the audit). */
export function listOpenSlots(plan: AugmentedPlan): OpenSlotRef[] {
  const out: OpenSlotRef[] = []
  for (const semKey of ALL_SEMESTER_KEYS) {
    for (const c of plan.semesters[semKey] ?? []) {
      if (isOpenSlot(c)) out.push({ semKey, code: c.code, label: c.slotLabel ?? c.title })
    }
  }
  return out
}

/** The requirement tags an open slot stands for (not incidental implications). */
export function slotRequirementTags(slot: AugmentedCourse): FulfillmentTag[] {
  return slot.effectiveFulfills.filter(
    (t) =>
      t.startsWith('fa:') ||
      t.startsWith('sec:') ||
      (FOUNDATION_IDS as readonly string[]).includes(t) ||
      (t.startsWith('ncc-distrib') && !!slot.intent?.distribution) ||
      (t === 'viper-energy' && !!slot.isEnergy) ||
      (t.startsWith('seas-') && !!slot.intent?.seas?.length),
  )
}

/**
 * Open slots a course would fill (2026-11 beta feedback: students added a
 * course as a new row next to the open slot it satisfies). A slot matches
 * when the course is one of its listed options, or when the catalog says
 * the course carries the requirement the slot holds (an FA, a Sector, a
 * distribution division, energy). Courses without catalog data match only
 * by listed option.
 */
/** A course's derived requirement tags from the catalog alone ([] when uncatalogued). */
function catalogTags(code: string): FulfillmentTag[] {
  const entry = lookupCourse(code)
  return entry
    ? derivedFulfillments({ code, title: entry.title, cu: entry.cu, fa: entry.fa ?? null, sec: entry.sec ?? null, isEnergy: !!entry.energy })
    : []
}

/**
 * Common double-counts (src/data/common-double-counts.ts) that would fill this
 * open slot, for the slot's course sheet (2026-11 beta feedback: the list sat
 * in the collapsed Reference panel where newcomers never found it).
 */
export function doubleCountPicksFor(slot: AugmentedCourse, exclude: ReadonlySet<string> = new Set()): DoubleCountRef[] {
  const want = slotRequirementTags(slot)
  if (want.length === 0) return []
  return COMMON_DOUBLE_COUNTS.filter((dc) => !exclude.has(dc.code) && catalogTags(dc.code).some((t) => want.includes(t)))
}

export function fillTargetsFor(plan: AugmentedPlan, code: string): OpenSlotRef[] {
  const tags = catalogTags(code)
  const out: OpenSlotRef[] = []
  for (const semKey of ALL_SEMESTER_KEYS) {
    for (const c of plan.semesters[semKey] ?? []) {
      if (!isOpenSlot(c)) continue
      const byPool = (c.pool ?? []).includes(code)
      const byTag = slotRequirementTags(c).some((t) => tags.includes(t))
      if (byPool || byTag) out.push({ semKey, code: c.code, label: c.slotLabel ?? c.title })
    }
  }
  return out
}
