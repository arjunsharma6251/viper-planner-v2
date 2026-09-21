import { afterEach, describe, expect, it, vi } from 'vitest'

import { ALL_SEMESTER_KEYS } from '../data/semesters'
import { VIPER_PROGRAM } from '../data/viper-program'
import { augmentPlan } from './augment'
import {
  addCourse,
  applyMutations,
  createEmptyPlan,
  moveCourse,
  removeCourse,
  renameCourse,
  swapElective,
  tagFulfillment,
} from './mutations'
import { parseAppState, planFromAppState, planToCSV, serializeAppState } from './serialize'
import type { AppState } from './serialize'
import { buildShareLink, decodeShareState, encodeShareState } from '../utils/share-link'
import { STORAGE_KEYS, loadAppState, safeGetItem, safeSetItem, saveAppState } from '../utils/storage'
import type { Plan, PlannedCourse } from './types'

// ---- fixtures ----

function course(partial: Partial<PlannedCourse> & { code: string }): PlannedCourse {
  return { title: partial.code, cu: 1, ...partial }
}

/** Plan seeded with the VIPER fixed courses (mirrors the scheduler's placeVIPER). */
function viperSeededPlan(): Plan {
  const plan = createEmptyPlan({ gradYear: 2028 })
  for (const v of VIPER_PROGRAM.fixedCourses) {
    plan.semesters[v.semKey].push({
      code: v.code,
      title: v.title,
      cu: v.cu,
      category: 'viper',
      fixed: v.fixed,
      tags: ['VIPER'],
    })
  }
  return plan
}

function snapshot(plan: Plan): string {
  return JSON.stringify(plan)
}

// ---- createEmptyPlan ----

describe('createEmptyPlan', () => {
  it('initializes ALL 11 semester keys (trap #2)', () => {
    const plan = createEmptyPlan()
    expect(Object.keys(plan.semesters)).toHaveLength(11)
    for (const k of ALL_SEMESTER_KEYS) {
      expect(plan.semesters[k]).toEqual([])
      expect(plan.loads[k]).toBe(0)
    }
  })
})

// ---- addCourse ----

describe('addCourse', () => {
  it('adds a user course with USER-ADDED tag and catalog defaults', () => {
    const plan = createEmptyPlan()
    const before = snapshot(plan)
    const result = addCourse(plan, 'fall-y1', { code: 'CHEM 2410' })
    expect(result.ok).toBe(true)
    const added = result.plan.semesters['fall-y1'][0]
    expect(added).toMatchObject({
      code: 'CHEM 2410',
      title: 'Organic Chemistry I', // pulled from the catalog
      cu: 1,
      category: 'gened',
      isUserAdded: true,
      tags: ['USER-ADDED'],
    })
    expect(result.plan.loads['fall-y1']).toBe(1)
    expect(result.plan.placement['CHEM 2410']).toBe('fall-y1')
    // input plan untouched
    expect(snapshot(plan)).toBe(before)
    expect(plan.semesters['fall-y1']).toHaveLength(0)
  })

  it('works on summer keys of an empty plan (trap #2)', () => {
    const result = addCourse(createEmptyPlan(), 'summer-y3', {
      code: 'KITE 0001',
      title: 'Kite in Summer',
      cu: 1,
    })
    expect(result.ok).toBe(true)
    expect(result.plan.semesters['summer-y3']).toHaveLength(1)
  })

  it('rejects an empty course code', () => {
    const plan = createEmptyPlan()
    const result = addCourse(plan, 'fall-y1', { code: '   ' })
    expect(result.ok).toBe(false)
    expect(result.plan).toBe(plan)
  })

  it('rejects an unknown semester key at runtime', () => {
    const plan = createEmptyPlan()
    const result = addCourse(plan, 'fall-y9' as never, { code: 'CHEM 2410' })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('fall-y9')
  })
})

// ---- removeCourse ----

