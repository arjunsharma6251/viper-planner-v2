import { describe, expect, it } from 'vitest'
import type { AugmentedCourse, AugmentedPlan } from './types'
import { computeNccAudit } from './ncc-audit'
import { DEFAULT_VIPER_MODS } from '../ncc/mods'

function course(partial: Partial<AugmentedCourse> & { code: string }): AugmentedCourse {
  return {
    title: partial.code,
    cu: 1,
    userFulfills: [],
    requirementCount: 0,
    overlapKind: null,
    ...partial,
  }
}

function plan(semesters: Record<string, AugmentedCourse[]>): AugmentedPlan {
  return {
    semesters,
    loads: {},
    placement: {},
    summary: {
      totalCU: 0,
      sasCU: 0,
      seasCU: 0,
      energyCoursesCount: 0,
      doubleCountedCodes: [],
      meetsDualMin: false,
      meetsEnergyReq: false,
      fulfilledFA: [],
      unfulfilledFA: [],
      fulfilledSec: [],
      unfulfilledSec: [],
      overloadSemesters: [],
      approvalSemesters: [],
      exceedsMaxSemesters: [],
      exceedsMaxCourses: [],
    },
    meta: {},
    notes: [],
  }
}

describe('computeNccAudit — confirmed policy only', () => {
  it('VIPR 1200 satisfies First-Year Seminar; nothing else is waived by default', () => {
    const a = computeNccAudit(plan({ 'spring-y1': [course({ code: 'VIPR 1200', cu: 0.5 })] }))
    const byId = Object.fromEntries(a.foundations.map((f) => [f.id, f]))
    expect(byId['ncc-fys']?.state).toBe('approved-overlap')
    expect(byId['ncc-key']?.state).toBe('missing')
    expect(byId['ncc-lang']?.state).toBe('missing')
    expect(byId['ncc-pad']?.state).toBe('missing')
    expect(a.plannedFoundations).toBe(1)
  })

  it('ignores sandbox proposals unless explicitly passed', () => {
    const p = plan({ 'fall-y1': [course({ code: 'VIPR 1200', cu: 0.5 })] })
    const student = computeNccAudit(p)
    const sandbox = computeNccAudit(p, [], DEFAULT_VIPER_MODS)
    // Confirmed view never shows Language as waived; the proposal set has no
    // language waiver mechanism in this audit either, so both are 'missing' —
    // the difference shows in the distribution double-counts below.
    expect(student.foundations.find((f) => f.id === 'ncc-lang')?.state).toBe('missing')
    expect(sandbox.foundations.find((f) => f.id === 'ncc-fys')?.state).toBe('approved-overlap')
  })

  it('labels follow the College chart', () => {
    const a = computeNccAudit(plan({}))
    expect(a.foundations.map((f) => f.label)).toEqual([
      'Kite',
      'Key',
      'First-Year Seminar',
      'Perspectives and Difference',
      'Language (0–2 CU)',
      'Critical Writing',
    ])
  })

  it('assigns the 5 and 3 CU targets to whichever division is fuller', () => {
    const ss = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        course({ code: `SOCI ${1000 + i}`, intent: { distribution: 'SS' } }),
      )
    const h = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        course({ code: `HIST ${1000 + i}`, intent: { distribution: 'H' } }),
      )
    const ssHeavy = computeNccAudit(plan({ 'fall-y2': [...ss(4), ...h(1)] }))
    expect(ssHeavy.divisions.map((d) => [d.id, d.target])).toEqual([
      ['SS', 5],
      ['H', 3],
    ])
    const hHeavy = computeNccAudit(plan({ 'fall-y2': [...ss(1), ...h(4)] }))
    expect(hHeavy.divisions.map((d) => [d.id, d.target])).toEqual([
      ['SS', 3],
      ['H', 5],
    ])
  })

  it('counts open slots as planned Foundations', () => {
    const a = computeNccAudit(
      plan({
        'fall-y2': [
          course({
            code: '— ncc-kite #1',
            title: 'Kite Foundation',
            isPlaceholder: true,
            slotId: 'ncc-kite',
            intent: { foundation: 'ncc-kite' },
          }),
        ],
      }),
    )
    const kite = a.foundations.find((f) => f.id === 'ncc-kite')
    expect(kite?.state).toBe('planned')
    expect(kite?.by).toBe('open slot · Kite Foundation')
  })

  it('SEAS: writing via the College seminar, ethics via VIPR, SS/H courses toward the 5', () => {
    const a = computeNccAudit(
      plan({
        'spring-y1': [
          course({ code: 'VIPR 1210', cu: 0.5 }),
          course({ code: '— writ', title: 'Writing Seminar', isPlaceholder: true, slotId: 'gened-writ' }),
        ],
        'fall-y3': [
          course({ code: 'ECON 0100', intent: { distribution: 'SS' } }),
          course({ code: 'PHIL 0001', userFulfills: ['seas-ssh'] }),
        ],
      }),
    )
    const byId = Object.fromEntries(a.seas.map((r) => [r.id, r]))
    expect(byId['seas-writ']?.planned).toBe(1)
    expect(byId['seas-ethics']?.by).toBe('VIPR 1210')
    expect(byId['seas-ssh']?.planned).toBe(2)
  })

  it('maps seeded old-curriculum sectors onto NCC divisions', () => {
    const a = computeNccAudit(
      plan({
        'fall-y3': [
          course({ code: '— s1', title: 'Sector I: Society', isPlaceholder: true, intent: { sec: 'I' } }),
          course({ code: '— s2', title: 'Sector II: History & Tradition', isPlaceholder: true, intent: { sec: 'II' } }),
          course({ code: '— s3', title: 'Sector III: Arts & Letters', isPlaceholder: true, intent: { sec: 'III' } }),
          course({ code: '— s4', title: 'Sector IV', isPlaceholder: true, intent: { sec: 'IV' } }),
          course({ code: '— cca', title: 'Cross-Cultural Analysis', isPlaceholder: true, intent: { fa: 'CCA' } }),
          course({ code: '— s5', title: 'Sector V: Living World', isPlaceholder: true, intent: { sec: 'V' } }),
        ],
      }),
    )
    // Fixed: SS 1 (Sector I), H 2 (II + III). Flexible 2 (IV + CCA) fill the
    // larger gap first: H is fuller so it takes the 5-target; gaps H 3, SS 2 →
    // H, then SS. Result SS 2/3, H 3/5. Sector V (natural science) is ignored.
    expect(a.divisions.map((d) => [d.id, d.planned, d.target])).toEqual([
      ['SS', 2, 3],
      ['H', 3, 5],
    ])
    expect(a.seas.find((r) => r.id === 'seas-ssh')?.planned).toBe(5)
  })
})
