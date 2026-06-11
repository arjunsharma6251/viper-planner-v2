import type { PlanSummary } from '../../plan/types'
import { SECTORS, FA_REQUIREMENTS } from '../../data/requirements'

/**
 * Goal-gradient strip near the top: "38 of 40 CU placed · 6 of 7 sectors
 * satisfied". Numbers speak; no prose.
 */
export function ProgressHeadline({ summary }: { summary: PlanSummary }) {
  const items = [
    `${summary.totalCU} of 40 CU placed`,
    `${summary.fulfilledSec.length} of ${SECTORS.length} sectors satisfied`,
    `${summary.fulfilledFA.length} of ${FA_REQUIREMENTS.length} foundational approaches`,
    `${Math.min(summary.energyCoursesCount, 3)} of 3 energy courses`,
  ]
  return (
    <p className="font-mono text-xs text-ink/60">
      {items.join(' · ')}
    </p>
  )
}