describe('removeCourse', () => {
  it('removes a normal course', () => {
    let plan = createEmptyPlan()
    plan = addCourse(plan, 'fall-y1', { code: 'ECON 0100' }).plan
    const result = removeCourse(plan, 'fall-y1', 'ECON 0100')
    expect(result.ok).toBe(true)
    expect(result.message).toBe('Removed ECON 0100')
    expect(result.plan.semesters['fall-y1']).toHaveLength(0)
    expect(result.plan.placement['ECON 0100']).toBeUndefined()
    // input untouched
    expect(plan.semesters['fall-y1']).toHaveLength(1)
  })

  it('refuses to remove the fixed summer-y1 VIPR 1300', () => {
    const plan = viperSeededPlan()
    const result = removeCourse(plan, 'summer-y1', 'VIPR 1300')
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/cannot be removed/)
    expect(result.plan).toBe(plan)
    expect(plan.semesters['summer-y1']).toHaveLength(1)
  })

  it('allows removing the deletable summer-y2 / summer-y3 VIPR 1300 (trap #1)', () => {
    const plan = viperSeededPlan()
    const y2 = removeCourse(plan, 'summer-y2', 'VIPR 1300')
    expect(y2.ok).toBe(true)
    expect(y2.plan.semesters['summer-y2']).toHaveLength(0)
    const y3 = removeCourse(y2.plan, 'summer-y3', 'VIPR 1300')
    expect(y3.ok).toBe(true)
  })

  it('fails when the course is not in that semester', () => {
    const plan = createEmptyPlan()
    const result = removeCourse(plan, 'fall-y1', 'CHEM 2410')
    expect(result.ok).toBe(false)
    expect(result.plan).toBe(plan)
  })
})

// ---- moveCourse ----

describe('moveCourse', () => {
  function threeCoursePlan(): Plan {
    const plan = createEmptyPlan()
    plan.semesters['fall-y1'].push(
      course({ code: 'A 1000' }),
      course({ code: 'B 2000' }),
      course({ code: 'C 3000' }),
    )
    return plan
  }

  it('moves across semesters and adds the MOVED tag', () => {
    const plan = threeCoursePlan()
    const result = moveCourse(plan, 'fall-y1', 'spring-y1', 'A 1000')
    expect(result.ok).toBe(true)
    expect(result.plan.semesters['fall-y1'].map((c) => c.code)).toEqual(['B 2000', 'C 3000'])
    const moved = result.plan.semesters['spring-y1'][0]
    expect(moved?.code).toBe('A 1000')
    expect(moved?.tags).toContain('MOVED')
    expect(result.plan.placement['A 1000']).toBe('spring-y1')
    // input untouched
    expect(plan.semesters['fall-y1']).toHaveLength(3)
  })

  it('does not duplicate the MOVED tag on repeat moves', () => {
    const plan = threeCoursePlan()
    const first = moveCourse(plan, 'fall-y1', 'spring-y1', 'A 1000')
    const second = moveCourse(first.plan, 'spring-y1', 'fall-y2', 'A 1000')
    const moved = second.plan.semesters['fall-y2'][0]
    expect(moved?.tags?.filter((t) => t === 'MOVED')).toHaveLength(1)
  })

  it('respects targetIndex when moving across semesters', () => {
    const plan = threeCoursePlan()
    plan.semesters['spring-y1'].push(course({ code: 'X 9000' }))
    const result = moveCourse(plan, 'fall-y1', 'spring-y1', 'A 1000', 0)
    expect(result.plan.semesters['spring-y1'].map((c) => c.code)).toEqual(['A 1000', 'X 9000'])
  })

  it('treats intra-semester moves as a REORDER: no MOVED tag, index adjusted (trap #7)', () => {
    const plan = threeCoursePlan()
    // Dragging A onto position 2 (before C): after the removal splice the
    // array is [B, C], so insertAt must be adjusted 2 → 1, giving [B, A, C].
    const result = moveCourse(plan, 'fall-y1', 'fall-y1', 'A 1000', 2)
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/Reordered/)
    expect(result.plan.semesters['fall-y1'].map((c) => c.code)).toEqual([
      'B 2000',
      'A 1000',
      'C 3000',
    ])
    expect(result.plan.semesters['fall-y1'][1]?.tags ?? []).not.toContain('MOVED')
  })

  it('reorders to the end (clamped) without losing the course', () => {
    const plan = threeCoursePlan()
    const result = moveCourse(plan, 'fall-y1', 'fall-y1', 'A 1000', 3)
    expect(result.plan.semesters['fall-y1'].map((c) => c.code)).toEqual([
      'B 2000',
      'C 3000',
      'A 1000',
    ])
  })

  it('does not adjust the index when moving a later course earlier', () => {
    const plan = threeCoursePlan()
    // fromIdx (2) >= insertAt (0) — no adjustment: [C, A, B]
    const result = moveCourse(plan, 'fall-y1', 'fall-y1', 'C 3000', 0)
    expect(result.plan.semesters['fall-y1'].map((c) => c.code)).toEqual([
      'C 3000',
      'A 1000',
      'B 2000',
    ])
  })

  it('refuses to move locked VIPR courses', () => {
    const plan = viperSeededPlan()
    const result = moveCourse(plan, 'summer-y1', 'fall-y1', 'VIPR 1300')
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/cannot be moved/)
  })

  it('fails cleanly when the course does not exist', () => {
    const plan = createEmptyPlan()
    const result = moveCourse(plan, 'fall-y1', 'spring-y1', 'NOPE 0000')
    expect(result.ok).toBe(false)
    expect(result.plan).toBe(plan)
  })
})

