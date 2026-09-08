import type { AugmentedPlan, FoundationId } from './types'
import { normalizeViperMods } from '../ncc/mods'
import type { DistributionTargets, ViperModsInput } from '../ncc/types'

/**
 * Student-facing New College Curriculum audit, read straight off the plan.
 *
 * The scheduler seeds old-curriculum (FA / Sector) slots, so NCC coverage
 * is whatever the student has planned: an open slot or a course whose
 * intent (from a slot definition or the student's own Tags) names a
 * Foundation or a distribution division. "Planned" is the honest word —
 * a slot counts because the student has set aside a term for it, not
 * because a course has been approved.
 *
 * VIPER mods (admin sandbox) can waive Foundations; those show as waived
 * so the student is not asked to plan something policy has removed.
 */

export type NccFoundationState = 'planned' | 'waived' | 'credit' | 'missing'

export interface NccFoundationAudit {
  id: FoundationId
  label: string
  state: NccFoundationState
  /** What satisfies it — a course code, a slot label, or the waiver source. */
  by: string | null
}

export interface NccDivisionAudit {
  id: 'SS' | 'H'
  label: string
  planned: number
  target: number
}

export interface NccAudit {
  foundations: NccFoundationAudit[]
  plannedFoundations: number
  divisions: NccDivisionAudit[]
}

export const NCC_FOUNDATION_LABELS: Record<FoundationId, string> = {
  'ncc-kite': 'Kite',
  'ncc-key': 'Key',
  'ncc-fys': 'First-Year Seminar',
  'ncc-writ': 'Writing Seminar',
  'ncc-pad': 'Perspectives and Difference',
  'ncc-lang': 'Language',
}

const FOUNDATION_ORDER: FoundationId[] = [
  'ncc-kite',
  'ncc-key',
  'ncc-fys',
  'ncc-writ',
  'ncc-pad',
  'ncc-lang',
]

export function computeNccAudit(
  plan: AugmentedPlan,
  targets: DistributionTargets,
  viperMods?: ViperModsInput,
  apCreditIds: readonly string[] = [],
): NccAudit {
  const mods = normalizeViperMods(viperMods)
  const courses = Object.values(plan.semesters).flat()

  const waivedBy: Partial<Record<FoundationId, string>> = {}
  if (mods.kiteFullWaiver || mods.viprKiteWaiver)
    waivedBy['ncc-kite'] = mods.viprKiteWaiver ? 'VIPR 1300' : 'committee waiver'
  if (mods.keyWaiver) waivedBy['ncc-key'] = 'VIPR 1200 / 1210'
  if (mods.fysWaiver) waivedBy['ncc-fys'] = 'VIPR 1200 / 1210'
  if (mods.pdWaiver) waivedBy['ncc-pad'] = 'VIPR 1300'
  if (mods.langWaiver) waivedBy['ncc-lang'] = 'committee waiver'

  const foundations: NccFoundationAudit[] = FOUNDATION_ORDER.map((id) => {
    const label = NCC_FOUNDATION_LABELS[id]
    const waiver = waivedBy[id]
    if (waiver) return { id, label, state: 'waived', by: waiver }
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
    const by = hit.isPlaceholder || hit.code.startsWith('—') ? `open slot · ${hit.title}` : hit.code
    return { id, label, state: 'planned', by }
  })

  // Distribution: SS and H only — the 12 CU Natural Sciences target is
  // covered by the engineering major and is not the student's own work.
  const planned = { SS: 0, H: 0 }
  for (const c of courses) {
    const d = c.intent?.distribution
    if (d === 'SS' || d === 'H') planned[d] += c.cu || 0
  }
  // Double-count mods let Foundations satisfy distribution CU.
  const kite = foundations.find((f) => f.id === 'ncc-kite')
  if (mods.doubleCountKite && kite?.state === 'planned') planned.H += 1
  const writ = foundations.find((f) => f.id === 'ncc-writ')
  if (mods.doubleCountWriting && writ?.state === 'planned') planned.H += 1
  if (mods.doubleCountVIPR1300) {
    const vipr = courses
      .filter((c) => c.code === 'VIPR 1300')
      .reduce((s, c) => s + (c.cu || 0), 0)
    planned.SS += Math.min(2, vipr)
  }

  const divisions: NccDivisionAudit[] = [
    { id: 'SS', label: 'Social Sciences', planned: round1(planned.SS), target: targets.SS },
    { id: 'H', label: 'Humanities', planned: round1(planned.H), target: targets.H },
  ]

  return {
    foundations,
    plannedFoundations: foundations.filter((f) => f.state !== 'missing').length,
    divisions,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
