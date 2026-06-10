// electivesForSlot — ported verbatim from references/old-app/index.html
// (~2762-2819). Not a pipeline stage: it powers the Elective Picker modal.

import { COURSES, lookupCourse } from '../data/courses';
import { ENERGY_COURSES } from '../data/requirements';
import type { Course } from '../data/types';
import type { SchedulerPlan } from './types';

/** The slot fields electivesForSlot inspects (elective or gen-ed slot). */
export interface PickerSlot {
  id?: string;
  label?: string;
  energy?: boolean;
  suggests?: readonly string[];
  pool?: readonly string[];
}

/** A swap candidate offered to the user, with the reason it qualifies. */
export interface ElectiveCandidate extends Course {
  code: string;
  reason: string;
  /** Number of requirements fulfilled (gen-ed picks are sorted by this). */
  count?: number;
}

/**
 * Return list of electives that the user could swap in for a given slot.
 * Used by the Elective Picker modal.
 */
export function electivesForSlot(slot: PickerSlot, plan: SchedulerPlan): ElectiveCandidate[] {
  const placed = new Set(
    Object.keys(plan.placement).filter((c) => plan.placement[c] !== 'credit'),
  );
  const candidates: ElectiveCandidate[] = [];
  const seen = new Set<string>();

  const add = (code: string, reason: string) => {
    const info = lookupCourse(code);
    if (seen.has(code) || !info) return;
    seen.add(code);
    candidates.push({ code, reason, ...info });
  };

  // 1. Slot-specific suggestions come first
  for (const c of slot.suggests || []) add(c, 'Suggested');
  for (const c of slot.pool || []) add(c, 'Suggested');

  // 2. Gen-ed slots: walk COURSES for anything with FA/Sector tags,
  //    sorted by "fulfills most requirements"
  const isGenEdSlot =
    slot.id?.startsWith('gened') || /Sector|SS\/H|Writing|FA/.test(slot.label || '');
  if (isGenEdSlot) {
    const genEdPicks = Object.entries(COURSES as Record<string, Course>)
      .filter(([code, c]) => (c.fa || c.sec) && !seen.has(code))
      .map(([code, c]) => {
        const parts: string[] = [];
        if (c.fa) parts.push(`FA ${c.fa}`);
        if (c.sec) parts.push(`Sector ${c.sec}`);
        const reason = parts.join(' + ');
        return { code, reason, count: parts.length, ...c };
      })
      .sort((a, b) => b.count - a.count);
    for (const p of genEdPicks) {
      if (!seen.has(p.code)) {
        seen.add(p.code);
        candidates.push(p);
      }
    }
  }

  // 3. If slot is energy-tagged, include all VIPER energy courses
  if (slot.energy) {
    for (const c of ENERGY_COURSES) add(c, 'Energy');
  }

  // 4. Include courses with matching subject prefix (e.g., "MSE Elective" → all MSE)
  const prefix = (slot.label || '').match(/^([A-Z]{2,5})\b/)?.[1];
  if (prefix && !isGenEdSlot) {
    for (const [c, info] of Object.entries(COURSES as Record<string, Course>)) {
      if (c.startsWith(prefix + ' ') && !seen.has(c)) {
        seen.add(c);
        candidates.push({ code: c, reason: `${prefix} course`, ...info });
      }
    }
  }

  // Filter out already-placed courses
  return candidates.filter((c) => !placed.has(c.code));
}
