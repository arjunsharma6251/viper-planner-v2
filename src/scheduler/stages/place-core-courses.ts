// STAGE 5 — ported verbatim from references/old-app/index.html (~1741-1898).

import { courseEntry } from '../../data/courses';
import type { CourseEntry } from '../../data/types';
import type { SemesterKey } from '../../data/semesters';
import {
  REGULAR_SEMESTER_KEYS,
  TARGET_MAX,
  TARGET_HARD_CAP,
  semesterCap,
  addCourse,
  canPlaceInSemester,
  earliestAllowedIdx,
  findBestSemester,
  findLightestFitting,
  isRegularSemKey,
  semBeforeOrEqual,
} from '../helpers';
import type { CoreCode, SchedulerPlan } from '../types';

/** A core-course entry expanded with its catalog data (makeItem). */
interface CoreItem extends CoreCode {
  data: CourseEntry;
}

interface CoreCourseExtras {
  flag?: 'TIGHT' | 'EXCEEDS-MAX';
  warning?: string;
}

/**
 * STAGE 5: Place all merged core courses.
 *
 * Three-phase placement:
 *   Phase 1 — honor sample schedule (Penn's recommended semester) for courses
 *             that have one. Relaxed prereq check: we trust Penn's own ordering,
 *             which implicitly handles coreqs (e.g., CBE 2310 + CBE 3500 same term).
 *   Phase 2 — prereq-based iterative placement for courses without sample-schedule
 *             entries (uncommon once all majors have schedules defined).
 *   Phase 3 — force-place any stragglers in the lightest available semester.
 */