// ---- tagFulfillment ----

describe('tagFulfillment', () => {
  it('marks and unmarks a fulfillment, keyed by stable identity', () => {
    const plan = addCourse(createEmptyPlan(), 'fall-y2', { code: 'PSYC 0001' }).plan
    const on = tagFulfillment(plan, 'PSYC 0001', 'ncc-distrib-ss', true)
    expect(on.ok).toBe(true)
    expect(on.plan.fulfillments?.['PSYC 0001']).toEqual(['ncc-distrib-ss'])
    // input untouched
    expect(plan.fulfillments).toBeUndefined()

    const off = tagFulfillment(on.plan, 'PSYC 0001', 'ncc-distrib-ss', false)
    expect(off.plan.fulfillments?.['PSYC 0001']).toEqual([])
  })

  it('is idempotent when marking twice', () => {
    let plan = addCourse(createEmptyPlan(), 'fall-y2', { code: 'PSYC 0001' }).plan
    plan = tagFulfillment(plan, 'PSYC 0001', 'seas-ssh', true).plan
    plan = tagFulfillment(plan, 'PSYC 0001', 'seas-ssh', true).plan
    expect(plan.fulfillments?.['PSYC 0001']).toEqual(['seas-ssh'])
  })

  it('fails for a course not in the plan', () => {
    const plan = createEmptyPlan()
    const result = tagFulfillment(plan, 'GHOST 0000', 'ncc-kite', true)
    expect(result.ok).toBe(false)
    expect(result.plan).toBe(plan)
  })
})

// ---- swapElective ----

describe('swapElective', () => {
  it('replaces a placeholder slot, keeping slotId and setting originalCode', () => {
    const plan = createEmptyPlan()
    plan.semesters['spring-y3'].push({
      code: '—',
      title: 'Physics Lab Elective',
      cu: 1,
      category: 'sas',
      isElective: true,
      isPlaceholder: true,
      slotId: 'phys-lab',
      slotLabel: 'Physics Lab Elective (APHL)',
    })
    const result = swapElective(plan, 'phys-lab', 'PHYS 3364')
    expect(result.ok).toBe(true)
    const swapped = result.plan.semesters['spring-y3'][0]
    expect(swapped).toMatchObject({
      code: 'PHYS 3364',
      title: 'Laboratory Electronics', // from the catalog
      isPlaceholder: false,
      originalCode: 'PHYS 3364',
      slotId: 'phys-lab', // kept so we know what it fulfills
    })
    // input untouched
    expect(plan.semesters['spring-y3'][0]?.code).toBe('—')
  })

  it('keeps the slot CU for courses not in the catalog', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y3'].push({
      code: '—',
      title: 'Free Elective',
      cu: 1,
      isElective: true,
      isPlaceholder: true,
      slotId: 'free-1',
    })
    const result = swapElective(plan, 'free-1', 'BASK 1234')
    expect(result.ok).toBe(true)
    expect(result.plan.semesters['fall-y3'][0]).toMatchObject({
      code: 'BASK 1234',
      title: 'BASK 1234',
      cu: 1,
    })
  })

  it('fails for an unknown slot', () => {
    const plan = createEmptyPlan()
    const result = swapElective(plan, 'no-such-slot', 'PHYS 3364')
    expect(result.ok).toBe(false)
    expect(result.plan).toBe(plan)
  })
})

