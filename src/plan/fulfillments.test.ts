import { describe, expect, it } from 'vitest'
import { derivedFulfillments, effectiveFulfillments, nextMarks } from './fulfillments'
import { applyMutation, createEmptyPlan } from './mutations'
import { augmentPlan } from './augment'
import { computeNccAudit } from './ncc-audit'
import type { PlannedCourse } from './types'

const padSlot: PlannedCourse = {
  code: '— ncc-pad',
  title: 'Perspectives and Difference',
  cu: 1,
  category: 'gened',
  isPlaceholder: true,
  slotId: 'ncc-pad',
  intent: { foundation: 'ncc-pad', distribution: 'SS' },
}

describe('derived fulfillments', () => {
  it('reads Foundation, division and SEAS off a P&D slot', () => {
    expect(derivedFulfillments(padSlot).sort()).toEqual(['ncc-distrib-ss', 'ncc-pad', 'seas-ssh'])
  })

  it('Kite / Writing slots carry their division for placement only', () => {
    const kite = derivedFulfillments({ code: '— ncc-kite', title: 'Kite', cu: 1, slotId: 'ncc-kite', intent: { foundation: 'ncc-kite', distribution: 'H' } })
    expect(kite).toEqual(['ncc-kite'])
    const writ = derivedFulfillments({ code: '— ncc-writ', title: 'Writing', cu: 1, slotId: 'ncc-writ', intent: { foundation: 'ncc-writ', distribution: 'H' } })
    expect(writ.sort()).toEqual(['ncc-writ', 'seas-writ'])
  })

  it('reads old-core attributes and energy off catalog fields', () => {
    const t = derivedFulfillments({ code: 'MATH 1400', title: 'Calc', cu: 1, fa: 'QDA' })
    expect(t).toContain('fa:QDA')
    expect(derivedFulfillments({ code: 'CBE 5050', title: 'Carbon Capture', cu: 1, isEnergy: true })).toEqual(['viper-energy'])
    expect(derivedFulfillments({ code: 'VIPR 1210', title: 'VIPR', cu: 0.5 }).sort()).toEqual(['seas-ethics', 'sec:VII'])
  })
})

describe('overrides', () => {
  it('unticking a derived tag records !tag; ticking it again clears the override', () => {
    const off = nextMarks(padSlot, undefined, 'ncc-distrib-ss', false)
    expect(off).toEqual(['!ncc-distrib-ss'])
    expect(effectiveFulfillments(padSlot, off)).not.toContain('ncc-distrib-ss')
    expect(nextMarks(padSlot, off, 'ncc-distrib-ss', true)).toEqual([])
  })

  it('ticking a non-derived tag adds it; unticking removes the addition', () => {
    const on = nextMarks(padSlot, undefined, 'ncc-distrib-h', true)
    expect(on).toEqual(['ncc-distrib-h'])
    expect(nextMarks(padSlot, on, 'ncc-distrib-h', false)).toEqual([])
  })

  it('the audit follows the checkboxes through the mutation API', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y2'].push(padSlot)
    const before = computeNccAudit(augmentPlan(plan)!)
    expect(before.divisions.find((d) => d.id === 'SS')?.planned).toBe(1)

    const off = applyMutation(plan, { kind: 'tag_fulfillment', courseId: padSlot.code, fulfillmentId: 'ncc-distrib-ss', on: false })
    expect(off.ok).toBe(true)
    const aug = augmentPlan(off.plan)!
    const row = aug.semesters['fall-y2']![0]!
    expect(row.effectiveFulfills).not.toContain('ncc-distrib-ss')
    expect(row.removedFulfills).toEqual(['ncc-distrib-ss'])
    expect(computeNccAudit(aug).divisions.find((d) => d.id === 'SS')?.planned).toBe(0)
    // Still the P&D Foundation — only the division was overridden.
    expect(computeNccAudit(aug).foundations.find((f) => f.id === 'ncc-pad')?.state).toBe('planned')
  })

  it('unticking a catalog energy course takes it out of the energy count', () => {
    const plan = createEmptyPlan()
    plan.semesters['spring-y4'].push({ code: 'CBE 5050', title: 'Carbon Capture', cu: 1, isEnergy: true })
    expect(augmentPlan(plan)!.summary.energyCoursesCount).toBe(1)
    const off = applyMutation(plan, { kind: 'tag_fulfillment', courseId: 'CBE 5050', fulfillmentId: 'viper-energy', on: false })
    expect(augmentPlan(off.plan)!.summary.energyCoursesCount).toBe(0)
  })

  it('old-core sectors can be claimed and unclaimed', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y3'].push({ code: 'HIST 0100', title: 'History', cu: 1 })
    const on = applyMutation(plan, { kind: 'tag_fulfillment', courseId: 'HIST 0100', fulfillmentId: 'sec:II', on: true })
    expect(augmentPlan(on.plan)!.summary.fulfilledSec).toContain('II')
    const off = applyMutation(on.plan, { kind: 'tag_fulfillment', courseId: 'HIST 0100', fulfillmentId: 'sec:II', on: false })
    expect(augmentPlan(off.plan)!.summary.fulfilledSec).not.toContain('II')
  })
})