export function placeCoreCourses(plan: SchedulerPlan): SchedulerPlan {
  // Build unified sample-schedule map — earliest preferred semester wins.
  // Custom placements (from drag-drop) override the sample schedule.
  const { sasMajor, seasMajor, sasConc, seasConc, customPlacements = {} } = plan.meta;
  const preferredSem: Record<string, SemesterKey> = {};
  const mergeSchedule = (sched?: Readonly<Record<string, SemesterKey>>) => {
    if (!sched) return;
    for (const [code, sem] of Object.entries(sched)) {
      const cur = preferredSem[code];
      if (!cur || semBeforeOrEqual(sem, cur)) {
        preferredSem[code] = sem;
      }
    }
  };
  mergeSchedule(sasMajor!.sampleSchedule);
  mergeSchedule(sasConc!.sampleSchedule);
  mergeSchedule(seasMajor!.sampleSchedule);
  mergeSchedule(seasConc!.sampleSchedule);
  // User drag-drop overrides win — track which placements are user-explicit
  // so we can honor them even over capacity.
  const userPlaced = new Set<string>();
  for (const [code, sem] of Object.entries(customPlacements)) {
    if (isRegularSemKey(sem)) {
      preferredSem[code] = sem;
      userPlaced.add(code);
    }
  }
  plan.meta.preferredSem = preferredSem;
  plan.meta.userPlacedCodes = userPlaced;

  const makeItem = (c: CoreCode): CoreItem => ({ ...c, data: courseEntry(c.code) });
  const deleted = plan.meta.deletedCourses || new Set<string>();
  const toPlace = plan.meta
    .coreCodes!.filter((c) => plan.placement[c.code] !== 'credit')
    .filter((c) => !deleted.has(c.code)) // skip courses user explicitly deleted
    .map(makeItem);

  // Phase 1: Honor sample schedule entries — but SHIFT FORWARD if AP credits
  // have freed up earlier semesters and prereqs are met.
  // Only shifts when shiftForward is enabled (default true).
  const shiftForward = plan.meta.shiftForward !== false;
  const remaining: CoreItem[] = [];
  for (const item of toPlace) {
    const pref = preferredSem[item.code];
    if (!pref) {
      remaining.push(item);
      continue;
    }
    const prefIdx = REGULAR_SEMESTER_KEYS.indexOf(pref);
    const isUserDrop = userPlaced.has(item.code);

    // Determine the target semester: try shifting earlier if possible.
    // For user-dropped courses, respect their drop location — don't shift.
    let targetSem = pref;
    if (shiftForward && !isUserDrop) {
      const earliestIdx = earliestAllowedIdx(item.data, plan.placement);
      if (earliestIdx !== null && earliestIdx < prefIdx) {
        for (let i = earliestIdx; i < prefIdx; i++) {
          const candidate = REGULAR_SEMESTER_KEYS[i]!;
          if (!canPlaceInSemester(item.data, candidate)) continue;
          if ((plan.loads[candidate] || 0) + item.data.cu > semesterCap(candidate, TARGET_MAX)) continue;
          targetSem = candidate;
          break;
        }
      }
    }

    if (!canPlaceInSemester(item.data, targetSem)) {
      remaining.push(item);
      continue;
    }
    // For user-dropped courses, ALWAYS honor the drop location regardless
    // of capacity. The course gets an EXCEEDS-MAX flag if over policy.
    // Fall Y1 uses the 5.5 CU first-semester cap: a sample-schedule core
    // course that would overload it falls through to prereq-based placement
    // (Phase 2), which finds the earliest term with room.
    if ((plan.loads[targetSem] || 0) + item.data.cu > semesterCap(targetSem, TARGET_HARD_CAP) && !isUserDrop) {
      remaining.push(item);
      continue;
    }
    const overCap = (plan.loads[targetSem] || 0) + item.data.cu > TARGET_HARD_CAP;
    addCoreCourseToSemester(
      plan,
      targetSem,
      item,
      overCap
        ? {
            flag: 'EXCEEDS-MAX',
            warning: `User-placed in ${targetSem} above Penn's 7.5 CU cap. Requires school-level approval.`,
          }
        : undefined,
    );
  }

  // Phase 2: Prereq-based iterative placement for remaining
  let guard = 50;
  while (remaining.length > 0 && guard-- > 0) {
    let progressed = false;
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i]!;
      const earliestIdx = earliestAllowedIdx(item.data, plan.placement);
      if (earliestIdx === null) continue;
      const slot = findBestSemester(item.data, plan, earliestIdx, TARGET_MAX);
      if (!slot) continue;
      addCoreCourseToSemester(plan, slot, item);
      remaining.splice(i, 1);
      i--;
      progressed = true;
    }
    if (!progressed) break;
  }

  // Phase 3: Force-place stragglers. Completion-first policy: every required
  // course MUST end up somewhere, even if it overflows Penn's 7.5 CU cap —
  // that's the signal we want curriculum committee to see. Never silently drop.
  for (const item of remaining) {
    let slot = findLightestFitting(item.data, plan, 0, TARGET_HARD_CAP);
    let flag: 'TIGHT' | 'EXCEEDS-MAX' = 'TIGHT';
    if (!slot) {
      // No semester under 7.5 CU has room. Place in the lightest compatible
      // semester anyway (pushing it over policy max) and flag for advisor approval.
      slot = findLightestFitting(item.data, plan, 0, Infinity);
      flag = 'EXCEEDS-MAX';
    }
    if (slot) {
      const warningMsg =
        flag === 'EXCEEDS-MAX'
          ? `Placing this course pushes the semester above Penn's 7.5 CU policy maximum. Requires school-level approval or a summer course.`
          : `Force-placed — may need manual rearrangement.`;
      addCoreCourseToSemester(plan, slot, item, { warning: warningMsg, flag });
    } else {
      // Should never happen — all 8 semesters are SPRING/FALL incompatible with
      // this course's offering. Log and continue.
      plan.notes.push({
        level: 'warning',
        src: 'Scheduler',
        text: `Could not place required course ${item.code} anywhere — offering pattern doesn't fit the 4-year window. Consult advisor.`,
      });
    }
  }

  return plan;
}

/**
 * Add a core course to a semester with the right category, tags, and double-count detection.
 */
function addCoreCourseToSemester(
  plan: SchedulerPlan,
  semKey: SemesterKey,
  item: CoreItem,
  extras: CoreCourseExtras = {},
): void {
  const { code, sas, data } = item;
  const isDouble = plan.meta.doubleCounted!.has(code);
  const category = isDouble ? 'both' : sas ? 'sas' : 'seas';
  const tags: string[] = [];
  if (isDouble) tags.push('DC');
  else if (sas) tags.push('SAS');
  else tags.push('SEAS');
  if (data.energy) tags.push('ENERGY');
  if (data.fa) tags.push(`FA:${data.fa}`);
  if (data.sec) tags.push(`SEC:${data.sec}`);
  if (extras.flag === 'EXCEEDS-MAX') tags.push('EXCEEDS-MAX');
  else if (extras.warning) tags.push('TIGHT');

  addCourse(plan, semKey, {
    ...data,
    category,
    tags,
    isDouble,
    isEnergy: data.energy,
    ...(extras.warning ? { warning: extras.warning } : {}),
  });
}
