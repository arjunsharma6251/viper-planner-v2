// The NCC scheduler module — ported verbatim from references/old-app/index.html
// (divisionForCode ~3536, NCC_FOUNDATIONS ~3548, NCC_GENED_SLOTS ~3605,
// countGenEds ~3865, baselineGenEdCount ~4096, computeNCCDistribution ~4103,
// runNCCChecks ~4165). The old app exposed these on window.NCC; the scheduler
// now reaches them through registerNccModule() (src/scheduler/helpers.ts).
//
// Labels were updated to the College's own names (Perspectives and
// Difference, Critical Writing) — see CLAUDE.md § OCC vs NCC.

import { semesterLabel } from '../data/semesters'
import { registerNccModule } from '../scheduler/helpers'
import type {
  GenEdSlotLike,
  NccFoundationDef,
  NccModule,
  SchedulerPlan,
  ViperMods as SchedulerViperMods,
} from '../scheduler/types'
import { normalizeViperMods } from './mods'
import type { DistributionTargets, ViperMods, ViperModsInput } from './types'

/** The scheduler's loose flag record → the ncc module's full ViperMods. */
type ModsArg = SchedulerViperMods | ViperMods | boolean | null | undefined
function norm(mods: ModsArg): ViperMods {
  return normalizeViperMods(mods as ViperModsInput)
}

// ---- Division classification from course code prefix ----
const NATURAL_PREFIXES = ['MATH','PHYS','CHEM','BIOL','MSE','CBE','MEAM','ESE','CIS',
                          'EESC','ENGR','EAS','ENM','STAT','ENVS','VIPR','BIOE','ASTR']
const SOCSCI_PREFIXES  = ['SOCI','ECON','PSYC','STSC','LGST','PSCI','ANTH','URBS','COMM']
const HUMANITIES_PREFIXES = ['ENGL','HIST','ARTH','MUSC','CLST','RELS','CIMS','PHIL',
                              'WRIT','SAST','AFRC','ASAM','LING','THAR','NELC','GSWS',
                              'GRMN','FREN','SPAN','ITAL','RUSS','ARAB','CHIN','JPAN',
                              'LATN','GREK','HEBR','KREN','PORT','YDSH']

export type Division = 'N' | 'SS' | 'H'

export function divisionForCode(code: string | null | undefined): Division | null {
  if (!code) return null
  const prefix = code.split(' ')[0] ?? ''
  if (NATURAL_PREFIXES.includes(prefix)) return 'N'
  if (SOCSCI_PREFIXES.includes(prefix)) return 'SS'
  if (HUMANITIES_PREFIXES.includes(prefix)) return 'H'
  return null
}

export function divLabel(key: Division): string {
  return key === 'N' ? 'Natural Sciences' : key === 'SS' ? 'Social Sciences' : 'Humanities & Arts'
}

// ---- NCC Foundations ----
export interface NccFoundation extends NccFoundationDef {
  label: string
  cu: number
  note: string
  satisfiedByViper: { code: string; rationale: string } | null
  labWaivable?: boolean
  viperWaivable?: boolean
}

export const NCC_FOUNDATIONS: readonly NccFoundation[] = [
  {
    id: 'ncc-writ',
    label: 'Critical Writing',
    cu: 1,
    note: 'Completed as usual — VIPER does not waive.',
    satisfiedByViper: null,
  },
  {
    id: 'ncc-fys',
    label: 'First-Year Seminar',
    cu: 1,
    note: 'Small discussion course.',
    satisfiedByViper: { code: 'VIPR 1200', rationale: 'Approved VIPER overlap: VIPR 1200/1210 provide the FYS experience.' },
  },
  {
    id: 'ncc-key',
    label: 'Key (Quantitative Reasoning)',
    cu: 1,
    note: 'Includes 3-hour lab component.',
    satisfiedByViper: { code: 'VIPR 1210', rationale: 'Proposed VIPER modification: VIPR 1210 provides the Key experience (needs approval).' },
  },
  {
    id: 'ncc-kite',
    label: 'Kite (Humanities)',
    cu: 1,
    note: 'Includes 3-hour lab. With VIPER mods: lab may be waived or done asynchronously/summer.',
    satisfiedByViper: null, // Kite itself is still required; only the lab is waivable
    labWaivable: true,
  },
  {
    id: 'ncc-pad',
    label: 'Perspectives and Difference',
    cu: 1,
    note: 'Engages questions of difference and equity.',
    satisfiedByViper: null,
  },
  {
    id: 'ncc-lang',
    label: 'Language (0–2 CU)',
    cu: 1,
    note: 'Varies by placement; up to 2 CU. With VIPER mods: may be waived if curriculum cannot fit in 4 years.',
    satisfiedByViper: null,
    viperWaivable: true,
  },
]

