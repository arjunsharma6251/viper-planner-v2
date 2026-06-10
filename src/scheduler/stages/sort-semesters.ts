// STAGE 12 — ported verbatim from references/old-app/index.html (~2647-2661).
// Note: only the 8 in-term semesters are sorted, exactly as the old code did
// (summer semesters keep their fixedCourses insertion order).

import { SEMESTER_KEYS } from '../../data/semesters';
import type { SchedulerPlan } from '../types';

/**
 * STAGE 12: Sort each semester's courses for consistent display.
 */
export function sortSemesters(plan: SchedulerPlan): SchedulerPlan {
  const order: Record<string, number> = { viper: 0, both: 1, sas: 2, seas: 3, gened: 4 };
  for (const key of SEMESTER_KEYS) {
    plan.semesters[key].sort((a, b) => {
      const oa = (a.category ? order[a.category] : undefined) ?? 5;
      const ob = (b.category ? order[b.category] : undefined) ?? 5;
      if (oa !== ob) return oa - ob;
      return a.code.localeCompare(b.code);
    });
  }
  return plan;
}
