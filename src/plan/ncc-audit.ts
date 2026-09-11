import type { AugmentedCourse, AugmentedPlan, FoundationId } from './types'
import { CONFIRMED_VIPER_MODS, normalizeViperMods } from '../ncc/mods'
import type { ViperModsInput } from '../ncc/types'

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

export interface NccDivisionAudit {
  id: 'SS' | 'H'
  label: string
  planned: number
  /** 5 or 3 — assigned to whichever division the student is filling more. */
  target: number
}

export interface SeasElectiveAudit {
  id: 'seas-writ' | 'seas-ethics' | 'seas-ssh'
  label: string
  planned: number
  target: number
  by: string | null
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

export function computeNccAudit(
  plan: AugmentedPlan,
  apCreditIds: readonly string[] = [],
  /** Defaults to confirmed policy. Pass sandbox mods only in admin views. */
  viperMods: ViperModsInput = CONFIRMED_VIPER_MODS,
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
  const planned = { SS: 0, H: 0 }
  for (const c of courses) {
    const d = c.intent?.distribution
    if (d === 'SS' || d === 'H') planned[d] += c.cu || 0
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
    },
    {
      id: 'H',
      label: 'Humanities & the Arts',
      planned: round1(planned.H),
      target: ssGetsFive ? DIST_TARGETS[1] : DIST_TARGETS[0],
    },
  ]

  // ---- SEAS general electives (7 CU) ----
  const writ = foundations.find((f) => f.id === 'ncc-writ')
  const ethicsBy = has('VIPR 1200') ? 'VIPR 1200' : has('VIPR 1210') ? 'VIPR 1210' : null
  // Any SS/H course counts toward the 5, as does anything the student has
  // tagged as a SEAS SS/H elective. Each course counts once.
  const sshCourses = courses.filter(
    (c) =>
      c.intent?.distribution === 'SS' ||
      c.intent?.distribution === 'H' ||
      c.intent?.seas?.includes('ssh') ||
      c.userFulfills.includes('seas-ssh'),
  )
  const seas: SeasElectiveAudit[] = [
    {
      id: 'seas-writ',
      label: 'Writing seminar',
      planned: writ?.state === 'missing' ? 0 : 1,
      target: 1,
      by: writ?.state === 'missing' ? null : (writ?.by ?? null),
    },
    {
      id: 'seas-ethics',
      label: 'Engineering ethics',
      planned: ethicsBy ? 1 : 0,
      target: 1,
      by: ethicsBy,
    },
    {
      id: 'seas-ssh',
      label: 'SS / H / TBS electives',
      planned: Math.min(5, sshCourses.length),
      target: 5,
      by: null,
    },
  ]

  return {
    foundations,
    plannedFoundations: foundations.filter((f) => f.state !== 'missing').length,
    divisions,
    seas,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
