import { describe, expect, it } from 'vitest'
import { seedPlan } from '../ui/store/use-plan-store'
import { buildPlanContext } from './plan-context'

const CONFIG = {
  sasMajorKey: 'CHEM',
  sasConcKey: 'STANDARD',
  seasMajorKey: 'CBE',
  seasConcKey: 'ENERGY',
  apCreditIds: [],
  gradYear: 2028,
}

describe('buildPlanContext', () => {
  it('is an order of magnitude smaller than the raw plan JSON', () => {
    const plan = seedPlan(CONFIG)!
    const digest = buildPlanContext(plan)
    const raw = JSON.stringify(plan)
    // The whole point: digest must stay a fraction of the raw serialization.
    expect(digest.length).toBeLessThan(raw.length / 5)
    expect(digest.length).toBeLessThan(8000)
  })

  it('carries majors, every non-empty semester with load, and credits', () => {
    const plan = seedPlan(CONFIG)!
    const digest = buildPlanContext(plan)
    expect(digest).toContain('CHEM (BA')
    expect(digest).toContain('CBE (BSE')
    expect(digest).toContain('Class of 2028')
    expect(digest).toMatch(/fall-y1 \[[\d.]+ CU\]:/)
    expect(digest).toContain('VIPR 1300')
    expect(digest).toContain('fixed')
  })

  it('includes user fulfillment marks when present', () => {
    const plan = seedPlan(CONFIG)!
    plan.fulfillments = { 'CHEM 1012': ['seas-ssh'] }
    expect(buildPlanContext(plan)).toContain('CHEM 1012→seas-ssh')
  })
})
