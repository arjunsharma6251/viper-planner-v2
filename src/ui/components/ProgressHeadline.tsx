import type { PlanSummary } from '../../plan/types'
import { SECTORS, FA_REQUIREMENTS } from '../../data/requirements'

/**
 * The stat strip under the masthead: serif numerals with small-caps
 * labels, separated by hairline columns — numbers speak, no prose.
 */
export function ProgressHeadline({ summary }: { summary: PlanSummary }) {
  const stats: Array<{ value: string; label: string }> = [
    { value: `${summary.totalCU}`, label: 'of 40 CU placed' },
    { value: `${summary.fulfilledSec.length}`, label: `of ${SECTORS.length} sectors` },
    {
      value: `${summary.fulfilledFA.length}`,
      label: `of ${FA_REQUIREMENTS.length} approaches`,
    },
    { value: `${Math.min(summary.energyCoursesCount, 3)}`, label: 'of 3 energy' },
  ]
  return (
    <div className="flex items-baseline">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={[
            'flex items-baseline gap-1.5',
            i > 0 ? 'ml-5 border-l border-rule/70 pl-5' : '',
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
