// STAGE 3 — ported verbatim from references/old-app/index.html (~1690-1702).

import type { SchedulerPlan } from '../types';

export interface InjectThermoContext {
  sasMajorKey: string;
  seasMajorKey: string;
}

/**
 * STAGE 3: Inject thermodynamics course if MATH+CIS combo requires it.
 */
export function injectThermoIfNeeded(
  plan: SchedulerPlan,
  { sasMajorKey, seasMajorKey }: InjectThermoContext,
): SchedulerPlan {
  if (sasMajorKey !== 'MATH' || seasMajorKey !== 'CIS') return plan;
  // PHYS 1230 is the default choice (smallest footprint)
  plan.meta.requiredThermo = 'PHYS 1230';
  plan.notes.push({
    level: 'policy',
    src: 'VIPER',
    text: `MATH+CIS combo requires one thermodynamics course. PHYS 1230 added by default — may be swapped for MEAM 2030, MSE 2600, or CHEM 2220.`,
  });
  return plan;
}
