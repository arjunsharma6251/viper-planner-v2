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
  { sasMajorKey, seasMajorKey, gradYear }: ApplyCreditsContext,
): SchedulerPlan {
  const flags = new Set<string>();
  for (const id of apCreditIds) {
    const cred = AP_CREDITS.find((c) => c.id === id);
    if (!cred) continue;
    // Resolve grants — some entries (e.g. AP Calc BC) are functions of gradYear.
    const grants =
      typeof cred.grants === 'function' ? cred.grants(gradYear) : cred.grants;
    for (const g of grants) {
      if (g === 'LANG_FL' || g === 'STAT_WAIVER' || g === 'EAS_0091') {
        flags.add(g);
      } else {
        // Refuse AP-Chem-based credit for CHEM/CBE majors
        if (
          (g === 'CHEM 1012' || g === 'CHEM 1022') &&
          (seasMajorKey === 'CBE' || sasMajorKey === 'CHEM') &&
          id === 'ap-chem'
        ) {
          plan.notes.push({
            level: 'warning',
            src: 'AP Chem',
            text: `AP Chemistry (EAS 0091) is not accepted by ${sasMajorKey === 'CHEM' ? 'CHEM' : 'CBE'}. Use the Penn CHEM placement exam instead.`,
          });
          continue;
        }
        plan.placement[g] = 'credit';
      }
    }
  }
  plan.meta.creditFlags = flags;
  return plan;
}
