// STAGE 6 — ported verbatim from references/old-app/index.html (~1907-1945).

import { lookupCourse } from '../../data/courses';
import type { FaId, Major, SectorId } from '../../data/types';
import type { SchedulerPlan } from '../types';

export interface ComputeFulfillmentContext {
  sasMajor: Major;
}

/**
 * STAGE 6: Determine which FAs and Sectors are fulfilled by placed courses,
 * using both the per-major metadata AND the global course registry.
 */
export function computeFulfillment(
  plan: SchedulerPlan,
  { sasMajor }: ComputeFulfillmentContext,
): SchedulerPlan {
  const fulfilledFA = new Set<FaId>();
  const fulfilledSec = new Set<SectorId>();

  // Auto-complete major's home sector
  if (sasMajor.autoSector) fulfilledSec.add(sasMajor.autoSector);
  // VIPR 1200/1210 grant Sector VII
  fulfilledSec.add('VII');

  // Walk placed courses (including credited) and use their FA/Sector attributes
  for (const code of Object.keys(plan.placement)) {
    const c = lookupCourse(code);
    if (!c) continue;
    if (c.fa) fulfilledFA.add(c.fa);
    if (c.sec) fulfilledSec.add(c.sec);
  }

  // Walk placed gen-ed SLOTS — their `intent` declares what they fulfill,
  // so the tracker shows green even when the slot holds a generic placeholder.
  // Users pick specific courses for each slot via the swap modal; the intent
  // is the contract even before a specific course is chosen.
  for (const sem of Object.values(plan.semesters)) {
    for (const entry of sem) {
      if (entry.intent?.fa) fulfilledFA.add(entry.intent.fa);
      if (entry.intent?.sec) fulfilledSec.add(entry.intent.sec);
    }
  }

  // Language: fulfilled by AP/fluency or by 4 semesters of language courses
  if (plan.meta.creditFlags?.has('LANG_FL')) fulfilledFA.add('FL');

  plan.meta.fulfilledFA = fulfilledFA;
  plan.meta.fulfilledSec = fulfilledSec;
  return plan;
}
