// STAGE 4 — ported verbatim from references/old-app/index.html (~1704-1739).

import { alternativesFor } from '../../data/seas-catalog';
import type { Major } from '../../data/types';
import type { CoreCode, ResolvedConcentration, SchedulerPlan } from '../types';

export interface CollectCoreCoursesContext {
  sasMajor: Major;
  seasMajor: Major;
  sasConc: ResolvedConcentration;
  seasConc: ResolvedConcentration;
}

/**
 * STAGE 4: Compute the merged core course list across both majors.
 * Courses shared by both majors appear once and are marked as double-counts.
 */
export function collectCoreCourses(
  plan: SchedulerPlan,
  { sasMajor, seasMajor, sasConc, seasConc }: CollectCoreCoursesContext,
): SchedulerPlan {
  const sasCodes = [...sasMajor.sharedCore, ...(sasConc.extraCore || [])];
  const seasCodes = [...seasMajor.sharedCore, ...(seasConc.extraCore || [])];
  // Inject thermo for MATH+CIS
  if (
    plan.meta.requiredThermo &&
    !sasCodes.includes(plan.meta.requiredThermo) &&
    !seasCodes.includes(plan.meta.requiredThermo)
  ) {
    sasCodes.push(plan.meta.requiredThermo);
  }

  // Pairing substitutions (majors.ts `substitutions`, context "SAS-SEAS combo"):
  // when the BSE already requires the substitute, the BA course it replaces
  // is not seeded and the substitute counts for both degrees (2026-11:
  // CHEM+CBE planned both CHEM 2220 and CBE 3530).
  const coreNotes: Record<string, string> = {};
  const pair = `${sasMajor.code}-${seasMajor.code} combo`;
  for (const sub of sasMajor.substitutions ?? []) {
    if (sub.context !== pair || !seasCodes.includes(sub.to)) continue;
    const at = sasCodes.indexOf(sub.from);
    if (at < 0) continue;
    sasCodes.splice(at, 1, sub.to);
    if (sub.note) coreNotes[sub.to] = sub.note;
  }

  const seen = new Map<string, CoreCode>();
  const doubleCounted = new Set<string>();
  for (const code of sasCodes) {
    seen.set(code, { code, sas: true, seas: false });
  }
  // Catalog alternatives (src/data/seas-catalog.ts, 2026-11-12): when the BA
  // core already holds a course the BSE accepts in place of one of its own
  // (PHYS 0150 for PHYS 0140, CHEM 2411 for CHEM 2410), that course counts
  // for both and the BSE course is not seeded; likewise when incoming credit
  // covers an accepted alternative.
  const seasKey = seasMajor.code;
  for (let i = seasCodes.length - 1; i >= 0; i--) {
    const code = seasCodes[i]!;
    if (seen.has(code)) continue;
    const alts = alternativesFor(seasKey, code);
    const inBa = alts.find((a) => seen.get(a)?.sas);
    if (inBa) {
      seen.get(inBa)!.seas = true;
      doubleCounted.add(inBa);
      seasCodes.splice(i, 1);
      continue;
    }
    if (alts.some((a) => plan.placement[a] === 'credit')) seasCodes.splice(i, 1);
  }
  for (const code of seasCodes) {
    if (seen.has(code)) {
      seen.get(code)!.seas = true;
      doubleCounted.add(code);
    } else {
      seen.set(code, { code, sas: false, seas: true });
    }
  }

  plan.meta.coreCodes = Array.from(seen.values());
  plan.meta.doubleCounted = doubleCounted;
  plan.meta.coreNotes = coreNotes;
  return plan;
}