// ---- Generic NCC gen-ed slots (placed by the scheduler) ----
// Each slot declares division (H/SS/N) + foundation id so the tracker credits it.
// placeGenEd filters Foundation slots by the active mods and re-derives the
// distribution fillers from the SS/H targets (see place-gen-ed.ts).
export const NCC_GENED_SLOTS: readonly GenEdSlotLike[] = [
  {
    id: 'ncc-writ',
    label: 'Critical Writing Seminar',
    cu: 1,
    semPref: 'fall-y1',
    intent: { foundation: 'ncc-writ', distribution: 'H' },
    fulfillsDesc: 'Foundation: Critical Writing · counts toward H distribution only with the double-count mod',
    suggests: ['WRIT 0130'],
    note: 'Any Penn WRIT 01xx seminar. Pick a topic that interests you.',
  },
  {
    id: 'ncc-kite',
    label: 'Kite — Humanities Foundation',
    cu: 1,
    semPref: 'spring-y1',
    intent: { foundation: 'ncc-kite', distribution: 'H' },
    fulfillsDesc: 'Foundation: Kite · H distribution only with the double-count mod',
    suggests: [],
    note: 'A humanities course designated as Kite. Includes a 3-hour lab component (waivable under VIPER mods).',
  },
  {
    id: 'ncc-pad',
    label: 'Perspectives and Difference',
    cu: 1,
    semPref: 'fall-y2',
    intent: { foundation: 'ncc-pad', distribution: 'SS' },
    fulfillsDesc: 'Foundation: Perspectives and Difference · may count within the distribution (typically SS)',
    suggests: [],
    note: 'A course engaging questions of difference and equity.',
  },
  // Distribution-only slots (no Foundation) — placed later in the plan.
  // placeGenEd replaces these with exactly as many as the targets need.
  {
    id: 'ncc-dist-1',
    label: 'Distribution Elective',
    cu: 1,
    semPref: 'spring-y2',
    intent: { distribution: 'SS' },
    fulfillsDesc: 'Counts toward whichever distribution has remaining target.',
    note: 'Open distribution slot — pick any SS or H course to fill your smallest distribution bucket.',
  },
  {
    id: 'ncc-dist-2',
    label: 'Distribution Elective',
    cu: 1,
    semPref: 'fall-y3',
    intent: { distribution: 'SS' },
    fulfillsDesc: 'Counts toward whichever distribution has remaining target.',
    note: 'Open distribution slot.',
  },
  {
    id: 'ncc-dist-3',
    label: 'Distribution Elective',
    cu: 1,
    semPref: 'spring-y3',
    intent: { distribution: 'H' },
    fulfillsDesc: 'Counts toward whichever distribution has remaining target.',
    note: 'Open distribution slot.',
  },
  {
    id: 'ncc-dist-4',
    label: 'Distribution Elective',
    cu: 1,
    semPref: 'fall-y4',
    intent: { distribution: 'SS' },
    fulfillsDesc: 'Counts toward whichever distribution has remaining target.',
    note: 'Open distribution slot.',
  },
]