// ---- renameCourse ----

describe('renameCourse', () => {
  it('rewrites code, preserves originalCode, sets isRenamed', () => {
    const plan = addCourse(createEmptyPlan(), 'fall-y1', { code: 'CHEM 2410' }).plan
    const result = renameCourse(plan, 'CHEM 2410', 'CHEM 2411')
    expect(result.ok).toBe(true)
    expect(result.plan.semesters['fall-y1'][0]).toMatchObject({
      code: 'CHEM 2411',
      originalCode: 'CHEM 2410',
      isRenamed: true,
    })
    // renaming back clears isRenamed (code === originalCode again)
    const back = renameCourse(result.plan, 'CHEM 2410', 'CHEM 2410')
    expect(back.plan.semesters['fall-y1'][0]).toMatchObject({
      code: 'CHEM 2410',
      isRenamed: false,
    })
  })

  it('refuses to rename locked VIPR courses', () => {
    const plan = viperSeededPlan()
    const result = renameCourse(plan, 'VIPR 1200', 'VIPR 9999')
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/cannot be renamed/)
  })

  it('retitles a course, and falls back to the catalog title when only the code changes', () => {
    const plan = addCourse(createEmptyPlan(), 'fall-y1', { code: 'CHEM 2410', title: 'Organic Chemistry I' }).plan
    const retitled = renameCourse(plan, 'CHEM 2410', 'CHEM 2410', 'Orgo I')
    expect(retitled.ok).toBe(true)
    expect(retitled.plan.semesters['fall-y1'][0]).toMatchObject({ code: 'CHEM 2410', title: 'Orgo I', isRenamed: false })
    const recoded = renameCourse(plan, 'CHEM 2410', 'CHEM 2411')
    expect(recoded.plan.semesters['fall-y1'][0]).toMatchObject({ code: 'CHEM 2411', title: 'Organic Chemistry I w/ Lab' })
    const unknown = renameCourse(plan, 'CHEM 2410', 'CHEM 9999')
    expect(unknown.plan.semesters['fall-y1'][0]?.title).toBe('Organic Chemistry I')
  })

  it('names an open slot into a real course that keeps its slot intent', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y1'].push({
      code: '— ncc-kite',
      title: 'Kite Foundation',
      cu: 1,
      isPlaceholder: true,
      slotId: 'ncc-kite',
      intent: { foundation: 'ncc-kite' },
    })
    const filled = renameCourse(plan, '— ncc-kite', 'COL 0100', 'Kite Seminar')
    expect(filled.ok).toBe(true)
    expect(filled.plan.semesters['fall-y1'][0]).toMatchObject({
      code: 'COL 0100',
      title: 'Kite Seminar',
      isPlaceholder: false,
      slotId: 'ncc-kite',
      intent: { foundation: 'ncc-kite' },
    })
    const untitled = renameCourse(plan, '— ncc-kite', 'COL 0100')
    expect(untitled.plan.semesters['fall-y1'][0]?.title).toBe('Kite Foundation')
    expect(renameCourse(plan, '— ncc-kite', '— other').ok).toBe(false)
    expect(renameCourse(plan, '— ncc-kite', '  ').ok).toBe(false)
  })
})

// ---- applyMutations ----

