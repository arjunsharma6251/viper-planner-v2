// STAGE 1 — ported verbatim from references/old-app/index.html (~1640-1670).

import { AP_CREDITS } from '../../data/ap-credits';
import type { SchedulerPlan } from '../types';

export interface ApplyCreditsContext {
  sasMajorKey: string;
  seasMajorKey: string;
  gradYear?: number | null;
}

/**
 * STAGE 1: Resolve AP/placement credit into the plan's placement map.
 */
export function applyCredits(
  plan: SchedulerPlan,
  apCreditIds: readonly string[],
  { gradYear }: ApplyCreditsContext,
): SchedulerPlan {
  const flags = new Set<string>();
  for (const id of apCreditIds) {
    const cred = AP_CREDITS.find((c) => c.id === id);
    if (!cred) continue;
    // Resolve grants — some entries (e.g. AP Calc BC) are functions of gradYear.
    const grants =
      typeof cred.grants === 'function' ? cred.grants(gradYear) : cred.grants;
    for (const g of grants) {
      if (g === 'LANG_FL' || g === 'STAT_WAIVER' || g === 'ECON_WAIVER' || g === 'EAS_0091') {
        flags.add(g);
      } else {
        plan.placement[g] = 'credit';
      }
    }
  }
  plan.meta.creditFlags = flags;
  return plan;
}