describe('review regressions (2026-10-05)', () => {
  it('a ticked College division also counts toward SEAS SS/H, unless unticked there', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y3'].push({ code: 'ZZZZ 0100', title: 'Custom', cu: 1, category: 'gened' })
    const ticked = applyMutation(plan, { kind: 'tag_fulfillment', courseId: 'ZZZZ 0100', fulfillmentId: 'ncc-distrib-ss', on: true }).plan
    const seasOf = (p: typeof plan) =>
      computeNccAudit(augmentPlan(p)!, [], undefined, 'CBE').seas.flatMap((r) => r.courses.map((c) => c.code))
    expect(seasOf(ticked)).toContain('ZZZZ 0100')
    const unticked = applyMutation(ticked, { kind: 'tag_fulfillment', courseId: 'ZZZZ 0100', fulfillmentId: 'seas-ssh', on: false }).plan
    expect(unticked.fulfillments?.['ZZZZ 0100']).toEqual(['ncc-distrib-ss', '!seas-ssh'])
    expect(seasOf(unticked)).not.toContain('ZZZZ 0100')
  })

  it('renaming a course re-reads its catalog attributes', () => {
    const plan = createEmptyPlan()
    plan.semesters['fall-y1'].push({ code: 'MATH 1400', title: 'Calculus I', cu: 1, fa: 'QDA' })
    const renamed = applyMutation(plan, { kind: 'rename_course', courseId: 'MATH 1400', newCode: 'ZZZZ 1400' }).plan
    expect(augmentPlan(renamed)!.summary.fulfilledFA).not.toContain('QDA')
  })

  it('adding a catalog course attaches its attributes', () => {
    const added = applyMutation(createEmptyPlan(), { kind: 'add_course', semester: 'fall-y3', course: { code: 'CBE 5050' } }).plan
    expect(augmentPlan(added)!.summary.energyCoursesCount).toBe(1)
  })

  it('filling an open slot carries its overrides to the new course', () => {
    const plan = createEmptyPlan()
    plan.semesters['spring-y3'].push({ ...padSlot })
    const off = applyMutation(plan, { kind: 'tag_fulfillment', courseId: padSlot.code, fulfillmentId: 'seas-ssh', on: false }).plan
    const filled = applyMutation(off, { kind: 'rename_course', courseId: padSlot.code, newCode: 'ZZZZ 2000' }).plan
    expect(filled.fulfillments?.[padSlot.code]).toBeUndefined()
    expect(filled.fulfillments?.['ZZZZ 2000']).toEqual(['!seas-ssh'])
    expect(augmentPlan(filled)!.semesters['spring-y3']![0]!.effectiveFulfills).not.toContain('seas-ssh')
  })

  it('the old-core FL is covered by a language waiver passed as credit', () => {
    const aug = augmentPlan(createEmptyPlan(), { apCreditIds: ['lang-fluency'] })!
    expect(aug.summary.fulfilledFA).toContain('FL')
  })
})
