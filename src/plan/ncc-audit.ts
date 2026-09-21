import type { AugmentedCourse, AugmentedPlan, FoundationId } from './types'
import { CONFIRMED_VIPER_MODS, normalizeViperMods } from '../ncc/mods'
import type { ViperModsInput } from '../ncc/types'
import { SEAS_GEN_ED, type SeasGenEdSpec } from '../data/seas-catalog'

/**
 * Student-facing New College Curriculum audit, read straight off the plan.
 *
 * Policy as confirmed 2026-09-11 (see CLAUDE.md § OCC vs NCC):
 *   Foundations — Kite, Key, First-Year Seminar, Perspectives and
 *     Difference, Language (0–2 CU), Critical Writing. All 1 CU except
 *     Language. FYS and P&D may also count within the distribution.
 *   Distribution — 12 + 5 + 3 across the three divisions. Division I
 *     (12 CU) is the major's own division, Natural Sciences for every
 *     VIPER College major, so it is covered by major work. The 5 and 3 go
 *     to the other two divisions in either order.
 *   SEAS general electives — 7 CU: Writing (the College writing seminar),
 *     Engineering ethics (VIPR 1200/1210), and 5 SS/H/TBS courses whose
 *     split depends on the engineering major.
 *   Approved overlap — VIPR 1200/1210 satisfy the First-Year Seminar.
 *     Nothing else is approved; sandbox proposals never leak in here.
 *
 * "Planned" is the honest word throughout: an open slot counts because the
 * student has set aside a term for it, not because a course is approved.
 */

export type NccFoundationState = 'planned' | 'approved-overlap' | 'credit' | 'missing'

export interface NccFoundationAudit {
  id: FoundationId
  label: string
  state: NccFoundationState
  /** What satisfies it — a course code, a slot label, or the overlap source. */
  by: string | null
}

/** A planned course listed under an audit row (open slots print their slot title). */
export interface AuditCourseRef {
  code: string
  title: string
  cu: number
  open: boolean
}

export interface NccDivisionAudit {
  id: 'SS' | 'H'
  label: string
  planned: number
  /** 5 or 3 — assigned to whichever division the student is filling more. */
  target: number
  /** The courses counted, flexible (SS/H) ones included where they landed. */
  courses: AuditCourseRef[]
}

export interface SeasElectiveAudit {
  id: string
  label: string
  planned: number
  target: number
  by: string | null
  /** Expanded-row guidance. */
  hint: string
  /** The courses filling this bucket. */
  courses: AuditCourseRef[]
}

export interface NccAudit {
  foundations: NccFoundationAudit[]
  plannedFoundations: number
  divisions: NccDivisionAudit[]
  seas: SeasElectiveAudit[]
}

export const NCC_FOUNDATION_LABELS: Record<FoundationId, string> = {
  'ncc-kite': 'Kite',
  'ncc-key': 'Key',
  'ncc-fys': 'First-Year Seminar',
  'ncc-writ': 'Critical Writing',
  'ncc-pad': 'Perspectives and Difference',
  'ncc-lang': 'Language (0–2 CU)',
}

const FOUNDATION_ORDER: FoundationId[] = [
  'ncc-kite',
  'ncc-key',
  'ncc-fys',
  'ncc-pad',
  'ncc-lang',
  'ncc-writ',
]

const DIST_TARGETS: readonly [number, number] = [5, 3]

function isOpen(c: AugmentedCourse): boolean {
  return !!c.isPlaceholder || c.code.startsWith('—')
}

function describe(c: AugmentedCourse): string {
  return isOpen(c) ? `open slot · ${c.title}` : c.code
}

function ref(c: AugmentedCourse): AuditCourseRef {
  return { code: c.code, title: c.title, cu: c.cu || 0, open: isOpen(c) }
}

