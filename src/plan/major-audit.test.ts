import { beforeAll, describe, expect, it } from 'vitest'
import { installNccModule } from '../ncc/scheduler-module'
import { seedPlan, type PlanConfig } from '../ui/store/use-plan-store'
import { augmentPlan } from './augment'
import { computeMajorAudit } from './major-audit'
import { removeCourse } from './mutations'
import type { Plan } from './types'
import type { SemesterKey } from '../data/semesters'

beforeAll(() => installNccModule())

const cfg = (sas: string, sasConc: string, seas: string, seasConc: string, mode: 'legacy' | 'ncc' = 'legacy'): PlanConfig => ({
  sasMajorKey: sas, sasConcKey: sasConc, seasMajorKey: seas, seasConcKey: seasConc, apCreditIds: [], gradYear: 2028, curriculumMode: mode,
})

const termOf = (plan: Plan, code: string) =>
  (Object.keys(plan.semesters) as SemesterKey[]).find((k) => plan.semesters[k].some((c) => c.code === code))!

describe('major audit', () => {
  it('flags a removed required CIS course (Austin, PHYS + ESE)', () => {
    const plan = seedPlan(cfg('PHYS', 'NONE', 'ESE', 'DATA'))!
    const before = computeMajorAudit(augmentPlan(plan)!, 'ESE', 'DATA', 'PHYS')!
    expect(before.core.find((r) => r.id === 'CIS 1200')?.done).toBe(true)
    const removed = removeCourse(plan, termOf(plan, 'CIS 1200'), 'CIS 1200')
    expect(removed.ok).toBe(true)
    const after = computeMajorAudit(augmentPlan(removed.plan)!, 'ESE', 'DATA', 'PHYS')!
    expect(after.core.find((r) => r.id === 'CIS 1200')).toMatchObject({ done: false, by: null })
    expect(after.left).toBe(before.left + 1)
  })

  it('every core course is planned in every fresh seed, both curricula', async () => {
    const { MAJORS } = await import('../data/majors')
    const gaps: string[] = []
    for (const mode of ['legacy', 'ncc'] as const)
      for (const [s, sm] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SAS'))
        for (const sc of Object.keys(sm.concentrations))
          for (const [e, em] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SEAS'))
            for (const ec of Object.keys(em.concentrations)) {
              const aug = augmentPlan(seedPlan(cfg(s, sc, e, ec, mode)))!
              for (const a of [computeMajorAudit(aug, s, sc, e)!, computeMajorAudit(aug, e, ec, s)!])
                for (const r of a.core) if (!r.done) gaps.push(`${mode} ${s}/${sc}+${e}/${ec}: ${r.id}`)
            }
    expect(gaps).toEqual([])
  })

  it('counts an accepted alternative and lists the options', () => {
    // Michelle's CHEM+CBE template plans ESE 2030 in place of MATH 2400.
    const aug = augmentPlan(seedPlan(cfg('CHEM', 'STANDARD', 'CBE', 'ENERGY', 'ncc')))!
    const row = computeMajorAudit(aug, 'CBE', 'ENERGY', 'CHEM')!.core.find((r) => r.id === 'MATH 2400')!
    expect(row).toMatchObject({ done: true, by: 'ESE 2030' })
    expect(row.options).toContain('ESE 2030')
  })

  it('marks an open elective slot as to fill, with where it is', () => {
    const aug = augmentPlan(seedPlan(cfg('CHEM', 'STANDARD', 'CBE', 'ENERGY')))!
    const open = computeMajorAudit(aug, 'CBE', 'ENERGY', 'CHEM')!.electives.filter((r) => !r.done && r.openIn)
    expect(open.length).toBeGreaterThan(0)
    for (const r of open) expect(r.openCode).toMatch(/^—/)
  })
})
