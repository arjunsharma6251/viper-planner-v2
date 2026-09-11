// STAGE 7 — ported verbatim from references/old-app/index.html (~1947-2246).

import { lookupCourse, courseEntry } from '../../data/courses';
import { GENED_SLOTS } from '../../data/requirements';
import { BOTH } from '../../data/types';
import type { SemesterKey } from '../../data/semesters';
import {
  REGULAR_SEMESTER_KEYS,
  TARGET_MAX,
  TARGET_HARD_CAP,
  semesterCap,
  addCourse,
  canPlaceInSemester,
  getNccModule,
  isRegularSemKey,
} from '../helpers';
import type { GenEdSlotLike, ResolvedCourseData, SchedulerPlan } from '../types';

/**
 * STAGE 7: Place gen-ed slots.
 *
 * In NCC mode, uses NCC_GENED_SLOTS (Foundation + Distribution buckets).
 * In legacy mode, uses the old GENED_SLOTS (Sector + FA system).
 */
export function placeGenEd(plan: SchedulerPlan): SchedulerPlan {
  const overrides = plan.meta.overrides || {};
  const { curriculumMode = 'legacy' } = plan.meta;
  const mods = getNccModule()?.normalizeViperMods(plan.meta.viperMods);

  // Choose slot set based on curriculum mode
  let slots: readonly GenEdSlotLike[] =
    curriculumMode === 'ncc'
      ? getNccModule()?.NCC_GENED_SLOTS || GENED_SLOTS
      : GENED_SLOTS;

  // Apply gen-ed distribution preference: 'frontload' (VIPER default — defined in
  // the slot table) or 'penn' (single-degree back-loaded distribution, opt-in).
  // Only applies in legacy/OCC mode; NCC slots have their own distribution logic.
  if (curriculumMode !== 'ncc' && plan.meta.genedDistribution === 'penn') {
    const PENN_BACKLOAD: Record<string, SemesterKey> = {
      'gened-writ': 'spring-y1', // Penn template: WRIT in Spring Y1
      'gened-cca': 'fall-y3',
      'gened-cdus': 'spring-y3',
      'gened-sec1': 'fall-y3',
      'gened-sec2': 'spring-y3',
      'gened-sec3': 'fall-y4',
      'gened-sec4': 'fall-y4',
      'gened-sec5': 'spring-y4',
    };
    slots = slots.map((s) => {
      const backload = PENN_BACKLOAD[s.id];
      return backload ? { ...s, semPref: backload } : s;
    });
  }

  // In NCC mode, apply granular VIPER mod filtering to Foundation slots.
  if (curriculumMode === 'ncc' && mods) {
    // Filter out Foundation slots that are waived by individual mods.
    slots = slots.filter((s) => {
      if (s.id === 'ncc-fys' && mods.fysWaiver) return false; // satisfied by VIPR 1200
      if (s.id === 'ncc-key' && mods.keyWaiver) return false; // satisfied by VIPR 1210
      if (s.id === 'ncc-pad' && mods.pdWaiver) return false; // satisfied by VIPR 1300 (proposed)
      if (s.id === 'ncc-kite' && (mods.kiteFullWaiver || mods.viprKiteWaiver)) return false; // Kite waivable
      return true;
    });
    // If FYS mod is OFF, inject a standalone FYS slot (committee-demo path)
    if (!mods.fysWaiver && !slots.find((s) => s.id === 'ncc-fys')) {
      slots = [
        {
          id: 'ncc-fys',
          label: 'First-Year Seminar',
          cu: 1,
          semPref: 'spring-y1',
          intent: { foundation: 'ncc-fys', distribution: 'SS' },
          fulfillsDesc:
            'NCC Foundation: First-Year Seminar. Without VIPER mod: must be taken separately from VIPR.',
          note: 'Without VIPER modification, FYS must be a separate 1 CU course — not satisfied by VIPR 1200.',
          suggests: [],
        },
        ...slots,
      ];
    }
    // If Key mod is OFF, inject a standalone Key slot
    if (!mods.keyWaiver && !slots.find((s) => s.id === 'ncc-key')) {
      slots = [
        ...slots,
        {
          id: 'ncc-key',
          label: 'Key — Quantitative Reasoning Course',
          cu: 1,
          semPref: 'fall-y2',
          intent: { foundation: 'ncc-key', distribution: 'N' },
          fulfillsDesc:
            'NCC Foundation: Key (w/ 3-hr lab). Without VIPER mod: student must fulfill independently.',
          note: 'Without VIPER modification, Key must be taken as a separate course (not satisfied by VIPR 1210).',
          suggests: ['MATH 1400', 'STAT 1000'],
        },
      ];
    }
    // If Language mod is OFF, inject a language slot (1-2 CUs)
    if (!mods.langWaiver && !slots.find((s) => s.id === 'ncc-lang')) {
      slots = [
        ...slots,
        {
          id: 'ncc-lang',
          label: 'Language Requirement',
          cu: 1,
          semPref: 'fall-y2',
          // Per the College chart only FYS and P&D may count within the
          // distribution — Language is a Foundation only.
          intent: { foundation: 'ncc-lang' },
          fulfillsDesc: 'NCC Foundation: Language (0-2 CU depending on placement).',
          note: 'Without VIPER modification, language must be completed per placement.',
          suggests: [],
        },
      ];
    }

    // ---- Dynamically pare distribution fillers based on actual need ----
    // Pre-compute what the plan already contributes to SS/H via Foundations, VIPR,
    // and major courses, then only add as many distribution fillers as needed to
    // hit the targets. This is what makes the gen-ed counter actually respond to
    // mod toggles: fewer fillers when double-counts are enabled.
    const targets = plan.meta.distributionTargets || { N: 12, SS: 5, H: 3 };
    const projected = { SS: 0, H: 0 };

    // Count what Foundations contribute to SS/H distribution.
    // (Port fix: the generic ncc-dist-* placeholders are about to be
    // replaced, so they must not count toward the projection — the old
    // code counted them and under-provisioned fillers by 3–4 CU.)
    for (const s of slots) {
      if (s.id.startsWith('ncc-dist-')) continue;
      if (!s.intent?.distribution) continue;
      const div = s.intent.distribution;
      if (div === 'N') continue; // N covered by major
      if (s.id === 'ncc-writ' && !mods.doubleCountWriting) continue;
      if (s.id === 'ncc-kite' && !mods.doubleCountKite) continue;
      if (div === 'SS' || div === 'H') projected[div] += s.cu;
    }
    // Count VIPR 1300 toward SS if the mod is on
    if (mods.doubleCountVIPR1300) {
      const vipr1300cu = Object.values(plan.semesters)
        .flat()
        .filter((c) => c.code === 'VIPR 1300')
        .reduce((a, c) => a + c.cu, 0);
      projected.SS += vipr1300cu;
    }

    // Remaining shortfall per division drives how many distribution-only
    // fillers we need (each one is typically 1 CU).
    const shortSS = Math.max(0, targets.SS - projected.SS);
    const shortH = Math.max(0, targets.H - projected.H);

    // Keep Foundation slots; replace the 4 generic dist-only slots with exactly
    // shortSS + shortH slots, intent-labeled to the division that needs them.
    const foundationOnly = slots.filter((s) => !s.id.startsWith('ncc-dist-'));
    const distFillers: GenEdSlotLike[] = [];
    const semPrefs: readonly SemesterKey[] = [
      'spring-y2',
      'fall-y3',
      'spring-y3',
      'fall-y4',
      'spring-y4',
    ];
    let pi = 0;
    const pickSemPref = (): SemesterKey => semPrefs[pi++ % semPrefs.length]!;
    for (let i = 0; i < Math.ceil(shortSS); i++) {
      distFillers.push({
        id: `ncc-dist-ss-${i + 1}`,
        label: 'Social Sciences Distribution',
        cu: 1,
        semPref: pickSemPref(),
        intent: { distribution: 'SS' },
        fulfillsDesc: `Distribution elective — counts toward SS (need ${shortSS.toFixed(1)} CU more).`,
        note: 'Pick any Social Sciences course (ECON, PSYC, SOCI, PSCI, LGST, ANTH, etc.).',
        suggests: [],
      });
    }
    for (let i = 0; i < Math.ceil(shortH); i++) {
      distFillers.push({
        id: `ncc-dist-h-${i + 1}`,
        label: 'Humanities & Arts Distribution',
        cu: 1,
        semPref: pickSemPref(),
        intent: { distribution: 'H' },
        fulfillsDesc: `Distribution elective — counts toward H (need ${shortH.toFixed(1)} CU more).`,
        note: 'Pick any Humanities course (ENGL, HIST, PHIL, ARTH, MUSC, RELS, etc.).',
        suggests: [],
      });
    }
    slots = [...foundationOnly, ...distFillers];
  }

  const deletedSlots = plan.meta.deletedCourses || new Set<string>();
  for (const slot of slots) {
    if (deletedSlots.has(slot.id)) continue; // skip slots user explicitly deleted
    const overrideCode = overrides[slot.id];
    if (overrideCode) {
      placeGenEdFromOverride(plan, slot, overrideCode);
    } else {
      placeGenEdPlaceholder(plan, slot);
    }
  }
  return plan;
}

