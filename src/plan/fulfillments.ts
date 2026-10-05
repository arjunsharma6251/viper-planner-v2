import type { FaId, SectorId } from '../data/types'
import type { FoundationId, FulfillmentTag, PlannedCourse } from './types'

/**
 * What a course counts toward, in one place.
 *
 * Every course has DERIVED fulfillments — read off the catalog (FA, Sector,
 * energy), the requirement slot it sits in (a Foundation, a distribution
 * slot, the writing seminar) and VIPER's program rules (VIPR 1200/1210 are
 * engineering ethics). The student can then override: tick something extra,
 * or untick something derived. The audit, the stars and the "Counts toward"
 * checkboxes all read the EFFECTIVE set, so what the student sees checked
 * is exactly what the audit counts.
 *
 * Overrides live in `plan.fulfillments[courseKey]` as marks: a tag adds it,
 * `!tag` removes a derived one. Plans saved before overrides existed only
 * hold additions, so they read the same as before.
 */
export type FulfillmentMark = FulfillmentTag | `!${FulfillmentTag}`

export const FOUNDATION_IDS: readonly FoundationId[] = ['ncc-kite', 'ncc-key', 'ncc-fys', 'ncc-writ', 'ncc-pad', 'ncc-lang']

/**
 * Foundations whose slot carries a division for placement only. Per the
 * College chart only First-Year Seminar and Perspectives and Difference
 * may count within the distribution; the student can still claim one by
 * ticking it, which is their call to defend.
 */
const FOUNDATION_ONLY: ReadonlySet<FoundationId> = new Set(['ncc-writ', 'ncc-kite', 'ncc-key', 'ncc-lang'])

export const faTag = (id: FaId): FulfillmentTag => `fa:${id}`
export const secTag = (id: SectorId): FulfillmentTag => `sec:${id}`

function isFoundation(id: string | undefined | null): id is FoundationId {
  return !!id && (FOUNDATION_IDS as readonly string[]).includes(id)
}

/** The Foundation a course's slot or intent declares, if any. */
export function foundationOf(c: Pick<PlannedCourse, 'intent' | 'slotId'>): FoundationId | null {
  if (isFoundation(c.intent?.foundation)) return c.intent.foundation
  if (isFoundation(c.slotId)) return c.slotId
  return null
}

/** Derived fulfillments, before any student override. */
export function derivedFulfillments(c: PlannedCourse): FulfillmentTag[] {
  const tags = new Set<FulfillmentTag>()
  const fa = c.fa ?? c.fulfills?.fa ?? c.intent?.fa ?? null
  const sec = c.sec ?? c.fulfills?.sec ?? c.intent?.sec ?? null
  const writing = c.slotId === 'gened-writ' || fa === 'WRIT'
  const foundation = foundationOf(c) ?? (writing ? 'ncc-writ' : null)

  if (fa) tags.add(faTag(fa))
  if (sec) tags.add(secTag(sec))
  if (foundation) tags.add(foundation)
  if (foundation === 'ncc-writ') tags.add('seas-writ')
  // VIPR 1200 / 1210: VIPER's engineering ethics, and Sector VII under the
  // old core (VIPER_PROGRAM.fixedCourses notes).
  if (c.code === 'VIPR 1200' || c.code === 'VIPR 1210') {
    tags.add('seas-ethics')
    tags.add(secTag('VII'))
  }
  if (c.isEnergy) tags.add('viper-energy')

  // Division: the slot's own declaration first, then the old-core Sector /
  // Foundational Approach the course carries (a Sector I course is a Social
  // Sciences course by construction; Sector IV and the cross-cultural FAs
  // count as either).
  const placementOnly = foundation !== null && FOUNDATION_ONLY.has(foundation)
  let ss = false
  let h = false
  const d = c.intent?.distribution
  if (!placementOnly) {
    if (d === 'SS') ss = true
    else if (d === 'H') h = true
    else if (d === 'N') tags.add('ncc-distrib-n')
    else if (sec === 'I') ss = true
    else if (sec === 'II' || sec === 'III') h = true
    else if (sec === 'IV' || fa === 'CCA' || fa === 'CDUS') ss = h = true
  }
  if (ss) tags.add('ncc-distrib-ss')
  if (h) tags.add('ncc-distrib-h')
  // Social science and humanities courses fill SEAS general electives too.
  if (ss || h) tags.add('seas-ssh')
  for (const b of c.intent?.seas ?? []) tags.add(`seas-${b}` as FulfillmentTag)
  return [...tags]
}

/** Split stored marks into additions and removals. */
export function splitMarks(marks: readonly FulfillmentMark[] | undefined): {
  added: FulfillmentTag[]
  removed: FulfillmentTag[]
} {
  const added: FulfillmentTag[] = []
  const removed: FulfillmentTag[] = []
  for (const m of marks ?? []) {
    if (m.startsWith('!')) removed.push(m.slice(1) as FulfillmentTag)
    else added.push(m as FulfillmentTag)
  }
  return { added, removed }
}

/**
 * Derived minus removals, plus additions, then implications: a course that
 * counts toward a College Social Sciences or Humanities division also
 * counts as a SEAS SS/H general elective, whether the division was derived
 * or ticked — unless the student unticked SEAS SS/H explicitly.
 */
export function effectiveFulfillments(c: PlannedCourse, marks: readonly FulfillmentMark[] | undefined): FulfillmentTag[] {
  const { added, removed } = splitMarks(marks)
  const out = derivedFulfillments(c).filter((t) => !removed.includes(t))
  for (const t of added) if (!out.includes(t)) out.push(t)
  const division = out.includes('ncc-distrib-ss') || out.includes('ncc-distrib-h')
  if (division && !out.includes('seas-ssh') && !removed.includes('seas-ssh')) out.push('seas-ssh')
  return out
}

/**
 * The marks after the student ticks (`on`) or unticks a tag. A tag that
 * would be on without any mark of its own (derived, or implied by another
 * tick) is on by default: unticking records `!tag`, ticking clears it.
 * Anything else is a plain addition or its undo.
 */
export function nextMarks(
  c: PlannedCourse,
  marks: readonly FulfillmentMark[] | undefined,
  tag: FulfillmentTag,
  on: boolean,
): FulfillmentMark[] {
  const rest = (marks ?? []).filter((m) => m !== tag && m !== `!${tag}`)
  const onByDefault = effectiveFulfillments(c, rest).includes(tag)
  if (onByDefault) return on ? rest : [...rest, `!${tag}`]
  return on ? [...rest, tag] : rest
}
