import type { AugmentedPlan } from './types'
import type { NccAudit } from './ncc-audit'
import { SEMESTER_KEYS, semesterLabel } from '../data/semesters'
import { FA_REQUIREMENTS, SECTORS } from '../data/requirements'

/**
 * Advisor notes: the plan's constraint checks, written the way an advisor
 * would say them. Computed from the LIVE plan (not the seed), so they track
 * every edit. Errors are things Penn will not approve as-is; warnings need
 * a form or a conversation; info is reassurance.
 *
 * This is the plan-layer counterpart of the scheduler's runNCCChecks —
 * same rules, but it reads the augmented plan and the student audit so
 * it works under either curriculum and after any mutation.
 */

export type NoteSeverity = 'error' | 'warning' | 'info'

export interface AdvisorNote {
  severity: NoteSeverity
  /** Short category, e.g. "Hard cap", "Foundation". */
  source: string
  text: string
}

export const FIRST_SEMESTER_CAP = 5.5
export const DUAL_OVERLOAD = 5.5
export const APPROVAL_CAP = 6.5
export const HARD_CAP = 7.5
export const BA_MIN = 36
export const BSE_MIN = 40

export function computeAdvisorNotes(
  plan: AugmentedPlan,
  ncc: NccAudit | undefined,
  curriculum: 'legacy' | 'ncc',
  gradYear: number | null,
): AdvisorNote[] {
  const notes: AdvisorNote[] = []
  const s = plan.summary

  // ---- Semester loads (academic year only; summers are judged differently) ----
  // Dual overloads are the VIPER norm, so they fold into one line; the
  // rarer approval-level and hard-cap terms each get their own.
  const overloads: string[] = []
  for (const key of SEMESTER_KEYS) {
    const load = plan.loads[key] ?? 0
    const label = semesterLabel(key, gradYear ?? undefined).season
    if (key === 'fall-y1' && load > FIRST_SEMESTER_CAP) {
      notes.push({
        severity: 'error',
        source: 'First semester',
        text: `${label} is ${load} CU. First-semester students are capped at ${FIRST_SEMESTER_CAP} CU — move ${round1(load - FIRST_SEMESTER_CAP)} CU later.`,
      })
    } else if (load > HARD_CAP) {
      notes.push({
        severity: 'error',
        source: 'Hard cap',
        text: `${label} is ${load} CU, above Penn's ${HARD_CAP} CU university-wide cap. Needs school-level approval or a summer course.`,
      })
    } else if (load > APPROVAL_CAP) {
      notes.push({
        severity: 'warning',
        source: 'Approval needed',
        text: `${label} is ${load} CU. Requires a faculty advisor sign-off (SEAS) or a CU increase request (College).`,
      })
    } else if (load > DUAL_OVERLOAD) {
      overloads.push(`${label} (${load})`)
    }
  }
  if (overloads.length > 0) {
    notes.push({
      severity: 'warning',
      source: 'Dual overload',
      text: `${overloads.length === 1 ? 'One term is' : `${overloads.length} terms are`} above ${DUAL_OVERLOAD} CU — the expected VIPER dual-degree overload, but each needs the form: ${overloads.join(', ')}.`,
    })
  }

  // ---- Degree minimums ----
  if (!s.meetsDualMin) {
    notes.push({
      severity: 'error',
      source: 'Dual minimum',
      text: `${s.totalCU} CU planned; the dual degree needs ${BSE_MIN}+ CU with overlap.`,
    })
  }
  if (s.sasCU < BA_MIN) {
    notes.push({
      severity: 'warning',
      source: 'BA minimum',
      text: `${round1(s.sasCU)} CU count toward the BA; the College requires ${BA_MIN}. Gen-ed and cross-listed courses close this gap as they are chosen.`,
    })
  }
  // The plan-layer display total (preserved from the old app) leaves gen-ed
  // out of the BSE count; SEAS's 40 includes its 7 general electives, so add
  // them back here rather than change the ported summary.
  const genEdCU = Object.values(plan.semesters)
    .flat()
    .filter((c) => c.category === 'gened')
    .reduce((sum, c) => sum + (c.cu || 0), 0)
  const bseCU = round1(s.seasCU + genEdCU)
  if (bseCU < BSE_MIN) {
    notes.push({
      severity: 'warning',
      source: 'BSE minimum',
      text: `${bseCU} CU count toward the BSE; Engineering requires ${BSE_MIN}.`,
    })
  }
  if (!s.meetsEnergyReq) {
    notes.push({
      severity: 'error',
      source: 'Energy courses',
      text: `${s.energyCoursesCount} of 3 VIPER energy courses planned.`,
    })
  }

  // ---- College curriculum ----
  if (curriculum === 'ncc' && ncc) {
    for (const f of ncc.foundations) {
      if (f.state === 'missing') {
        notes.push({
          severity: 'error',
          source: 'Foundation',
          text: `${f.label}: nothing planned. Reserve an open slot or tag a course.`,
        })
      }
    }
    for (const d of ncc.divisions) {
      if (d.planned < d.target) {
        notes.push({
          severity: 'warning',
          source: 'Distribution',
          text: `${d.label}: ${d.planned} of ${d.target} CU planned (${round1(d.target - d.planned)} more).`,
        })
      }
    }
    for (const r of ncc.seas) {
      if (r.planned < r.target) {
        notes.push({
          severity: 'warning',
          source: 'SEAS electives',
          text: `${r.label}: ${r.planned} of ${r.target} CU planned.`,
        })
      }
    }
  } else if (curriculum === 'legacy') {
    for (const fa of FA_REQUIREMENTS) {
      if (s.unfulfilledFA.includes(fa.id)) {
        notes.push({ severity: 'warning', source: 'Foundational Approach', text: `${fa.label}: not yet satisfied.` })
      }
    }
    for (const sec of SECTORS) {
      if (s.unfulfilledSec.includes(sec.id)) {
        notes.push({ severity: 'warning', source: 'Sector', text: `${sec.label}: not yet satisfied.` })
      }
    }
  }

  if (notes.length === 0) {
    notes.push({
      severity: 'info',
      source: 'All clear',
      text: 'No load or requirement issues. Every semester is within policy and every tracked requirement is planned.',
    })
  }

  const rank: Record<NoteSeverity, number> = { error: 0, warning: 1, info: 2 }
  return notes.sort((a, b) => rank[a.severity] - rank[b.severity])
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