function placeGenEdFromOverride(
  plan: SchedulerPlan,
  slot: GenEdSlotLike,
  code: string,
): void {
  // Avoid duplicate placement if the course is already somewhere in the plan
  if (plan.placement[code] && plan.placement[code] !== 'credit') return;

  const data: ResolvedCourseData = lookupCourse(code)
    ? courseEntry(code)
    : { code, title: code, cu: 1, off: BOTH, prereqs: [] };

  // Try preferred semester first
  let sem: SemesterKey | null =
    canPlaceInSemester(data, slot.semPref) &&
    (plan.loads[slot.semPref] || 0) + data.cu <= semesterCap(slot.semPref, TARGET_HARD_CAP)
      ? slot.semPref
      : null;
  // Otherwise find a light semester that accepts the offering
  if (!sem) {
    for (const k of REGULAR_SEMESTER_KEYS) {
      if (canPlaceInSemester(data, k) && (plan.loads[k] || 0) + data.cu <= semesterCap(k, TARGET_HARD_CAP)) {
        sem = k;
        break;
      }
    }
  }
  if (!sem) return;

  const tags = ['Gen-Ed'];
  if (data.fa) tags.push(`FA:${data.fa}`);
  if (data.sec) tags.push(`SEC:${data.sec}`);
  tags.push('SEAS SS/H');

  addCourse(plan, sem, {
    ...data,
    category: 'gened',
    tags,
    isDouble: Boolean((data.fa && data.sec) || data.isWritSem),
    isGenEd: true,
    isElective: true, // makes it clickable/swappable
    slotId: slot.id,
    slotLabel: slot.label,
    intent: slot.intent || {}, // slot's intent carries forward (user may pick any course)
    note: slot.note || null,
  });
}