describe('applyMutations', () => {
  it('applies a sequence and threads the plan through', () => {
    const result = applyMutations(createEmptyPlan(), [
      { kind: 'add_course', semester: 'fall-y1', course: { code: 'ECON 0100' } },
      { kind: 'move_course', from: 'fall-y1', to: 'spring-y1', courseId: 'ECON 0100' },
      { kind: 'tag_fulfillment', courseId: 'ECON 0100', fulfillmentId: 'seas-ssh', on: true },
    ])
    expect(result.ok).toBe(true)
    expect(result.plan.semesters['spring-y1'].map((c) => c.code)).toEqual(['ECON 0100'])
    expect(result.plan.fulfillments?.['ECON 0100']).toEqual(['seas-ssh'])
  })

  it('is all-or-nothing: a failed mutation returns the original plan', () => {
    const plan = viperSeededPlan()
    const result = applyMutations(plan, [
      { kind: 'add_course', semester: 'fall-y1', course: { code: 'ECON 0100' } },
      { kind: 'remove_course', semester: 'summer-y1', courseId: 'VIPR 1300' }, // fixed → fails
    ])
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Mutation 2/)
    expect(result.plan).toBe(plan)
    expect(plan.semesters['fall-y1']).toHaveLength(0)
  })

  it('handles an empty mutation list', () => {
    const plan = createEmptyPlan()
    const result = applyMutations(plan, [])
    expect(result.ok).toBe(true)
    expect(result.plan).toBe(plan)
  })
})

// ---- augmentPlan ----