export function computeNccAudit(
  plan: AugmentedPlan,
  apCreditIds: readonly string[] = [],
  /** Defaults to confirmed policy. Pass sandbox mods only in admin views. */
  viperMods: ViperModsInput = CONFIRMED_VIPER_MODS,
  /** Picks the SEAS general-elective split (per-major in the catalog). */
  seasMajorKey: string | null = null,
): NccAudit {
  const mods = normalizeViperMods(viperMods)
  const courses = Object.values(plan.semesters).flat()
  const has = (code: string) => courses.some((c) => c.code === code)

  // ---- Foundations ----
  const foundations: NccFoundationAudit[] = FOUNDATION_ORDER.map((id) => {
    const label = NCC_FOUNDATION_LABELS[id]
    if (id === 'ncc-fys' && mods.fysWaiver && (has('VIPR 1200') || has('VIPR 1210'))) {
      return { id, label, state: 'approved-overlap', by: 'VIPR 1200 / 1210' }
    }
    if (id === 'ncc-lang' && apCreditIds.includes('lang-fluency')) {
      return { id, label, state: 'credit', by: 'incoming credit' }
    }
    const hit = courses.find(
      (c) =>
        c.intent?.foundation === id ||
        c.slotId === id ||
        // The seeded old-curriculum Writing Seminar slot is the same course.
        (id === 'ncc-writ' && (c.intent?.fa === 'WRIT' || c.slotId === 'gened-writ')),
    )
    if (!hit) return { id, label, state: 'missing', by: null }
    return { id, label, state: 'planned', by: describe(hit) }
  })

  // ---- Distribution (SS / H; Natural Sciences is the major's division) ----
  // Courses declare a division directly (NCC slots, student tags) or via
  // the old-curriculum sector the seed placed them for — a "Sector I:
  // Society" slot is a Social Sciences course by construction. Sectors and
  // Foundational Approaches that straddle SS and H are allocated last, to
  // whichever division still has the larger shortfall.
  const planned = { SS: 0, H: 0 }
  const counted: { SS: AuditCourseRef[]; H: AuditCourseRef[] } = { SS: [], H: [] }
  const flexibleCourses: AugmentedCourse[] = []
  for (const c of courses) {
    const d = divisionOf(c)
    if (d === 'SS' || d === 'H') {
      planned[d] += c.cu || 0
      counted[d].push(ref(c))
    } else if (d === 'SS/H') flexibleCourses.push(c)
  }
  // Flexible courses pour into the larger remaining gap, one course at a
  // time, with the 5 assigned to the fuller division as we go.
  for (const c of flexibleCourses) {
    const tSS = planned.SS >= planned.H ? DIST_TARGETS[0] : DIST_TARGETS[1]
    const tH = planned.SS >= planned.H ? DIST_TARGETS[1] : DIST_TARGETS[0]
    const gapSS = tSS - planned.SS
    const gapH = tH - planned.H
    const d = gapH > gapSS ? 'H' : 'SS'
    planned[d] += c.cu || 0
    counted[d].push(ref(c))
  }
  // 5 and 3 may go to either division: give the larger target to the
  // division the student has planned more of (ties favour Social Sciences).
  const ssGetsFive = planned.SS >= planned.H
  const divisions: NccDivisionAudit[] = [
    {
      id: 'SS',
      label: 'Social Sciences',
      planned: round1(planned.SS),
      target: ssGetsFive ? DIST_TARGETS[0] : DIST_TARGETS[1],
      courses: counted.SS,
    },
    {
      id: 'H',
      label: 'Humanities & the Arts',
      planned: round1(planned.H),
      target: ssGetsFive ? DIST_TARGETS[1] : DIST_TARGETS[0],
      courses: counted.H,
    },
  ]

  // ---- SEAS general electives (7 CU) ----
  // Ethics (VIPR 1200/1210 for VIPER) + Writing seminar + 5 SS/H/TBS whose
  // split is per major (src/data/seas-catalog.ts). Courses fill the
  // strictest bucket they qualify for first, so a Social Science course
  // lands in "Social Science" before it lands in "SS or H".
  const writ = foundations.find((f) => f.id === 'ncc-writ')
  const ethicsBy = has('VIPR 1200') ? 'VIPR 1200' : has('VIPR 1210') ? 'VIPR 1210' : null
  const spec: SeasGenEdSpec = SEAS_GEN_ED[seasMajorKey ?? ''] ?? { ss: 0, h: 0, ssh: 3, sshTbs: 2, ethics: ['EAS 2030'] }
  const pools: Record<'ss' | 'h' | 'either' | 'tbs', AugmentedCourse[]> = { ss: [], h: [], either: [], tbs: [] }
  for (const c of courses) {
    if (c.slotId === 'gened-writ' || c.slotId === 'ncc-writ' || c.intent?.fa === 'WRIT' || c.intent?.foundation === 'ncc-writ') continue // tracked as Writing
    const d = divisionOf(c)
    if (d === 'SS') pools.ss.push(c)
    else if (d === 'H') pools.h.push(c)
    else if (d === 'SS/H' || c.intent?.seas?.includes('ssh') || c.userFulfills.includes('seas-ssh')) pools.either.push(c)
    else if (c.intent?.seas?.includes('tbs') || c.userFulfills.includes('seas-tbs')) pools.tbs.push(c)
  }
  const take = (n: number, ...from: Array<keyof typeof pools>): AuditCourseRef[] => {
    const got: AuditCourseRef[] = []
    for (const p of from) {
      while (got.length < n && pools[p].length > 0) got.push(ref(pools[p].shift()!))
      if (got.length >= n) break
    }
    return got
  }
  const writCourse = courses.find(
    (c) => c.slotId === 'gened-writ' || c.slotId === 'ncc-writ' || c.intent?.fa === 'WRIT' || c.intent?.foundation === 'ncc-writ',
  )
  const ethicsCourse = courses.find((c) => c.code === 'VIPR 1200') ?? courses.find((c) => c.code === 'VIPR 1210')
  const seas: SeasElectiveAudit[] = [
    {
      id: 'seas-writ',
      label: 'Writing seminar',
      planned: writ?.state === 'missing' ? 0 : 1,
      target: 1,
      by: writ?.state === 'missing' ? null : (writ?.by ?? null),
      hint: writ?.state === 'missing'
        ? 'Plan a Critical Writing seminar — it covers the College Foundation and this slot.'
        : `Covered by ${writ?.by}.`,
      courses: writCourse ? [ref(writCourse)] : [],
    },
    {
      id: 'seas-ethics',
      label: 'Engineering ethics',
      planned: ethicsBy ? 1 : 0,
      target: 1,
      by: ethicsBy,
      hint: ethicsBy
        ? `Covered by ${ethicsBy}.`
        : `VIPR 1200 or VIPR 1210 covers this once placed (the catalog lists ${spec.ethics.join(' / ')}).`,
      courses: ethicsCourse ? [ref(ethicsCourse)] : [],
    },
  ]
  if (spec.ss > 0) {
    const got = take(spec.ss, 'ss')
    seas.push({ id: 'seas-ss', label: 'Social Science', planned: got.length, target: spec.ss, by: null,
      hint: `${got.length} of ${spec.ss} planned. Must carry the SEAS Social Science (EUSS) attribute.`, courses: got })
  }
  if (spec.h > 0) {
    const got = take(spec.h, 'h')
    seas.push({ id: 'seas-h', label: 'Humanities', planned: got.length, target: spec.h, by: null,
      hint: `${got.length} of ${spec.h} planned. Must carry the SEAS Humanities (EUHS) attribute.`, courses: got })
  }
  if (spec.ssh > 0) {
    const got = take(spec.ssh, 'ss', 'h', 'either')
    seas.push({ id: 'seas-ssh', label: 'Social Science or Humanities', planned: got.length, target: spec.ssh, by: null,
      hint: `${got.length} of ${spec.ssh} planned. Any Social Science or Humanities course counts.`, courses: got })
  }
  if (spec.sshTbs > 0) {
    const got = take(spec.sshTbs, 'tbs', 'ss', 'h', 'either')
    seas.push({ id: 'seas-ssh-tbs', label: 'SS, Humanities or TBS', planned: got.length, target: spec.sshTbs, by: null,
      hint: `${got.length} of ${spec.sshTbs} planned. Social Science, Humanities, or Technology in Business & Society — open a course and tick SEAS TBS under Counts toward.`, courses: got })
  }

  return {
    foundations,
    plannedFoundations: foundations.filter((f) => f.state !== 'missing').length,
    divisions,
    seas,
  }
}

