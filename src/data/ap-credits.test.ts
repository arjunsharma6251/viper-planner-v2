import { beforeAll, describe, expect, it } from 'vitest'
import { findApCredit, normalizeCourseCode, transferCreditId } from './ap-credits'
import { installNccModule } from '../ncc/scheduler-module'
import { seedPlan } from '../ui/store/use-plan-store'

beforeAll(() => installNccModule())

describe('credit from another institution', () => {
  it('normalizes what the student types and rejects non-codes', () => {
    expect(normalizeCourseCode(' chem2210 ')).toBe('CHEM 2210')
    expect(normalizeCourseCode('CHEM  2210')).toBe('CHEM 2210')
    expect(normalizeCourseCode('organic chem')).toBeNull()
    expect(findApCredit('transfer:not a code')).toBeUndefined()
  })
  it('grants exactly the course the student named, with a confirm-in-Path@Penn note', () => {
    const c = findApCredit(transferCreditId('CHEM 2210'))!
    expect(c).toMatchObject({ kind: 'transfer', credit: true, grants: ['CHEM 2210'] })
    expect(String(c.note)).toMatch(/Path@Penn/)
  })
  for (const mode of ['legacy', 'ncc'] as const) {
    it(`${mode} seed treats it like any incoming credit`, () => {
      const plan = seedPlan({ sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'MSE', seasConcKey: 'ENERGY', apCreditIds: [transferCreditId('CHEM 2210')], gradYear: 2028, curriculumMode: mode })!
      expect(plan.placement['CHEM 2210']).toBe('credit')
      expect(Object.values(plan.semesters).flat().some((c) => c.code === 'CHEM 2210')).toBe(false)
    })
  }
})