function placeGenEdPlaceholder(plan: SchedulerPlan, slot: GenEdSlotLike): void {
  // Use a unique code so the scheduler doesn't treat multiple placeholders as one
  const placeholderCode = `— ${slot.id}`;
  const customSem = plan.meta.customPlacements?.[slot.id];

  // Tiered placement strategy. Prefer:
  //   1. User's drag-drop placement (always honored)
  //   2. semPref if it stays comfortable (≤ 6.5 CU after adding)
  //   3. Lightest semester where adding stays ≤ 6.5 CU
  //   4. semPref if it stays under hard cap (≤ 7.5 CU)
  //   5. Lightest semester where adding stays ≤ 7.5 CU
  //   6. Lightest semester anyway (over-cap, flag with EXCEEDS-MAX)
  const SOFT = TARGET_MAX; // 6.5
  const HARD = TARGET_HARD_CAP; // 7.5
  // Verbatim port: initialised to null for readability even though every
  // tier below assigns before the first read.
  // eslint-disable-next-line no-useless-assignment
  let sem: SemesterKey | null = null;
  let exceedsMax = false;

  // NCC Foundations are meant to be completed EARLY in the curriculum.
  // For Foundation slots, restrict the search window to Years 1-2 first;
  // only fall through to later years if absolutely necessary.
  const isFoundation =
    slot.id === 'ncc-writ' ||
    slot.id === 'ncc-kite' ||
    slot.id === 'ncc-fys' ||
    slot.id === 'ncc-key' ||
    slot.id === 'ncc-pad' ||
    slot.id === 'ncc-lang';
  const EARLY_SEMS: readonly SemesterKey[] = ['fall-y1', 'spring-y1', 'fall-y2', 'spring-y2'];
  const MID_SEMS: readonly SemesterKey[] = [...EARLY_SEMS, 'fall-y3', 'spring-y3'];

  const findLightestUnder = (
    cap: number,
    allowedSems: readonly SemesterKey[] = REGULAR_SEMESTER_KEYS,
  ): SemesterKey | null => {
    let best: SemesterKey | null = null;
    let bestLoad = Infinity;
    for (const k of allowedSems) {
      const cur = plan.loads[k] || 0;
      if (cur + slot.cu <= semesterCap(k, cap) && cur < bestLoad) {
        best = k;
        bestLoad = cur;
      }
    }
    return best;
  };

  if (customSem && isRegularSemKey(customSem)) {
    sem = customSem;
  } else if ((plan.loads[slot.semPref] || 0) + slot.cu <= semesterCap(slot.semPref, SOFT)) {
    // Tier 2: semPref is comfortable
    sem = slot.semPref;
  } else if (isFoundation) {
    // Foundation-specific: prefer Years 1-2, then Years 1-3, then anywhere.
    sem = findLightestUnder(SOFT, EARLY_SEMS);
    if (!sem) sem = findLightestUnder(SOFT, MID_SEMS);
    if (!sem) sem = findLightestUnder(SOFT);
    if (!sem) {
      // No comfortable slot — try semPref under hard cap, then lightest under hard cap
      if ((plan.loads[slot.semPref] || 0) + slot.cu <= semesterCap(slot.semPref, HARD)) {
        sem = slot.semPref;
      } else {
        sem =
          findLightestUnder(HARD, EARLY_SEMS) ||
          findLightestUnder(HARD, MID_SEMS) ||
          findLightestUnder(HARD);
      }
    }
  } else {
    // Non-Foundation slots: use original tier logic
    sem = findLightestUnder(SOFT);
    if (!sem) {
      if ((plan.loads[slot.semPref] || 0) + slot.cu <= semesterCap(slot.semPref, HARD)) {
        sem = slot.semPref;
      } else {
        sem = findLightestUnder(HARD);
      }
    }
  }

  // Completion-first: if no room under 7.5 CU, place in lightest semester
  // anyway and flag for advisor approval. Never drop required Foundation slots.
  if (!sem) {
    let best: SemesterKey | null = null;
    let bestLoad = Infinity;
    for (const k of REGULAR_SEMESTER_KEYS) {
      if (k === 'fall-y1') continue; // first-semester cap is a hard rule
      if ((plan.loads[k] || 0) < bestLoad) {
        best = k;
        bestLoad = plan.loads[k] || 0;
      }
    }
    sem = best;
    exceedsMax = true;
  }
  if (!sem) return;

  // Final exceedsMax check — ALWAYS based on current load + slot CU.
  // Catches user drag-drops to over-capacity semesters.
  if ((plan.loads[sem] || 0) + slot.cu > semesterCap(sem, HARD)) {
    exceedsMax = true;
  }

  const tags = ['Gen-Ed'];
  if (exceedsMax) tags.push('EXCEEDS-MAX');

  addCourse(plan, sem, {
    code: '—', // Visible placeholder code
    placeholderCode, // Unique key for placement map
    title: slot.label,
    cu: slot.cu,
    category: 'gened',
    tags,
    isGenEd: true,
    isElective: true,
    isPlaceholder: true,
    slotId: slot.id,
    slotLabel: slot.label,
    intent: slot.intent || {}, // What this slot fulfills (for tracker)
    fulfillsDesc: slot.fulfillsDesc,
    suggests: slot.suggests || [],
    note: slot.note || slot.fulfillsDesc,
    ...(exceedsMax
      ? {
          warning: `Placing this Foundation slot pushes the semester above Penn's 7.5 CU policy maximum. Requires school-level approval or a summer course.`,
        }
      : {}),
  });
  // Mark placement with unique key so duplicates don't collapse
  plan.placement[placeholderCode] = sem;
}
