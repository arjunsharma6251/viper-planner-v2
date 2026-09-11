import type { PlanSummary } from '../../plan/types'
import type { NccAudit } from '../../plan/ncc-audit'
import { SECTORS, FA_REQUIREMENTS } from '../../data/requirements'

/**
 * The stat strip under the masthead: serif numerals with small-caps
 * labels, separated by hairline columns — numbers speak, no prose.
 */
export function ProgressHeadline({ summary, ncc }: { summary: PlanSummary; ncc?: NccAudit }) {
  // Under the NCC the headline is Foundations + distribution; under the old
  // core it is Sectors + Foundational Approaches.
  const curriculumStats: Array<{ value: string; label: string }> = ncc
    ? [
        { value: `${ncc.plannedFoundations}`, label: `of ${ncc.foundations.length} foundations` },
        {
          value: `${ncc.divisions.reduce((s, d) => s + Math.min(d.planned, d.target), 0)}`,
          label: `of ${ncc.divisions.reduce((s, d) => s + d.target, 0)} CU distribution`,
        },
      ]
    : [
        { value: `${summary.fulfilledSec.length}`, label: `of ${SECTORS.length} sectors` },
        {
          value: `${summary.fulfilledFA.length}`,
          label: `of ${FA_REQUIREMENTS.length} approaches`,
        },
      ]
  const stats: Array<{ value: string; label: string }> = [
    { value: `${summary.totalCU}`, label: 'of 40 CU placed' },
    ...curriculumStats,
    { value: `${Math.min(summary.energyCoursesCount, 3)}`, label: 'of 3 energy' },
  ]
  // Phones get a 2×2 block; wider screens the single hairline-divided strip.
  return (
    <div className="grid grid-cols-2 gap-y-2 sm:flex sm:items-baseline">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={[
            'flex items-baseline gap-1.5 whitespace-nowrap',
            i % 2 === 1 ? 'ml-4 border-l border-rule/70 pl-4' : '',
            i > 0 ? 'sm:ml-5 sm:border-l sm:border-rule/70 sm:pl-5' : '',
          ].join(' ')}
        >
          <span className="tnum font-display text-[1.4375rem] leading-none font-semibold text-penn-blue">
            {s.value}
          </span>
          <span className="smallcaps !text-[0.625rem]">{s.label}</span>
        </div>
      ))}
    </div>
  )
}