// ---- Distribution accounting ----
export interface NccDistributionResult {
  cuByDiv: Record<Division, number>
  targets: DistributionTargets
  meetsAll: boolean
  shortfall: Record<Division, number>
}

const DEFAULT_TARGETS: DistributionTargets = { N: 12, SS: 5, H: 3 }

export function computeNCCDistribution(
  plan: SchedulerPlan,
  targets: DistributionTargets | undefined,
  viperMods: ModsArg,
): NccDistributionResult {
  const t = targets ?? DEFAULT_TARGETS
  const mods = norm(viperMods)
  const cuByDiv: Record<Division, number> = { N: 0, SS: 0, H: 0 }

  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem) {
      // Use slot intent first (Foundation slots declare division).
      // Intent-division only applies if the underlying mod is enabled.
      const slotId = c.slotId
      const intentDiv = c.intent?.distribution as Division | undefined
      if (intentDiv && intentDiv in cuByDiv) {
        // Per the College chart only First-Year Seminar and Perspectives and
        // Difference may count within the distribution; Writing and Kite do
        // so only under the (unapproved) double-count mods.
        // (Port fix: the old code let Kite fall through to H without the mod.)
        if (slotId === 'ncc-writ' && !mods.doubleCountWriting) {
          // Foundation only.
        } else if (slotId === 'ncc-kite' && !mods.doubleCountKite) {
          // Foundation only.
        } else {
          cuByDiv[intentDiv] += c.cu
        }
        continue
      }
      // VIPER mod: VIPR 1300 CUs → SS distribution (only if doubleCountVIPR1300)
      if (c.code === 'VIPR 1300' && mods.doubleCountVIPR1300) {
        cuByDiv.SS += c.cu
        continue
      }
      // VIPR 1200/1210 count toward N when NOT waiving FYS/Key
      if (c.code === 'VIPR 1200' && !mods.fysWaiver) {
        cuByDiv.N += c.cu
        continue
      }
      if (c.code === 'VIPR 1210' && !mods.keyWaiver) {
        cuByDiv.N += c.cu
        continue
      }
      // Otherwise use prefix-based division
      const div = divisionForCode(c.code)
      if (div) cuByDiv[div] += c.cu
    }
  }

  return {
    cuByDiv,
    targets: t,
    meetsAll: cuByDiv.N >= t.N && cuByDiv.SS >= t.SS && cuByDiv.H >= t.H,
    shortfall: {
      N: Math.max(0, t.N - cuByDiv.N),
      SS: Math.max(0, t.SS - cuByDiv.SS),
      H: Math.max(0, t.H - cuByDiv.H),
    },
  }
}

// ---- Constraint checks for NCC mode ----
export interface NccCheck {
  severity: 'error' | 'warning' | 'info'
  source: string
  msg: string
}

