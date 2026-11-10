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

describe('CHEM + MSE: MSE 2210 no longer substitutes for CHEM 2210 (Michelle, 2026-11-04)', () => {
  it('is gone from the CHEM data', async () => {
    const { MAJORS } = await import('../data/majors')
    const chem = MAJORS['CHEM']!
    expect((chem.substitutions ?? []).some((s) => s.to === 'MSE 2210' || s.from === 'MSE 2210')).toBe(false)
    expect(chem.notes.some((n) => /MSE 2210 → CHEM 2210/.test(n))).toBe(false)
  })
  for (const mode of ['legacy', 'ncc'] as const) {
    it(`${mode} seed plans both CHEM 2210 and MSE 2210, and the audit does not accept MSE 2210 for CHEM 2210`, () => {
      const plan = seedPlan({ sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'MSE', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2028, curriculumMode: mode })!
      const codes = all(plan).map((c) => c.code)
      expect(codes).toContain('CHEM 2210')
      expect(codes).toContain('MSE 2210')
      const row = computeMajorAudit(augmentPlan(plan)!, 'CHEM', 'STANDARD', 'MSE')!.core.find((r) => r.id === 'CHEM 2210')!
      expect(row.options).not.toContain('MSE 2210')
      expect(row.by).toBe('CHEM 2210')
    })
  }
})
