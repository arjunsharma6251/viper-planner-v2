// STAGE 2 — ported verbatim from references/old-app/index.html (~1672-1688).

import { VIPER_PROGRAM } from '../../data/viper-program';
import { addCourse } from '../helpers';
import type { SchedulerPlan } from '../types';

/**
 * STAGE 2: Place fixed VIPER courses (VIPR 1200, 1210, 1300×8 spanning
 * in-term + summer). The `fixed` flag is honored per-entry; defaults
 * to true. Summer Y2 and Y3 VIPR 1300 are placed but NOT fixed, so
 * students who don't plan to continue into those summers can delete them.
 */
export function placeVIPER(plan: SchedulerPlan): SchedulerPlan {
  for (const v of VIPER_PROGRAM.fixedCourses) {
    const isFixed = v.fixed !== false; // default true
    addCourse(plan, v.semKey, {
      code: v.code,
      title: v.title,
      cu: v.cu,
      category: 'viper',
      tags: ['VIPER'],
      note: v.note || null,
      fixed: isFixed,
    });
  }
  return plan;
}
