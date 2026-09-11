import { describe, expect, it } from 'vitest'
import type { AugmentedCourse, AugmentedPlan } from './types'
import { computeAdvisorNotes } from './advisor-notes'
import { computeNccAudit } from './ncc-audit'

function course(code: string, cu = 1, extra: Partial<AugmentedCourse> = {}): AugmentedCourse {
  return { code, title: code, cu, userFulfills: [], requirementCount: 0, overlapKind: null, ...extra }
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

  it('grades other semesters as overload, approval, or hard cap', () => {
    const six = Array.from({ length: 6 }, (_, i) => course(`X${i}`))
    const p = plan({
      'fall-y2': six,
      'spring-y2': [...six, course('Y')],
      'fall-y3': [...six, course('Y'), course('Z')],
    })
    const sources = computeAdvisorNotes(p, undefined, 'legacy', 2028).map((n) => n.source)
    // errors first; overloads fold into one line after the per-term warnings
    expect(sources).toEqual(['Hard cap', 'Approval needed', 'Dual overload'])
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

  it('folds every dual-overload term into one note', () => {
    const six = Array.from({ length: 6 }, (_, i) => course(`X${i}`))
    const p = plan({ 'fall-y2': six, 'spring-y2': six, 'fall-y3': six })
    const notes = computeAdvisorNotes(p, undefined, 'legacy', 2028).filter((n) => n.source === 'Dual overload')
    expect(notes).toHaveLength(1)
    expect(notes[0]?.text).toContain('3 terms are')
    expect(notes[0]?.text).toContain('Fall 2025 (6)')
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
