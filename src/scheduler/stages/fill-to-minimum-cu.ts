// STAGE 10b — ported verbatim from references/old-app/index.html (~2436-2533).

import { VIPER_PROGRAM } from '../../data/viper-program';
import type { SemesterKey } from '../../data/semesters';
import { REGULAR_SEMESTER_KEYS, TARGET_HARD_CAP, addCourse, roundCU } from '../helpers';
import type { SchedulerCourse, SchedulerPlan } from '../types';

/**
 * STAGE 10b: Ensure total CU reaches the dual-degree minimum (46 CU).
 * If short, adds generic "Free Elective" placeholder slots in lightest semesters.
 *
 * Also TRIMS surplus when the plan is already well above the 46 CU minimum and
 * has unused elective slots (Free Electives or unused concentration slots) that
 * can be safely removed. This keeps NCC plans from inflating past 55 CU.
 */
export function fillToMinimumCU(plan: SchedulerPlan): SchedulerPlan {
  let total = 0;
  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem) total += c.cu;
  }
  const target = VIPER_PROGRAM.minTotalCU;
  let fillCount = 0;
  while (total < target && fillCount < 6) {
    // Find lightest semester in junior/senior years
    let best: SemesterKey | null = null;
    let bestLoad = Infinity;
    for (let i = 2; i < REGULAR_SEMESTER_KEYS.length; i++) {
      const k = REGULAR_SEMESTER_KEYS[i]!;
      if ((plan.loads[k] || 0) < bestLoad && (plan.loads[k] || 0) + 1 <= TARGET_HARD_CAP) {
        best = k;
        bestLoad = plan.loads[k] || 0;
      }
    }
    if (!best) break;
    addCourse(plan, best, {
      code: `FREE ${fillCount + 1}`,
      title: 'Free Elective',
      cu: 1,
      category: 'seas',
      tags: ['FREE'],
      isElective: true,
      slotId: `free-${fillCount + 1}`,
      slotLabel: 'Free Elective',
      note: 'Added to meet 46 CU dual-degree minimum. Swap for any course of interest.',
    });
    total += 1;
    fillCount++;
  }

  // TRIM PASS: if we've overshot (>= 48 CU) AND have excess electives that
  // aren't helping any specific requirement, remove them to reduce overload.
  // Protect: required cores, VIPER courses, double-counts, energy courses
  // (if already at exactly 3), gen-ed Foundation slots, placed overrides, AND
  // any course placed by a major's sampleSchedule (traditional path protection).
  const ENERGY_KEEP = VIPER_PROGRAM.minEnergyCourses;
  const SOFT_CAP = 50; // trim down toward 48-50 CU range
  const preferredSem = plan.meta.preferredSem || {};
  const isTrimCandidate = (c: SchedulerCourse): boolean => {
    if (c.category === 'viper') return false;
    if (c.isDouble) return false;
    // Traditional-path protection: if this course is in the sample schedule,
    // never trim it — even if it technically looks like an elective.
    if (c.code && preferredSem[c.code]) return false;
    // Foundation + distribution slots are REQUIRED gen-eds — never trim.
    // Without these, the student literally hasn't satisfied NCC.
    if (c.slotId && c.slotId.startsWith('ncc-')) return false;
    // OCC gen-ed slots (sectors + FAs) are also required for graduation —
    // protect them. The student needs every Sector and FA they have.
    if (c.slotId && c.slotId.startsWith('gened-')) return false;
    if (c.tags?.includes('FREE')) return true;
    // Unused concentration slots (pool-backed but user didn't explicitly choose)
    if (c.isElective && c.slotId && !plan.meta.overrides?.[c.slotId]) {
      // Don't trim if this is the energy minimum keeper
      if (c.isEnergy) {
        const currentEnergyCount = Object.values(plan.semesters)
          .flat()
          .filter((x) => x.isEnergy).length;
        if (currentEnergyCount <= ENERGY_KEEP) return false;
      }
      return true;
    }
    return false;
  };

  // Only trim if we're meaningfully over minimum
  while (total > SOFT_CAP) {
    // Find the heaviest semester that has a trim candidate
    let victim: SchedulerCourse | null = null;
    let victimSem: SemesterKey | null = null;
    let heaviestLoad = 0;
    for (const [k, sem] of Object.entries(plan.semesters) as [SemesterKey, SchedulerCourse[]][]) {
      if ((plan.loads[k] || 0) <= heaviestLoad) continue;
      const candidate = sem.find(isTrimCandidate);
      if (candidate) {
        victim = candidate;
        victimSem = k;
        heaviestLoad = plan.loads[k];
      }
    }
    if (!victim || !victimSem) break;
    // Remove it
    plan.semesters[victimSem] = plan.semesters[victimSem].filter((c) => c !== victim);
    plan.loads[victimSem] = roundCU(plan.loads[victimSem] - victim.cu);
    if (victim.code && victim.code !== '—') delete plan.placement[victim.code];
    total -= victim.cu;
  }

  return plan;
}