describe('augmentPlan', () => {
  it('returns null without a plan', () => {
    expect(augmentPlan(null)).toBeNull()
    expect(augmentPlan(undefined)).toBeNull()
  })

  it('exposes the placement map (trap #3) and all 11 semesters on an empty plan', () => {
    const augmented = augmentPlan(createEmptyPlan())
    expect(augmented).not.toBeNull()
    expect(augmented?.placement).toEqual({})
    expect(Object.keys(augmented!.semesters)).toHaveLength(11)
    expect(augmented?.summary.totalCU).toBe(0)
    expect(augmented?.summary.unfulfilledFA).toHaveLength(6)
    expect(augmented?.summary.unfulfilledSec).toHaveLength(7)
    expect(augmented?.summary.meetsDualMin).toBe(false)
  })

  it('maps placement by originalCode || code', () => {
    let plan = addCourse(createEmptyPlan(), 'fall-y2', { code: 'CHEM 2410' }).plan
    plan = renameCourse(plan, 'CHEM 2410', 'CHEM 2411').plan
    const augmented = augmentPlan(plan)
    expect(augmented?.placement['CHEM 2410']).toBe('fall-y2')
  })

  it('handles a plan with summer-only courses', () => {
    const plan = createEmptyPlan()
    plan.semesters['summer-y1'].push(
      course({ code: 'VIPR 1300', cu: 0.5, category: 'viper', isEnergy: false }),
    )
    const augmented = augmentPlan(plan)
    expect(augmented?.summary.totalCU).toBe(0.5)
    expect(augmented?.placement['VIPR 1300']).toBe('summer-y1')
    expect(augmented?.loads['summer-y1']).toBe(0.5)
  })

  describe('star / overlap semantics', () => {
    it("category 'both' and 'viper' → crossDegreeCount 2, gold 'overlap'", () => {
      const plan = createEmptyPlan()
      plan.semesters['fall-y1'].push(
        course({ code: 'MATH 1400', category: 'both' }),
        course({ code: 'VIPR 1200', cu: 0.5, category: 'viper' }),
      )
      const [both, vipr] = augmentPlan(plan)!.semesters['fall-y1']!
      expect(both).toMatchObject({ requirementCount: 2, overlapKind: 'overlap' })
      expect(vipr).toMatchObject({ requirementCount: 2, overlapKind: 'overlap' })
    })

    it("within-degree extras (fa/sec/foundation/distribution/seas/energy) → red 'within-degree'", () => {
      const plan = createEmptyPlan()
      // sas (1) + fa (1) + sec (1) + energy (1) = 4
      plan.semesters['fall-y1'].push(
        course({
          code: 'SOCI 0006',
          category: 'sas',
          fulfills: { fa: 'CDUS', sec: 'I' },
          isEnergy: true,
        }),
      )
      const [c] = augmentPlan(plan)!.semesters['fall-y1']!
      expect(c).toMatchObject({ requirementCount: 4, overlapKind: 'within-degree' })
    })

    it('plain gened course with no contributions is silent (count 0, kind null)', () => {
      const plan = createEmptyPlan()
      plan.semesters['fall-y1'].push(course({ code: 'MISC 1000', category: 'gened' }))
      const [c] = augmentPlan(plan)!.semesters['fall-y1']!
      expect(c).toMatchObject({ requirementCount: 0, overlapKind: null })
    })

    it('user fulfillment marks build intent and count as extras', () => {
      let plan = addCourse(createEmptyPlan(), 'fall-y2', { code: 'PSYC 0001' }).plan
      plan = tagFulfillment(plan, 'PSYC 0001', 'ncc-distrib-ss', true).plan
      plan = tagFulfillment(plan, 'PSYC 0001', 'seas-ssh', true).plan
      plan = tagFulfillment(plan, 'PSYC 0001', 'ncc-kite', true).plan
      const [c] = augmentPlan(plan)!.semesters['fall-y2']!
      expect(c?.userFulfills).toEqual(['ncc-distrib-ss', 'seas-ssh', 'ncc-kite'])
      expect(c?.intent).toMatchObject({
        distribution: 'SS',
        foundation: 'ncc-kite',
        seas: ['ssh'],
      })
      // gened (0 cross) + distribution + seas + foundation = 3 → within-degree
      expect(c).toMatchObject({ requirementCount: 3, overlapKind: 'within-degree' })
    })

    it('ctx.userPlanFulfillments takes precedence over plan.fulfillments', () => {
      const plan = addCourse(createEmptyPlan(), 'fall-y2', { code: 'PSYC 0001' }).plan
      const augmented = augmentPlan(plan, {
        userPlanFulfillments: { 'PSYC 0001': ['ncc-distrib-h'] },
      })
      expect(augmented?.semesters['fall-y2']?.[0]?.intent?.distribution).toBe('H')
    })
  })

  it('classifies semester loads: >5.5 overload, >6.5 approval, >7.5 exceeds-max', () => {
    const plan = createEmptyPlan()
    const fill = (sem: 'fall-y1' | 'fall-y2' | 'fall-y3', cu: number) => {
      plan.semesters[sem].push(course({ code: `X ${sem}`, cu }))
    }
    fill('fall-y1', 6) // overload
    fill('fall-y2', 7) // approval
    fill('fall-y3', 8) // exceeds max
    const s = augmentPlan(plan)!.summary
    expect(s.overloadSemesters).toEqual(['fall-y1'])
    expect(s.approvalSemesters).toEqual(['fall-y2'])
    expect(s.exceedsMaxSemesters).toEqual(['fall-y3'])
  })

  it('tracks energy count, double-counted codes, and FA/Sector fulfillment', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y1'].push(
      course({ code: 'EESC 2300', category: 'both', isEnergy: true, isDouble: true, fulfills: { sec: 'VII' } }),
      course({ code: 'WRIT 0130', category: 'gened', fulfills: { fa: 'WRIT' } }),
      course({ code: 'SLOT', intent: { sec: 'I' } }),
    )
    const s = augmentPlan(plan)!.summary
    expect(s.energyCoursesCount).toBe(1)
    expect(s.doubleCountedCodes).toEqual(['EESC 2300'])
    expect(s.fulfilledFA).toContain('WRIT')
    expect(s.fulfilledSec).toEqual(expect.arrayContaining(['VII', 'I']))
    expect(s.unfulfilledSec).not.toContain('I')
  })

  it('meetsDualMin uses the VIPER program minimum (46 CU)', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y1'].push(course({ code: 'BIG 0001', cu: 45.5 }))
    expect(augmentPlan(plan)!.summary.meetsDualMin).toBe(false)
    plan.semesters['fall-y1'].push(course({ code: 'BIG 0002', cu: 0.5 }))
    expect(augmentPlan(plan)!.summary.meetsDualMin).toBe(true)
  })
})

// ---- share link ----

