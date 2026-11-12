import { describe, expect, it } from 'vitest'
import { classAlternatives, majorForClass, mathSwaps } from './math-sequence'
import { seedPlan } from '../ui/store/use-plan-store'
import { installNccModule } from '../ncc/scheduler-module'
import { augmentPlan } from '../plan/augment'
import { computeMajorAudit } from '../plan/major-audit'

installNccModule()

const codesOf = (sas: string, sasConc: string | null, seas: string, gradYear: number) =>
  Object.values(seedPlan({ sasMajorKey: sas, sasConcKey: sasConc, seasMajorKey: seas, seasConcKey: null, apCreditIds: [], gradYear })!.semesters)
    .flat()
    .map((c) => c.code)

describe('math sequence by class (Arjun, 2026-11-12)', () => {
  it('Class of 2028 and older: MATH 2400 / 2410 on the engineering side', () => {
    expect(majorForClass('CBE', 'CHEM', 2028)!.sharedCore).toEqual(expect.arrayContaining(['MATH 2400', 'MATH 2410']))
    expect(majorForClass('CBE', 'CHEM', 2028)!.sharedCore).not.toContain('ESE 2030')
    expect(majorForClass('MEAM', 'PHYS', 2027)!.sharedCore).toEqual(expect.arrayContaining(['MATH 2400', 'ENM 2510']))
    expect(majorForClass('PHYS', 'CBE', 2028)!.sharedCore).toEqual(expect.arrayContaining(['MATH 2400', 'MATH 2410']))
  })

  it('Class of 2029 and later: a Physics or Math BA takes the paired BSE courses', () => {
    expect(mathSwaps('PHYS', 'CBE', 2029)).toEqual({ 'MATH 2400': 'ESE 2030', 'MATH 2410': 'MATH 2300' })
    expect(mathSwaps('MATH', 'MSE', 2031)).toEqual({ 'MATH 2400': 'ESE 2030', 'MATH 2410': 'ENM 2510' })
    // ESE and CIS have no differential-equations course, so MATH 2410 stays a BA requirement.
    expect(mathSwaps('PHYS', 'ESE', 2031)).toEqual({ 'MATH 2400': 'ESE 2030' })
    expect(mathSwaps('CHEM', 'CBE', 2031)).toEqual({})
    expect(mathSwaps('CBE', 'PHYS', 2031)).toEqual({})
  })

  it('seeds one math sequence for both degrees', () => {
    const old = codesOf('PHYS', null, 'CBE', 2028)
    expect(old).toEqual(expect.arrayContaining(['MATH 2400', 'MATH 2410']))
    expect(old).not.toContain('ESE 2030')
    expect(old).not.toContain('MATH 2300')
    const young = codesOf('PHYS', null, 'CBE', 2031)
    expect(young).toEqual(expect.arrayContaining(['ESE 2030', 'MATH 2300']))
    expect(young).not.toContain('MATH 2400')
    expect(young).not.toContain('MATH 2410')
    const mse = codesOf('PHYS', 'BIZ', 'MSE', 2031) // Michelle's template path
    expect(mse).toEqual(expect.arrayContaining(['ESE 2030', 'ENM 2510']))
    expect(mse).not.toContain('MATH 2400')
  })

  it('a swapped row still accepts the course it replaced', () => {
    expect(classAlternatives('CBE', 'CHEM', 2028, 'MATH 2400')).toEqual(expect.arrayContaining(['ESE 2030', 'ENM 2030']))
    expect(classAlternatives('PHYS', 'CBE', 2031, 'ESE 2030')).toEqual(['MATH 2400'])
    // An old-class student who took ESE 2030 anyway is covered.
    const plan = seedPlan({ sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'CBE', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2028, curriculumMode: 'ncc' })!
    const row = computeMajorAudit(augmentPlan(plan)!, 'CBE', 'ENERGY', 'CHEM')!.core.find((r) => r.id === 'MATH 2400')!
    expect(row.done).toBe(true) // Michelle's template plans ESE 2030 → swapped to MATH 2400 for '28
  })
})