export function runNCCChecks(
  plan: SchedulerPlan,
  targets: DistributionTargets | undefined,
  viperMods: ModsArg,
): NccCheck[] {
  const t = targets ?? DEFAULT_TARGETS
  const mods = norm(viperMods)
  const anyMod = Object.values(mods).some((v) => v)
  const checks: NccCheck[] = []

  // Foundation satisfaction — each foundation checked against its own mod
  for (const f of NCC_FOUNDATIONS) {
    if (f.id === 'ncc-fys' && mods.fysWaiver) continue
    if (f.id === 'ncc-key' && mods.keyWaiver) continue
    if (f.id === 'ncc-lang' && mods.langWaiver) continue
    if (f.id === 'ncc-pad' && mods.pdWaiver) continue
    if (f.id === 'ncc-kite' && mods.kiteFullWaiver) continue

    const satisfiedByViper = f.satisfiedByViper && plan.placement[f.satisfiedByViper.code]
    const slotPlaced = Object.values(plan.semesters).flat().some((c) => c.slotId === f.id)
    if (!satisfiedByViper && !slotPlaced) {
      checks.push({
        severity: 'error',
        source: 'Foundation',
        msg: `${f.label}: not fulfilled. ${anyMod ? '' : 'Without any VIPER modifications, this requires a standalone course.'}`.trim(),
      })
    }
  }

  // Distribution targets
  const dist = computeNCCDistribution(plan, t, mods)
  for (const key of ['N', 'SS', 'H'] as const) {
    const short = dist.shortfall[key]
    if (short > 0) {
      checks.push({
        severity: 'warning',
        source: 'Distribution',
        msg: `${divLabel(key)}: ${dist.cuByDiv[key].toFixed(1)} / ${t[key]} CU (need ${short.toFixed(1)} more).`,
      })
    }
  }

  // BA minimum (36 CU under NCC, minus VIPER audit waiver if enabled).
  // (Port fix: computed here because runNCCChecks runs while the summary
  // is still being assembled, so plan.summary.sasCU is not available yet.
  // Same counting rule as compute-summary: SAS core, cross-degree, gen-ed.)
  const baMin = 36 - (mods.aandsCUWaiver ? 3 : 0)
  let baCU = 0
  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem) {
      if (c.category === 'sas' || c.category === 'both' || c.category === 'gened') baCU += c.cu
    }
  }
  if (baCU < baMin) {
    checks.push({
      severity: 'warning',
      source: 'BA minimum',
      msg: `BA CU: ${baCU.toFixed(1)} / ${baMin}. ${mods.aandsCUWaiver ? 'VIPER audit waiver of up to 3 CU applied.' : 'Without audit waiver, full 36 CU required.'}`,
    })
  }

  // Semester ceiling — tiered per Penn policy
  for (const [sem, cu] of Object.entries(plan.loads || {})) {
    const label = semesterLabel(sem as never).season
    if (cu > 7.5) {
      checks.push({ severity: 'error', source: 'Policy max',
        msg: `${label}: ${cu} CU exceeds Penn's 7.5 CU university-wide hard cap. Requires school-level approval or a summer course.` })
    } else if (cu > 6.5) {
      checks.push({ severity: 'warning', source: 'Approval required',
        msg: `${label}: ${cu} CU requires Faculty Advisor Sign-off (SEAS) or CU increase request (College).` })
    } else if (cu > 5.5) {
      checks.push({ severity: 'warning', source: 'Dual overload',
        msg: `${label}: ${cu} CU — expected VIPER dual-degree overload; still requires form.` })
    }
  }

  // Force-placed courses (required courses that had to be placed over-cap)
  for (const c of plan.summary?.exceedsMaxCourses ?? []) {
    const label = semesterLabel(c.sem as never).season
    checks.push({ severity: 'error', source: 'Force-placed',
      msg: `${c.code || 'Foundation slot'} (${c.title}) had to be placed in ${label} above policy max — this is what would need curriculum committee approval.` })
  }

  if (checks.length === 0) {
    checks.push({ severity: 'info', source: 'Status', msg: 'All NCC requirements met; no constraint violations.' })
  }
  return checks
}

export function countGenEds(plan: SchedulerPlan): number {
  let n = 0
  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem) if (c.category === 'gened') n++
  }
  // summerFoundation mod: one Foundation may be completed in summer, so it
  // doesn't count against the in-term gen-ed load.
  const mods = norm(plan.meta?.viperMods)
  if (mods.summerFoundation && n > 0) n -= 1
  return n
}

export function baselineGenEdCount(targets: DistributionTargets | undefined): number {
  const t = targets ?? DEFAULT_TARGETS
  return 6 + t.SS + t.H
}

export const NCC_SCHEDULER_MODULE: NccModule = {
  normalizeViperMods: (mods) => norm(mods) as unknown as SchedulerViperMods,
  NCC_GENED_SLOTS,
  NCC_FOUNDATIONS,
  computeNCCDistribution,
  runNCCChecks,
  countGenEds,
  baselineGenEdCount,
}

/** Idempotent: safe to call from app entry and from tests. */
export function installNccModule(): void {
  registerNccModule(NCC_SCHEDULER_MODULE)
}
