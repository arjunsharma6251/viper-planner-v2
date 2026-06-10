// STAGE 8 — ported verbatim from references/old-app/index.html (~2248-2263).

import { SECTOR_VI_FALLBACK } from '../../data/requirements';
import type { Major } from '../../data/types';
import type { SchedulerPlan } from '../types';

export interface BackfillSectorVIContext {
  sasMajor: Major;
  seasMajor: Major;
}

/**
 * STAGE 8: If Sector VI isn't auto-completed (MATH/CIS/ESE combos without PHYS/CHEM),
 * note it — it should already be covered by PHYS 0150 or CHEM 1012 if either is
 * required by one of the majors.
 */
export function backfillSectorVI(
  plan: SchedulerPlan,
  _ctx: BackfillSectorVIContext,
): SchedulerPlan {
  if (plan.meta.fulfilledSec!.has('VI')) return plan;
  // See if PHYS 0150 or CHEM 1012 is already placed
  for (const fallback of SECTOR_VI_FALLBACK) {
    if (plan.placement[fallback]) {
      plan.meta.fulfilledSec!.add('VI');
      return plan;
    }
  }
  return plan;
}
