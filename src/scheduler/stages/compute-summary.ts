// STAGE 11 — ported verbatim from references/old-app/index.html (~2535-2645).

import { lookupCourse } from '../../data/courses';
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements';
import { VIPER_PROGRAM } from '../../data/viper-program';
import type { Major } from '../../data/types';
import type { SemesterKey } from '../../data/semesters';
import { getNccModule, roundCU } from '../helpers';
import type {
  ExceedsMaxCourse,
  NccFoundationStatus,
  NccSummary,
  SchedulerCourse,
  SchedulerPlan,
} from '../types';

export interface ComputeSummaryContext {
  sasMajor: Major;
  seasMajor: Major;
}

/**
 * STAGE 11: Compute summary statistics.
 */
export function computeSummary(
  plan: SchedulerPlan,
  { sasMajor, seasMajor }: ComputeSummaryContext,
): SchedulerPlan {
  let totalCU = 0;
  let sasCU = 0;
  let seasCU = 0;
  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem) {
      totalCU += c.cu;
      // SAS counting: SAS core, double-counts, and gen-ed (Sectors/FAs)
      if (c.category === 'sas' || c.category === 'both' || c.category === 'gened')
        sasCU += c.cu;
      // SEAS counting: SEAS core, double-counts, VIPER, AND gen-ed (counts as SEAS H&SS)
      if (
        c.category === 'seas' ||
        c.category === 'both' ||
        c.category === 'viper' ||
        c.category === 'gened'
      )
        seasCU += c.cu;
    }
  }
  // AP credits count toward the graduation totals (Penn policy: 1 AP = 1 CU that counts)
  let apCreditCU = 0;
  for (const [code, where] of Object.entries(plan.placement)) {
    if (where !== 'credit') continue;
    const c = lookupCourse(code);
    if (!c) continue;
    apCreditCU += c.cu;
    // If course appears in both majors' cores, count for both
    const inSAS =
      (sasMajor.sharedCore || []).includes(code) ||
      (plan.meta.sasConc?.extraCore || []).includes(code);
    const inSEAS =
      (seasMajor.sharedCore || []).includes(code) ||
      (plan.meta.seasConc?.extraCore || []).includes(code);
    if (inSAS) sasCU += c.cu;
    if (inSEAS) seasCU += c.cu;
  }
  totalCU += apCreditCU;

  const sasMinRequired = Math.max((sasMajor.minCU || 36) - 2, 30); // dual-degree reduction
  const seasMinRequired = 37;
  const unfulfilledFA = FA_REQUIREMENTS.filter(
    (fa) => !plan.meta.fulfilledFA!.has(fa.id) && fa.cu > 0,
  ).map((fa) => fa.id);
  const unfulfilledSec = SECTORS.filter((s) => !plan.meta.fulfilledSec!.has(s.id)).map(
    (s) => s.id,
  );

  const loadEntries = Object.entries(plan.loads) as [SemesterKey, number][];

  plan.summary = {
    totalCU: roundCU(totalCU),
    sasCU: roundCU(sasCU),
    seasCU: roundCU(seasCU),
    sasMinRequired,
    seasMinRequired,
    meetsDualMin: totalCU >= VIPER_PROGRAM.minTotalCU,
    meetsSASMin: sasCU >= sasMinRequired,
    meetsSEASMin: seasCU >= seasMinRequired,
    energyCoursesCount: plan.meta.energyCount || 0,
    meetsEnergyReq: (plan.meta.energyCount || 0) >= VIPER_PROGRAM.minEnergyCourses,
    fulfilledFA: Array.from(plan.meta.fulfilledFA!),
    fulfilledSec: Array.from(plan.meta.fulfilledSec!),
    unfulfilledFA,
    unfulfilledSec,
    doubleCountedCodes: Array.from(plan.meta.doubleCounted!),
    // Semester load data — tiered per Penn policy (verified from college.upenn.edu + seas.upenn.edu)
    //   ≤ 5.5 CU      — normal (no indicator)
    //   5.5 < CU ≤ 6.5 — dual-degree overload (expected for VIPER, still needs form)
    //   6.5 < CU ≤ 7.5 — advisor approval required (requires Faculty Advisor Sign-off)
    //   > 7.5 CU      — EXCEEDS POLICY MAX (university hard cap; cannot register)
    semesterLoads: { ...plan.loads },
    heavySemesters: loadEntries.filter(([, cu]) => cu > 6.5).map(([k]) => k), // kept for backwards-compat
    overloadSemesters: loadEntries.filter(([, cu]) => cu > 5.5 && cu <= 6.5).map(([k]) => k),
    approvalSemesters: loadEntries.filter(([, cu]) => cu > 6.5 && cu <= 7.5).map(([k]) => k),
    exceedsMaxSemesters: loadEntries.filter(([, cu]) => cu > 7.5).map(([k]) => k),
    // All courses that had to be force-placed above Penn's policy max
    exceedsMaxCourses: (() => {
      const out: ExceedsMaxCourse[] = [];
      for (const [k, sem] of Object.entries(plan.semesters) as [
        SemesterKey,
        SchedulerCourse[],
      ][]) {
        for (const c of sem) {
          if (c.tags?.includes('EXCEEDS-MAX')) {
            out.push({ sem: k, code: c.code, title: c.title, cu: c.cu });
          }
        }
      }
      return out;
    })(),
    // NCC-specific (populated only in NCC mode)
    ncc:
      plan.meta.curriculumMode === 'ncc'
        ? ((): NccSummary | null => {
            const NCC = getNccModule();
            if (!NCC) return null;
            const mods = plan.meta.viperMods;
            const dist = NCC.computeNCCDistribution(
              plan,
              plan.meta.distributionTargets,
              mods,
            );
            const checks = NCC.runNCCChecks(plan, plan.meta.distributionTargets, mods);
            const foundations: NccFoundationStatus[] = NCC.NCC_FOUNDATIONS.map((f) => {
              const viperSatisfied = f.satisfiedByViper
                ? plan.placement[f.satisfiedByViper.code]
                : undefined;
              const slotEntry = Object.values(plan.semesters)
                .flat()
                .find((c) => c.slotId === f.id);
              // Check mod-based satisfaction for waivable foundations
              const waivedByMod =
                (f.id === 'ncc-fys' && mods?.fysWaiver) ||
                (f.id === 'ncc-key' && mods?.keyWaiver) ||
                (f.id === 'ncc-lang' && mods?.langWaiver) ||
                (f.id === 'ncc-pad' && mods?.pdWaiver) ||
                (f.id === 'ncc-kite' && (mods?.kiteFullWaiver || mods?.viprKiteWaiver));
              return {
                ...f,
                satisfied: !!viperSatisfied || !!slotEntry || !!waivedByMod,
                viperSatisfied: !!viperSatisfied,
                waivedByMod: !!waivedByMod,
                sem: viperSatisfied
                  ? viperSatisfied
                  : slotEntry
                    ? ((Object.entries(plan.semesters) as [SemesterKey, SchedulerCourse[]][]).find(
                        ([, cs]) => cs.includes(slotEntry),
                      )?.[0] ?? null)
                    : null,
              };
            });
            // Count gen-eds (College distribution + Foundation courses in the plan)
            const genEdCount = NCC.countGenEds(plan);
            const genEdBaseline = NCC.baselineGenEdCount(plan.meta.distributionTargets);
            return { dist, checks, foundations, genEdCount, genEdBaseline, mods };
          })()
        : null,
  };
  return plan;
}
