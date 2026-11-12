// Major requirements in the degree audit (2026-11 beta feedback: the audit
// checked gen-eds and energy but not the majors, so removing a required CIS
// course went unflagged).
//
// One row per core course and per elective slot of the student's major and
// concentration, read from src/data/majors.ts. A row is ticked when the plan
// holds the course (or an accepted alternative), incoming credit covers it,
// or — for an elective slot — a course fills that slot. Nothing here decides
// policy: alternatives come from the major's own `substitutions` (BA) and the
// SEAS catalog's "X or Y" rows (BSE, src/data/seas-catalog.ts).

import { classAlternatives, majorForClass } from '../data/math-sequence'
import { alternativesFor } from '../data/seas-catalog'
import type { ElectiveSlot, Major } from '../data/types'
import type { SemesterKey } from '../data/semesters'
import type { AugmentedCourse, AugmentedPlan } from './types'

export interface MajorAuditRow {
  /** Course code for core rows, slot id for elective rows. */
  id: string
  kind: 'core' | 'elective'
  /** Course code (core) or slot label (elective). */
  label: string
  done: boolean
  /** What satisfies it: a course code, or 'credit'. Null when unmet. */
  by: string | null
  /** Accepted alternatives (core) or the slot's listed options (elective). */
  options: readonly string[]
  /** Where the open slot for this requirement sits, when there is one. */
  openIn: SemesterKey | null
  /** Plan key of that open slot (its placeholder code), for jumping to it. */
  openCode: string | null
}

export interface MajorAudit {
  majorKey: string
  school: 'SAS' | 'SEAS'
  /** "Chemistry" or "Physics & Astronomy · Computer Techniques". */
  title: string
  core: MajorAuditRow[]
  electives: MajorAuditRow[]
  /** Unmet rows across core and electives. */
  left: number
}

function isOpen(c: Pick<AugmentedCourse, 'isPlaceholder' | 'code'>): boolean {
  return !!c.isPlaceholder || c.code.trim().startsWith('—')
}

/**
 * A course's lines that sit on this major's side of the dual degree. Used only
 * to match a slot by id (the SAS and SEAS "no concentration" slots share ids);
 * a course from the other degree may still satisfy a core course, a pool
 * option or a course group, as the seed already assumes (a pool course in
 * the other degree's core fills the slot).
 */
function onSide(c: AugmentedCourse, school: 'SAS' | 'SEAS'): boolean {
  if (!c.category || c.category === 'both') return true
  return school === 'SAS' ? c.category === 'sas' : c.category === 'seas'
}

/**
 * BA-side substitutions apply only to the pairing they name
 * (`context: 'CHEM-CBE combo'`); BSE-side alternatives come from the catalog.
 */
export function coreAlternatives(
  major: Major,
  majorKey: string,
  code: string,
  otherMajorKey: string | null,
): string[] {
  if (major.school === 'SEAS') return [...alternativesFor(majorKey, code)]
  const pair = otherMajorKey ? `${majorKey}-${otherMajorKey} combo` : null
  return (major.substitutions ?? []).filter((s) => s.from === code && (!s.context || s.context === pair)).map((s) => s.to)
}

/** Groups of courses that together satisfy a slot (e.g. CHEM 2411 + 2421). */
function satisfiedByGroups(slot: ElectiveSlot): readonly (readonly string[])[] {
  return slot.satisfiedBy ?? []
}

export function computeMajorAudit(
  plan: AugmentedPlan,
  majorKey: string | null | undefined,
  concKey: string | null | undefined,
  otherMajorKey: string | null = null,
  /**
   * Picks the math sequence (old MATH 2400/2410 for the Class of 2028 and
   * older). Defaults to the plan's own class year.
   */
  classYear?: number | null,
): MajorAudit | null {
  const gradYear = classYear !== undefined ? classYear : ((plan.meta as { gradYear?: number | null } | null)?.gradYear ?? null)
  const major = majorKey ? majorForClass(majorKey, otherMajorKey, gradYear) : undefined
  if (!major || !majorKey) return null
  const concEntries = Object.entries(major.concentrations)
  const conc =
    (concKey ? major.concentrations[concKey] : undefined) ??
    concEntries.find(([, c]) => c.default)?.[1] ??
    concEntries[0]?.[1]
  const school = major.school
  const located: { course: AugmentedCourse; sem: SemesterKey }[] = []
  for (const [sem, list] of Object.entries(plan.semesters) as [SemesterKey, AugmentedCourse[]][]) {
    for (const course of list) located.push({ course, sem })
  }
  const planned = located.filter((l) => !isOpen(l.course))
  const consumed = new Set<AugmentedCourse>()
  const credited = (code: string) => plan.placement[code] === 'credit'
  const take = (codes: readonly string[]): string | null => {
    for (const code of codes) {
      const hit = planned.find((l) => !consumed.has(l.course) && l.course.code === code)
      if (hit) {
        consumed.add(hit.course)
        return code
      }
    }
    return null
  }

  const coreCodes = [...major.sharedCore, ...(conc?.extraCore ?? [])]
  const core: MajorAuditRow[] = coreCodes.map((code) => {
    const options = [
      ...new Set([...coreAlternatives(major, majorKey, code, otherMajorKey), ...classAlternatives(majorKey, otherMajorKey, gradYear, code)]),
    ]
    // Incoming credit for the course or an accepted alternative covers it.
    const by = credited(code) || options.some(credited) ? 'credit' : take([code, ...options])
    return { id: code, kind: 'core', label: code, done: by !== null, by, options, openIn: null, openCode: null }
  })

  const slots = conc?.electiveSlots ?? []
  // First pass: courses sitting in the slot itself (what the seed or the
  // student put there). Second pass: listed options planned elsewhere, as
  // when a pool course is already in the other degree's core.
  const bySlot = new Map<string, string>()
  for (const slot of slots) {
    const hit = planned.find((l) => !consumed.has(l.course) && l.course.slotId === slot.id && onSide(l.course, school))
    if (hit) {
      consumed.add(hit.course)
      bySlot.set(slot.id, hit.course.code)
    }
  }
  const electives: MajorAuditRow[] = slots.map((slot) => {
    let by = bySlot.get(slot.id) ?? null
    if (!by) {
      for (const group of satisfiedByGroups(slot)) {
        if (group.every((code) => credited(code) || planned.some((l) => l.course.code === code))) {
          by = group.join(' + ')
          break
        }
      }
    }
    if (!by) by = take(slot.pool ?? [])
    const open = by ? undefined : located.find((l) => l.course.slotId === slot.id && isOpen(l.course) && onSide(l.course, school))
    return {
      id: slot.id,
      kind: 'elective',
      label: slot.label,
      done: by !== null,
      by,
      options: slot.pool ?? [],
      openIn: open?.sem ?? null,
      openCode: open?.course.code ?? null,
    }
  })

  const concLabel = conc && concEntries.length > 1 ? ` · ${conc.label}` : ''
  return {
    majorKey,
    school,
    title: `${major.fullName}${concLabel}`,
    core,
    electives,
    left: [...core, ...electives].filter((r) => !r.done).length,
  }
}
