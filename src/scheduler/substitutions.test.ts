// Pairing substitutions in the scheduler seed (majors.ts `substitutions`).
import { beforeAll, describe, expect, it } from 'vitest'
import { installNccModule } from '../ncc/scheduler-module'
import { seedPlan } from '../ui/store/use-plan-store'
import { augmentPlan } from '../plan/augment'
import { computeMajorAudit } from '../plan/major-audit'

beforeAll(() => installNccModule())

const all = (plan: NonNullable<ReturnType<typeof seedPlan>>) => Object.values(plan.semesters).flat()

describe('CHEM + CBE: CBE 3530 stands in for CHEM 2220 (Michelle, reconfirmed 2026-11-04)', () => {
  for (const mode of ['legacy', 'ncc'] as const) {
    it(`${mode} seed plans CBE 3530 once, counted for both degrees, and no CHEM 2220`, () => {
      const plan = seedPlan({ sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'CBE', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2028, curriculumMode: mode })!
      const courses = all(plan)
      expect(courses.filter((c) => c.code === 'CHEM 2220')).toEqual([])
      const cbe3530 = courses.filter((c) => c.code === 'CBE 3530')
      expect(cbe3530).toHaveLength(1)
      expect(cbe3530[0]).toMatchObject({ category: 'both', note: 'Also stands in for CHEM 2220 (approved CHEM-CBE substitution).' })
      const chem = computeMajorAudit(augmentPlan(plan)!, 'CHEM', 'STANDARD', 'CBE')!
      expect(chem.core.find((r) => r.id === 'CHEM 2220')).toMatchObject({ done: true, by: 'CBE 3530' })
    })
  }

  it('other pairings still seed CHEM 2220', () => {
    const plan = seedPlan({ sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'MEAM', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2028, curriculumMode: 'legacy' })!
    expect(all(plan).some((c) => c.code === 'CHEM 2220')).toBe(true)
  })
})
