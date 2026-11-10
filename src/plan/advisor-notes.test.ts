import { describe, expect, it } from 'vitest'
import type { AugmentedCourse, AugmentedPlan } from './types'
import { computeAdvisorNotes, prereqOrderNotes } from './advisor-notes'
import { computeNccAudit } from './ncc-audit'
import { effectiveFulfillments } from './fulfillments'

function course(code: string, cu = 1, extra: Partial<AugmentedCourse> = {}): AugmentedCourse {
  const base = { code, title: code, cu, ...extra }
  return {
    userFulfills: [],
    requirementCount: 0,
    overlapKind: null,
    ...base,
    effectiveFulfills: extra.effectiveFulfills ?? effectiveFulfillments(base, extra.userFulfills),
    removedFulfills: extra.removedFulfills ?? [],
  }
}

function plan(semesters: Record<string, AugmentedCourse[]>, summary: Partial<AugmentedPlan['summary']> = {}): AugmentedPlan {
  const loads: Record<string, number> = {}
  for (const [k, cs] of Object.entries(semesters)) loads[k] = cs.reduce((s, c) => s + c.cu, 0)
  return {
    semesters,
    loads,
    placement: {},
    summary: {
      totalCU: 40, sasCU: 36, seasCU: 40, energyCoursesCount: 3, doubleCountedCodes: [],
      meetsDualMin: true, meetsEnergyReq: true, fulfilledFA: [], unfulfilledFA: [], fulfilledSec: [], unfulfilledSec: [],
      overloadSemesters: [], approvalSemesters: [], exceedsMaxSemesters: [], exceedsMaxCourses: [],
      ...summary,
    },
    meta: {},
    notes: [],
  }
}

describe('computeAdvisorNotes', () => {
  it('flags the first-semester cap before the general overload ladder', () => {
    const p = plan({ 'fall-y1': [course('A'), course('B'), course('C'), course('D'), course('E'), course('F')] })
    const notes = computeAdvisorNotes(p, undefined, 'legacy', 2028)
    expect(notes[0]).toMatchObject({ severity: 'error', source: 'First semester' })
    expect(notes[0]?.text).toContain('Fall 2024 is 6 CU')
  })

  it('grades other semesters against the 6.5 cap and the 7 CU form threshold', () => {
    const six = Array.from({ length: 6 }, (_, i) => course(`X${i}`))
    const p = plan({
      'fall-y2': six, // 6 CU: normal dual-degree overload, no note
      'spring-y2': [...six, course('H', 0.5), course('Q', 0.25)], // 6.75: over cap
      'fall-y3': [...six, course('Y')], // 7: form
    })
    const sources = computeAdvisorNotes(p, undefined, 'legacy', 2028).map((n) => n.source)
    expect(sources).toEqual(['Max CU Increase', 'Over cap'])
  })

  it('lists missing NCC foundations and shortfalls under the NCC', () => {
    const p = plan({ 'spring-y1': [course('VIPR 1200', 0.5)] })
    const audit = computeNccAudit(p, [], undefined, 'CBE')
    const notes = computeAdvisorNotes(p, audit, 'ncc', 2028)
    const foundationErrors = notes.filter((n) => n.source === 'Foundation')
    expect(foundationErrors).toHaveLength(5) // FYS covered by VIPR 1200
    expect(notes.some((n) => n.source === 'Distribution')).toBe(true)
  })

  it('says all clear when nothing is wrong', () => {
    const p = plan({ 'fall-y1': [course('A')] }, { unfulfilledFA: [], unfulfilledSec: [] })
    const notes = computeAdvisorNotes(p, undefined, 'legacy', 2028)
    expect(notes).toEqual([expect.objectContaining({ severity: 'info', source: 'All clear' })])
  })

  it('does not flag the 5.5–6.5 dual-degree overload', () => {
    const six = Array.from({ length: 6 }, (_, i) => course(`X${i}`))
    const p = plan({ 'fall-y2': six, 'spring-y2': [...six, course('H', 0.5)], 'fall-y3': six })
    const notes = computeAdvisorNotes(p, undefined, 'legacy', 2028)
    expect(notes).toEqual([expect.objectContaining({ severity: 'info', source: 'All clear' })])
  })

  it('states the 46 CU dual minimum', () => {
    const p = plan({ 'fall-y1': [course('A')] }, { totalCU: 44, meetsDualMin: false })
    const note = computeAdvisorNotes(p, undefined, 'legacy', 2028).find((n) => n.source === 'Dual minimum')
    expect(note?.text).toContain('46+ CU')
  })

  it('counts gen-ed toward the BSE minimum', () => {
    const p = plan(
      { 'fall-y2': [course('SOCI 0001', 1, { category: 'gened' })] },
      { seasCU: 39.5, sasCU: 36 },
    )
    const notes = computeAdvisorNotes(p, undefined, 'legacy', 2028)
    expect(notes.some((n) => n.source === 'BSE minimum')).toBe(false)
  })
})

describe('prerequisite order (warning, never a block)', () => {
  const at = (code: string, sem: string, extra: Partial<AugmentedCourse> = {}) => ({ [sem]: [course(code, 1, extra)] })
  const notesFor = (semesters: Record<string, AugmentedCourse[]>, placement: Record<string, string> = {}) =>
    prereqOrderNotes({ ...plan(semesters), placement }, null)

  it('warns when a course precedes a catalogued prerequisite (Adi moved CHEM 2610 ahead of CHEM 2210)', () => {
    const notes = notesFor({ ...at('CHEM 2610', 'fall-y2'), ...at('CHEM 2210', 'fall-y3') })
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ severity: 'warning', source: 'Prerequisite' })
    expect(notes[0]!.text).toContain('CHEM 2610 (Sophomore Fall) is planned before its prerequisite CHEM 2210 (Junior Fall)')
  })
  it('is silent for same-term pairs, credit, missing prerequisites and courses without catalog data', () => {
    expect(notesFor({ 'fall-y3': [course('CHEM 2210'), course('CHEM 2610')] })).toEqual([])
    expect(notesFor({ ...at('PHYS 0151', 'spring-y1'), ...at('PHYS 0150', 'fall-y2') }, { 'PHYS 0150': 'credit' })).toEqual([])
    expect(notesFor(at('CHEM 2610', 'fall-y2'))).toEqual([])
    expect(notesFor({ ...at('XYZ 1234', 'fall-y1'), ...at('CHEM 2210', 'fall-y3') })).toEqual([])
  })
  it('is silent where a major sample schedule orders the pair the same way (MSE 2210 before MATH 2410)', () => {
    expect(notesFor({ ...at('MSE 2210', 'fall-y2'), ...at('MATH 2410', 'spring-y2') })).toEqual([])
  })
  it('appears in computeAdvisorNotes', () => {
    const p = plan({ ...at('CHEM 2610', 'fall-y2'), ...at('CHEM 2210', 'fall-y3') })
    expect(computeAdvisorNotes(p, undefined, 'legacy', null).some((n) => n.source === 'Prerequisite')).toBe(true)
  })
})