describe('share link', () => {
  const state: AppState = {
    sasMajorKey: 'CHEM',
    sasConcKey: 'STANDARD',
    seasMajorKey: 'CBE',
    seasConcKey: 'ENERGY',
    apCreditIds: [],
    gradYear: 2028,
    shiftForward: true,
    genedDistribution: 'frontload',
    curriculumMode: 'ncc',
    viperMods: { fysWaiver: true, keyWaiver: false },
    distributionTargets: { N: 12, SS: 5, H: 3 },
    userPlan: {
      semesters: {
        'fall-y1': [{ code: 'CHEM 1012', title: 'General Chemistry I — Lecture', cu: 1 }],
      },
    },
    userPlanFulfillments: { 'CHEM 1012': ['ncc-distrib-n'] },
    userColorOverrides: { 'CHEM 1012': '#3d6ec9' },
  }

  it('round-trips the full app state (including non-ASCII characters)', () => {
    const decoded = decodeShareState(encodeShareState(state))
    expect(decoded).toEqual(state)
  })

  it('uses the old wire format exactly: btoa(unescape(encodeURIComponent(JSON)))', () => {
    // This expression is copied verbatim from the old app's copyShareLink —
    // existing links in the wild were produced by it.
    const oldAppHash = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
    expect(encodeShareState(state)).toBe(oldAppHash)
    expect(decodeShareState(oldAppHash)).toEqual(state)
  })

  it('accepts a leading # and rejects garbage without throwing', () => {
    expect(decodeShareState(`#${encodeShareState(state)}`)).toEqual(state)
    expect(decodeShareState('')).toBeNull()
    expect(decodeShareState('#')).toBeNull()
    expect(decodeShareState('!!!not-base64!!!')).toBeNull()
    expect(decodeShareState(btoa('not json'))).toBeNull()
  })

  it('builds a full URL with the fragment', () => {
    const url = buildShareLink(state, 'https://viper.example/planner')
    expect(url.startsWith('https://viper.example/planner#')).toBe(true)
    expect(decodeShareState(url.split('#')[1] ?? '')).toEqual(state)
  })
})

// ---- JSON serialize / import ----

describe('JSON export/import', () => {
  it('stamps version 8 and round-trips through parseAppState', () => {
    const json = serializeAppState({ sasMajorKey: 'CHEM', gradYear: 2028 })
    const parsed = parseAppState(json)
    expect(parsed?.version).toBe(8)
    expect(parsed?.sasMajorKey).toBe('CHEM')
    expect(parsed?.exportedAt).toBeTruthy()
  })

  it('parseAppState never throws and drops malformed userPlan', () => {
    expect(parseAppState('not json')).toBeNull()
    expect(parseAppState('[1,2,3]')).toBeNull()
    expect(parseAppState('"hi"')).toBeNull()
    const parsed = parseAppState(JSON.stringify({ gradYear: 2028, userPlan: 'bogus' }))
    expect(parsed?.userPlan).toBeNull()
    expect(parsed?.gradYear).toBe(2028)
  })

  it('planFromAppState hydrates all 11 keys plus loads/placement/fulfillments', () => {
    const plan = planFromAppState({
      gradYear: 2028,
      userPlan: { semesters: { 'fall-y1': [{ code: 'CHEM 1012', title: 'Gen Chem', cu: 1 }] } },
      userPlanFulfillments: { 'CHEM 1012': ['ncc-distrib-n'] },
    })
    expect(plan).not.toBeNull()
    expect(Object.keys(plan!.semesters)).toHaveLength(11)
    expect(plan!.loads['fall-y1']).toBe(1)
    expect(plan!.placement['CHEM 1012']).toBe('fall-y1')
    expect(plan!.fulfillments?.['CHEM 1012']).toEqual(['ncc-distrib-n'])
    expect(plan!.meta.gradYear).toBe(2028)
  })
})

// ---- CSV ----

