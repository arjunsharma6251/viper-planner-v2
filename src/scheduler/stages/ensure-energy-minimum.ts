// STAGE 10 — ported verbatim from references/old-app/index.html (~2396-2434).

import { courseEntry } from '../../data/courses';
import { VIPER_PROGRAM } from '../../data/viper-program';
import { TARGET_HARD_CAP, addCourse, findLightestFitting } from '../helpers';
import type { SchedulerPlan } from '../types';

/**
 * STAGE 10: Ensure we have ≥ 3 energy courses. If short, add fallback picks.
 * Two-pass: first try light semesters under TARGET_HARD_CAP, then relax to
 * allow up to 8.5 CU if we still can't hit 3. Better to have a slightly heavy
 * semester than to miss the VIPER energy requirement.
 */
export function ensureEnergyMinimum(plan: SchedulerPlan): SchedulerPlan {
  let count = 0;
  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem) if (c.isEnergy) count++;
  }
  if (count >= VIPER_PROGRAM.minEnergyCourses) {
    plan.meta.energyCount = count;
    return plan;
  }

  const fillerCandidates = [
    'EAS 4010',
    'CBE 3250',
    'MSE 5450',
    'MEAM 5020',
    'EAS 3010',
    'EAS 4020',
    'CBE 5450',
  ];
  const tryFill = (maxLoad: number) => {
    for (const code of fillerCandidates) {
      if (count >= VIPER_PROGRAM.minEnergyCourses) break;
      if (plan.placement[code]) continue;
      const data = courseEntry(code);
      const slot = findLightestFitting(data, plan, 2, maxLoad);
      if (!slot) continue;
      // A suggestion, not a requirement (2026-11 beta feedback: "why is CBE
      // 3250 in my plan?"). It sits in a swappable slot whose picks are the
      // other fallback energy courses.
      addCourse(plan, slot, {
        ...data,
        category: 'seas',
        tags: ['SEAS', 'ENERGY', 'VIPER-req'],
        isElective: true,
        isEnergy: true,
        slotId: `viper-energy-${count + 1}`,
        slotLabel: 'VIPER energy course · suggested pick',
        pool: fillerCandidates,
        note: "A suggested pick toward VIPER's 3 energy courses. Any VIPER energy course works: swap it for another below, or replace it with one you prefer.",
      });
      count++;
    }
  };
  tryFill(TARGET_HARD_CAP); // first pass: strict 7.5 CU cap
  if (count < VIPER_PROGRAM.minEnergyCourses) tryFill(8.5); // relaxed cap if needed
  plan.meta.energyCount = count;
  return plan;
}
