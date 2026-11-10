// Finished terms for current students (2026-11 beta feedback, Austin).
import { beforeAll, describe, expect, it } from 'vitest'
import { installNccModule } from '../ncc/scheduler-module'
import { seedPlan, type PlanConfig } from '../ui/store/use-plan-store'
import { augmentPlan } from './augment'
import { computeMajorAudit } from './major-audit'
import type { Plan } from './types'

beforeAll(() => installNccModule())

const base: PlanConfig = {
  sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'CBE', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2028, curriculumMode: 'legacy',
}
const codesIn = (plan: Plan, k: keyof Plan['semesters']) => plan.semesters[k].filter((c) => !c.code.startsWith('VIPR')).map((c) => c.code)
const all = (plan: Plan) => Object.values(plan.semesters).flat()

describe('completed terms', () => {
  it('a finished term holds exactly what the student took', () => {
    const took = ['CHEM 1012', 'CHEM 1101', 'MATH 1400', 'WRIT 0130', 'XYZ 1234']
    const plan = seedPlan({ ...base, completedTerms: { 'fall-y1': took } })!
    expect(codesIn(plan, 'fall-y1').sort()).toEqual([...took].sort())
  })

  it('fills the open slot the course satisfies instead of adding a second line', () => {
    const plan = seedPlan({ ...base, completedTerms: { 'fall-y1': ['WRIT 0130'] } })!
    const writ = all(plan).filter((c) => c.code === 'WRIT 0130')
    expect(writ).toHaveLength(1)
    expect(writ[0]).toMatchObject({ slotId: 'gened-writ', isPlaceholder: false })
    expect(all(plan).some((c) => c.slotId === 'gened-writ' && c.code.startsWith('—'))).toBe(false)
  })

  it('moves what the seed planned there but the student did not take, and drops nothing required', () => {
    const fresh = seedPlan(base)!
    const plan = seedPlan({ ...base, completedTerms: { 'fall-y1': ['CHEM 1012', 'CHEM 1101', 'MATH 1400'] } })!
    expect(codesIn(fresh, 'fall-y1')).toContain('CBE 1600')
    expect(codesIn(plan, 'fall-y1')).not.toContain('CBE 1600')
    expect(all(plan).filter((c) => c.code === 'CBE 1600')).toHaveLength(1)
    for (const a of [computeMajorAudit(augmentPlan(plan)!, 'CHEM', 'STANDARD', 'CBE')!, computeMajorAudit(augmentPlan(plan)!, 'CBE', 'ENERGY', 'CHEM')!])
      expect(a.core.filter((r) => !r.done)).toEqual([])
  })

  it('an uncatalogued code is titled by its code; VIPR rows stay put', () => {
    const plan = seedPlan({ ...base, completedTerms: { 'spring-y1': ['XYZ 1234'] } })!
    expect(plan.semesters['spring-y1'].find((c) => c.code === 'XYZ 1234')).toMatchObject({ title: 'XYZ 1234' })
    expect(plan.semesters['spring-y1'].some((c) => c.code === 'VIPR 1200')).toBe(true)
  })

  it('no completed terms leaves the seed unchanged', () => {
    expect(seedPlan({ ...base, completedTerms: {} })).toEqual(seedPlan(base))
  })
})
