// Seeded energy picks are suggestions in a swappable slot (2026-11 beta feedback).
import { beforeAll, describe, expect, it } from 'vitest'
import { installNccModule } from '../ncc/scheduler-module'
import { seedPlan } from '../ui/store/use-plan-store'
import { swapElective } from '../plan/mutations'
import { augmentPlan } from '../plan/augment'

beforeAll(() => installNccModule())

describe('energy fallback picks', () => {
  const plan = seedPlan({ sasMajorKey: 'PHYS', sasConcKey: 'NONE', seasMajorKey: 'ESE', seasConcKey: 'NONE', apCreditIds: [], gradYear: 2028, curriculumMode: 'legacy' })!
  const picks = Object.values(plan.semesters).flat().filter((c) => c.slotId?.startsWith('viper-energy-'))

  it('read as suggested picks with other options', () => {
    expect(picks.length).toBeGreaterThan(0)
    for (const c of picks) {
      expect(c.slotLabel).toBe('VIPER energy course · suggested pick')
      expect(c.note).toMatch(/suggested pick/)
      expect(c.pool!.length).toBeGreaterThan(1)
    }
    expect(new Set(picks.map((c) => c.slotId)).size).toBe(picks.length)
  })

  it('swap like any other slot and still count as energy', () => {
    const slotId = picks[0]!.slotId!
    const other = picks[0]!.pool!.find((c) => !Object.values(plan.semesters).flat().some((x) => x.code === c))!
    const res = swapElective(plan, slotId, other)
    expect(res.ok).toBe(true)
    const after = augmentPlan(res.plan)!
    expect(Object.values(after.semesters).flat().find((c) => c.slotId === slotId)).toMatchObject({ code: other, isEnergy: true })
    expect(after.summary.meetsEnergyReq).toBe(true)
  })
})