describe('CSV export', () => {
  function csvFixture(): string {
    let plan = viperSeededPlan()
    plan = addCourse(plan, 'fall-y1', { code: 'CHEM 1012', category: 'sas' }).plan
    plan = addCourse(plan, 'spring-y1', { code: 'MATH 1410', category: 'both' }).plan
    const augmented = augmentPlan(plan, { gradYear: 2028 })!
    return planToCSV(augmented, {
      sasMajorName: 'Chemistry',
      seasMajorName: 'Chemical & Biomolecular Engineering',
      gradYear: 2028,
    })
  }

  it('does NOT contain the developer credit line (trap #8)', () => {
    const csv = csvFixture()
    expect(csv).not.toContain('Developed by')
    expect(csv).not.toContain('Arjun Sharma')
  })

  it('matches the old column format', () => {
    const csv = csvFixture()
    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      '"VIPER Four-Year Plan: Chemistry (BA) + Chemical & Biomolecular Engineering (BSE) — Class of 2028"',
    )
    expect(csv).toContain('"Year 1"')
    expect(csv).toContain('"Fall 2024","","","Spring 2025"') // gradYear-aware season labels
    expect(csv).toContain('"Course","CU","","Course","CU"')
    expect(csv).toContain('"CHEM 1012 (General Chemistry I)","1"')
    // per-semester totals, then the summary block
    expect(csv).toContain('"Total","1.0","","Total","1.5"') // Year 1: CHEM 1012 / MATH 1410 + VIPR 1200
    expect(csv).toContain('"Summary"')
    expect(csv).toContain('"Total CU","7.0"') // 2 courses + 10 × 0.5 VIPR
    expect(csv).toContain('"Energy courses","0/3"')
    expect(csv).toContain('"Double-counted","0"')
  })

  it('escapes embedded quotes', () => {
    const plan = addCourse(createEmptyPlan(), 'fall-y1', {
      code: 'ENGL 0040',
      title: 'Reading "Difficult" Texts',
    }).plan
    const csv = planToCSV(augmentPlan(plan)!, {
      sasMajorName: 'English',
      seasMajorName: 'CIS',
      gradYear: null,
    })
    expect(csv).toContain('"ENGL 0040 (Reading ""Difficult"" Texts)"')
  })
})

// ---- storage ----

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fakeStorage(): Storage {
    const map = new Map<string, string>()
    return {
      get length() {
        return map.size
      },
      clear: () => map.clear(),
      getItem: (k: string) => map.get(k) ?? null,
      key: (i: number) => [...map.keys()][i] ?? null,
      removeItem: (k: string) => {
        map.delete(k)
      },
      setItem: (k: string, v: string) => {
        map.set(k, v)
      },
    }
  }

  it('round-trips app state through the versioned key', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    const state: AppState = { sasMajorKey: 'CHEM', seasMajorKey: 'CBE', gradYear: 2028 }
    expect(saveAppState(state)).toBe(true)
    expect(safeGetItem(STORAGE_KEYS.appState)).toContain('"version":8')
    expect(loadAppState()).toMatchObject({ ...state, version: 8 })
  })

  it('returns null/false gracefully when localStorage is missing', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadAppState()).toBeNull()
    expect(saveAppState({ gradYear: 2028 })).toBe(false)
    expect(safeGetItem('anything')).toBeNull()
    expect(safeSetItem('anything', 'x')).toBe(false)
  })

  it('never throws when the storage backend throws (quota / private mode)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    } as unknown as Storage
    vi.stubGlobal('localStorage', throwing)
    expect(() => loadAppState()).not.toThrow()
    expect(loadAppState()).toBeNull()
    expect(saveAppState({ gradYear: 2028 })).toBe(false)
  })

  it('returns null for corrupt persisted JSON', () => {
    const s = fakeStorage()
    s.setItem(STORAGE_KEYS.appState, '{corrupt')
    vi.stubGlobal('localStorage', s)
    expect(loadAppState()).toBeNull()
  })
})

describe('planFromAppState — curriculum the plan was built under', () => {
  it('restores meta.curriculumMode from planCurriculumMode so a reloaded NCC plan is not flagged as legacy', () => {
    const state = parseAppState(
      JSON.stringify({
        version: 8,
        sasMajorKey: 'CHEM',
        seasMajorKey: 'CBE',
        gradYear: 2028,
        curriculumMode: 'ncc',
        planCurriculumMode: 'ncc',
        userPlan: { semesters: { 'fall-y1': [{ code: 'CHEM 1012', title: 'General Chemistry I', cu: 1 }] } },
      }),
    )
    expect(state).not.toBeNull()
    const plan = planFromAppState(state!)
    expect(plan?.meta.curriculumMode).toBe('ncc')
  })

  it('leaves meta.curriculumMode unset for states saved before the field existed (old plans stay legacy)', () => {
    const state = parseAppState(
      JSON.stringify({
        version: 8,
        sasMajorKey: 'CHEM',
        seasMajorKey: 'CBE',
        gradYear: 2028,
        curriculumMode: 'ncc',
        userPlan: { semesters: { 'fall-y1': [] } },
      }),
    )
    const plan = planFromAppState(state!)
    expect(plan?.meta.curriculumMode).toBeUndefined()
  })
})
