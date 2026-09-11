// End-to-end glue test: the exact path the UI walks — scheduler seed →
// Plan hydration → augment → mutations → exports. Catches wiring breaks
// that the per-module suites can't see.
import { describe, expect, it } from 'vitest'
import { seedPlan } from '../ui/store/use-plan-store'
import { augmentPlan } from '../plan/augment'
import { computeNccAudit } from '../plan/ncc-audit'
import { applyMutation, applyMutations } from '../plan/mutations'
import { planToCSV, serializeAppState, parseAppState, planFromAppState } from '../plan/serialize'
import { encodeShareState, decodeShareState } from '../utils/share-link'
import { computeNCCWorkload } from '../ncc/compute-workload'
import { ALL_SEMESTER_KEYS } from '../data/semesters'

const CONFIG = {
  sasMajorKey: 'CHEM',
  sasConcKey: 'STANDARD',
  seasMajorKey: 'CBE',
  seasConcKey: 'ENERGY',
  apCreditIds: ['ap-calc-bc'],
  gradYear: 2028,
}

describe('seed → augment → mutate (the UI path)', () => {
  it('seeds a valid plan with all 11 semester slots', () => {
    const plan = seedPlan(CONFIG)
    expect(plan).not.toBeNull()
    for (const key of ALL_SEMESTER_KEYS) {
      expect(plan!.semesters[key]).toBeDefined()
    }
  })

  it('augments with summary, placement, and stars', () => {
    // The old-app behaviour documented below is the OLD-CORE seed; VIPER
    // '28 now seeds under the New College Curriculum by default, so pin
    // the legacy mode explicitly here.
    const plan = seedPlan({ ...CONFIG, curriculumMode: 'legacy' })!
    const aug = augmentPlan(plan, { sasMajorKey: 'CHEM', seasMajorKey: 'CBE', gradYear: 2028 })
    expect(aug).not.toBeNull()
    expect(aug!.summary.meetsDualMin).toBe(true)
    expect(aug!.summary.meetsEnergyReq).toBe(true)
    // FAITHFUL OLD BEHAVIOR (verified against references/old-app, lines
    // 4783-4787 vs 1912-1942): the display summary counts only
    // fulfills/intent marks, NOT flat catalog `fa` on core courses or
    // AP-credit placements. So a fresh CHEM+CBE seed shows FL/FRA/QDA
    // un-ticked until the student tags them — the SCHEDULER summary is the
    // one the 420-combo regression holds to zero. Flagged to Arjun before
    // "fixing" (CLAUDE.md: ask, don't simplify away).
    expect(aug!.summary.unfulfilledFA).toEqual(['FL', 'FRA', 'QDA'])
    // Same story for sectors: VI is auto-completed by the science major and
    // VII rides on flat catalog `sec` — the display summary sees neither.
    expect(aug!.summary.unfulfilledSec).toEqual(['VI', 'VII'])
    expect(aug!.placement).toBeDefined()
  })

  it('seeds the Class of 2028 under the NCC with confirmed policy only', () => {
    const plan = seedPlan(CONFIG)!
    expect(plan.meta.curriculumMode).toBe('ncc')
    const slotIds = Object.values(plan.semesters)
      .flat()
      .map((c) => c.slotId ?? '')
      .filter((id) => id.startsWith('ncc-'))
    // Five standalone Foundations (FYS is the approved VIPR overlap) + 7 fillers
    for (const id of ['ncc-writ', 'ncc-kite', 'ncc-key', 'ncc-pad', 'ncc-lang']) {
      expect(slotIds, `Foundation slot ${id}`).toContain(id)
    }
    expect(slotIds.filter((id) => id.startsWith('ncc-dist-ss-'))).toHaveLength(4)
    expect(slotIds.filter((id) => id.startsWith('ncc-dist-h-'))).toHaveLength(3)
    expect(slotIds).not.toContain('ncc-fys')

    const aug = augmentPlan(plan, { sasMajorKey: 'CHEM', seasMajorKey: 'CBE', gradYear: 2028 })!
    const audit = computeNccAudit(aug, CONFIG.apCreditIds, undefined, 'CBE')
    expect(audit.foundations.map((f) => [f.id, f.state])).toEqual([
      ['ncc-kite', 'planned'],
      ['ncc-key', 'planned'],
      ['ncc-fys', 'approved-overlap'],
      ['ncc-pad', 'planned'],
      ['ncc-lang', 'planned'],
      ['ncc-writ', 'planned'],
    ])
    expect(audit.divisions.map((d) => [d.id, d.planned, d.target])).toEqual([
      ['SS', 5, 5],
      ['H', 3, 3],
    ])
  })

  it('applies and round-trips mutations like the UI does', () => {
    const plan = seedPlan(CONFIG)!
    const added = applyMutation(plan, {
      kind: 'add_course',
      semester: 'spring-y2',
      course: { code: 'PHYS 2280', title: 'Physical Models', cu: 1 },
    })
    expect(added.ok).toBe(true)
    const moved = applyMutation(added.plan, {
      kind: 'move_course',
      from: 'spring-y2',
      to: 'fall-y3',
      courseId: 'PHYS 2280',
    })
    expect(moved.ok).toBe(true)
    expect(moved.plan.semesters['fall-y3']!.some((c) => c.code === 'PHYS 2280')).toBe(true)
    // simulate (batch) never leaks on failure
    const failed = applyMutations(moved.plan, [
      { kind: 'remove_course', semester: 'summer-y1', courseId: 'VIPR 1300' },
    ])
    expect(failed.ok).toBe(false)
    expect(failed.plan).toBe(moved.plan)
  })

  it('share link and JSON state round-trip through the v8 wire format', () => {
    const plan = seedPlan(CONFIG)!
    const state = {
      sasMajorKey: CONFIG.sasMajorKey,
      seasMajorKey: CONFIG.seasMajorKey,
      gradYear: CONFIG.gradYear,
      userPlan: { semesters: plan.semesters as Record<string, never[]> },
    }
    const decodedShare = decodeShareState(encodeShareState(state))
    expect(decodedShare?.sasMajorKey).toBe('CHEM')
    const reparsed = parseAppState(serializeAppState(state))
    expect(reparsed).not.toBeNull()
    const rehydrated = planFromAppState(reparsed!)
    expect(rehydrated).not.toBeNull()
    expect(rehydrated!.semesters['fall-y1']!.length).toBe(plan.semesters['fall-y1']!.length)
  })

  it('CSV export has the audit format and no developer credit', () => {
    const plan = seedPlan(CONFIG)!
    const aug = augmentPlan(plan, { sasMajorKey: 'CHEM', seasMajorKey: 'CBE' })!
    const csv = planToCSV(aug, {
      sasMajorName: 'Chemistry',
      seasMajorName: 'Chemical & Biomolecular Engineering',
      gradYear: 2028,
    })
    expect(csv).toContain('VIPER Four-Year Plan')
    expect(csv).not.toMatch(/developed by/i)
  })

  it('NCC workload runs against an augmented seeded plan', () => {
    const plan = seedPlan(CONFIG)!
    const aug = augmentPlan(plan, { sasMajorKey: 'CHEM', seasMajorKey: 'CBE' })!
    const workload = computeNCCWorkload(aug, { N: 12, SS: 5, H: 3 })
    expect(workload.baselineCU).toBe(14)
    expect(workload.inTermTotalCU).toBeGreaterThanOrEqual(0)
    expect(workload.policyTotalCU).toBeGreaterThanOrEqual(workload.inTermTotalCU)
  })
})