/**
 * Which NCC division a planned course counts toward, or null for none.
 * 'SS/H' means the course satisfies either (Sector IV, the cross-cultural
 * Foundational Approaches) and is allocated where the shortfall is larger.
 */
function divisionOf(c: AugmentedCourse): 'SS' | 'H' | 'SS/H' | null {
  // Per the College chart only First-Year Seminar and Perspectives and
  // Difference may count within the distribution; a Writing or Kite slot
  // is a Foundation only, whatever division its slot definition carries.
  const f = c.intent?.foundation ?? c.slotId
  if (f === 'ncc-writ' || f === 'ncc-kite' || f === 'ncc-key' || f === 'ncc-lang') return null
  const d = c.intent?.distribution
  if (d === 'SS' || d === 'H') return d
  if (d === 'N') return null
  const sec = c.intent?.sec ?? c.fulfills?.sec ?? c.sec ?? null
  switch (sec) {
    case 'I':
      return 'SS' // Society
    case 'II':
    case 'III':
      return 'H' // History & Tradition · Arts & Letters
    case 'IV':
      return 'SS/H' // Humanities & Social Science
    default:
      break
  }
  const fa = c.intent?.fa ?? c.fulfills?.fa ?? c.fa ?? null
  if (fa === 'CCA' || fa === 'CDUS') return 'SS/H'
  return null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
