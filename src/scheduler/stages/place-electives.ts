// STAGE 9 — ported verbatim from references/old-app/index.html (~2265-2394).

import { lookupCourse, courseEntry } from '../../data/courses';
import { BOTH } from '../../data/types';
import type { SemesterKey } from '../../data/semesters';
import {
  REGULAR_SEMESTER_KEYS,
  TARGET_MAX,
  semesterCap,
  addCourse,
  canPlaceInSemester,
  earliestAllowedIdx,
  isRegularSemKey,
} from '../helpers';
import type {
  ResolvedConcentration,
  ResolvedCourseData,
  SchedulerElectiveSlot,
  SchedulerPlan,
} from '../types';

export interface PlaceElectivesContext {
  sasConc: ResolvedConcentration;
  seasConc: ResolvedConcentration;
  overrides?: Record<string, string>;
}

/**
 * STAGE 9: Place major electives with optional user overrides.
 * Each elective slot can be pre-filled via `overrides[slotId] = courseCode`.
 */
export function placeElectives(
  plan: SchedulerPlan,
  { sasConc, seasConc, overrides = {} }: PlaceElectivesContext,
): SchedulerPlan {
  const slots: SchedulerElectiveSlot[] = [
    ...(sasConc.electiveSlots || []).map((s) => ({ ...s, from: 'SAS' as const })),
    ...(seasConc.electiveSlots || []).map((s) => ({ ...s, from: 'SEAS' as const })),
  ];
  // Note: Gen-ed pool (WRIT/SAST/SOCI/STSC/PSYC/CIMS/LGST/EAS 5470) covers
  // all SEAS SS/H + TBS slots; no separate placeholder needed.

  // Sort: energy-slots first (to satisfy VIPER energy req early), then generic
  const ordered = [...slots].sort((a, b) => (b.energy ? 1 : 0) - (a.energy ? 1 : 0));

  const deletedSlots = plan.meta.deletedCourses || new Set<string>();
  for (const slot of ordered) {
    if (deletedSlots.has(slot.id)) continue;
    placeOneElective(plan, slot, overrides);
  }
  return plan;
}

/** @deprecated kept for API compatibility */
export function seasGenEdSlots(): never[] {
  return [];
}

/**
 * Place a single elective slot, respecting user overrides.
 */
function placeOneElective(
  plan: SchedulerPlan,
  slot: SchedulerElectiveSlot,
  overrides: Record<string, string>,
): SchedulerPlan {
  const userChoice = overrides[slot.id];
  let code: string | null = null;
  let title = slot.label;
  let cu = slot.cu || 1;
  let energy = !!slot.energy;

  if (userChoice) {
    code = userChoice;
    const c = lookupCourse(userChoice);
    if (c) {
      title = c.title;
      cu = c.cu;
      energy = energy || !!c.energy;
    }
  } else if (slot.pool && slot.pool.length) {
    // Auto-pick first from pool
    code = slot.pool[0]!;
    const c = lookupCourse(slot.pool[0]!);
    if (c) {
      title = c.title;
      cu = c.cu;
      energy = energy || !!c.energy;
    }
  } else {
    // Extract code from label if formatted like "MSE 4550"
    const m = (slot.suggested || slot.label || '').match(/\b([A-Z]{2,5})\s+(\d{3,4}[A-Z]?)\b/);
    if (m) code = `${m[1]} ${m[2]}`;
  }

  // Build course object
  const data: ResolvedCourseData =
    code && lookupCourse(code)
      ? courseEntry(code)
      : { code: code || '—', title, cu, off: BOTH, prereqs: [] };

  // Avoid duplicate placement
  if (code && plan.placement[code] && plan.placement[code] !== 'credit') return plan;

  // Drag-drop override: if user moved this slot (by slot id) or course (by code), honor it
  const customPlacements = plan.meta.customPlacements || {};
  const customSem = customPlacements[slot.id] || (code ? customPlacements[code] : null);
  if (customSem && isRegularSemKey(customSem)) {
    addCourse(plan, customSem, {
      ...data,
      category: slot.from === 'SAS' ? 'sas' : 'seas',
      tags: [
        slot.from,
        ...(energy ? ['ENERGY'] : []),
        ...(data.fa ? [`FA:${data.fa}`] : []),
        ...(data.sec ? [`SEC:${data.sec}`] : []),
        'CUSTOM',
      ],
      isElective: true,
      isEnergy: energy,
      slotId: slot.id,
      slotLabel: slot.label,
      pool: slot.pool || [],
      note: slot.note || data.note || null,
    });
    return plan;
  }

  // Find slot — prefer lightest junior/senior semester
  const earliestIdx = earliestAllowedIdx(data, plan.placement) ?? 2;
  const tryOrder = [...REGULAR_SEMESTER_KEYS]
    .map((k, i) => ({ k, i }))
    .filter((x) => x.i >= (earliestIdx || 0))
    .sort((a, b) => {
      // Prefer junior+senior (i >= 4) first; tiebreak by load
      const aSr = a.i >= 4 ? 0 : 1;
      const bSr = b.i >= 4 ? 0 : 1;
      if (aSr !== bSr) return aSr - bSr;
      return (plan.loads[a.k] || 0) - (plan.loads[b.k] || 0);
    });

  let placedSem: SemesterKey | null = null;
  for (const { k } of tryOrder) {
    if (!canPlaceInSemester(data, k)) continue;
    if ((plan.loads[k] || 0) + data.cu <= semesterCap(k, TARGET_MAX)) {
      placedSem = k;
      break;
    }
  }
  if (!placedSem) {
    // Force into lightest slot with offering constraint (never Fall Y1 —
    // the first-semester cap is a hard rule, not a preference)
    for (const { k } of tryOrder) {
      if (k === 'fall-y1') continue;
      if (canPlaceInSemester(data, k)) {
        placedSem = k;
        break;
      }
    }
  }
  if (!placedSem) return plan;

  addCourse(plan, placedSem, {
    ...data,
    category: slot.from === 'SAS' ? 'sas' : 'seas',
    tags: [
      slot.from,
      ...(energy ? ['ENERGY'] : []),
      ...(data.fa ? [`FA:${data.fa}`] : []),
      ...(data.sec ? [`SEC:${data.sec}`] : []),
    ],
    isElective: true,
    isEnergy: energy,
    slotId: slot.id,
    slotLabel: slot.label,
    pool: slot.pool || [],
    note: slot.note || data.note || null,
  });
  return plan;
}
