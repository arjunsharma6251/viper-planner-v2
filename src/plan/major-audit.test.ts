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
    // Known, waiting on Michelle (2026-11-12): her PHYS (B&T) + MSE template
    // plans MATH 2400/2410 for both degrees, but the catalog's MSE core now
    // asks for ESE 2030 + ENM 2510 and does not list MATH 2400/2410 in their
    // place. The audit shows the gap rather than guessing.
    expect(gaps).toEqual(['ncc PHYS/BIZ+MSE/ENERGY: ESE 2030', 'ncc PHYS/BIZ+MSE/ENERGY: ENM 2510'])
  })

  it('counts an accepted alternative and lists the options', () => {
    // The CHEM BA's PHYS 0150 / CHEM 2411 stand in for CBE's PHYS 0140 / CHEM 2410.
    for (const mode of ['legacy', 'ncc'] as const) {
      const aug = augmentPlan(seedPlan(cfg('CHEM', 'STANDARD', 'CBE', 'ENERGY', mode)))!
      const core = computeMajorAudit(aug, 'CBE', 'ENERGY', 'CHEM')!.core
      expect(core.find((r) => r.id === 'PHYS 0140')).toMatchObject({ done: true, by: 'PHYS 0150' })
      expect(core.find((r) => r.id === 'CHEM 2410')).toMatchObject({ done: true, by: 'CHEM 2411' })
      expect(core.find((r) => r.id === 'PHYS 0140')!.options).toContain('PHYS 0150')
    }
  })

  it('does not seed a BSE course the BA core already covers', () => {
    const plan = seedPlan(cfg('CHEM', 'STANDARD', 'CBE', 'PHARMA'))!
    const codes = Object.values(plan.semesters).flat().map((c) => c.code)
    expect(codes).toContain('PHYS 0150')
    expect(codes).toContain('CHEM 2411')
    expect(codes).not.toContain('PHYS 0140')
    expect(codes).not.toContain('CHEM 2410')
  })

  it('marks an open elective slot as to fill, with where it is', () => {
    const aug = augmentPlan(seedPlan(cfg('CHEM', 'STANDARD', 'CBE', 'ENERGY')))!
    const open = computeMajorAudit(aug, 'CBE', 'ENERGY', 'CHEM')!.electives.filter((r) => !r.done && r.openIn)
    expect(open.length).toBeGreaterThan(0)
    for (const r of open) expect(r.openCode).toMatch(/^—/)
  })
})

describe('CBE Lab Elective: CHEM 2411 + 2421 complete it (Ananya, 2026-11; catalog, every concentration, 2026-11-12)', () => {
  // PHYS + CBE does not plan CHEM 2421 (the seed trims the Advanced Chem slot),
  // so its Lab Elective is honestly open; CHEM + CBE plans both courses.
  for (const sas of ['CHEM'] as const) {
    it(`${sas} + CBE/ENERGY seeds no open Lab Elective and the audit shows it satisfied`, () => {
      const plan = seedPlan(cfg(sas, sas === 'CHEM' ? 'STANDARD' : 'NONE', 'CBE', 'ENERGY'))!
      const courses = Object.values(plan.semesters).flat()
      expect(courses.filter((c) => c.slotId === 'cbe-lab')).toEqual([])
      const row = computeMajorAudit(augmentPlan(plan)!, 'CBE', 'ENERGY', sas)!.electives.find((r) => r.id === 'cbe-lab')!
      expect(row).toMatchObject({ done: true, by: 'CHEM 2411 + CHEM 2421' })
    })
  }
  it('removing CHEM 2421 no longer counts the sequence', () => {
    const plan = seedPlan(cfg('CHEM', 'STANDARD', 'CBE', 'ENERGY'))!
    const next = removeCourse(plan, termOf(plan, 'CHEM 2421'), 'CHEM 2421').plan
    const row = computeMajorAudit(augmentPlan(next)!, 'CBE', 'ENERGY', 'CHEM')!.electives.find((r) => r.id === 'cbe-lab')!
    expect(row.by).not.toBe('CHEM 2411 + CHEM 2421')
  })
  for (const conc of ['PHARMA', 'POLYMER'] as const) {
    it(`${conc} counts it too (the catalog's list is program-wide)`, () => {
      const plan = seedPlan(cfg('CHEM', 'STANDARD', 'CBE', conc))!
      const row = computeMajorAudit(augmentPlan(plan)!, 'CBE', conc, 'CHEM')!.electives.find((r) => r.id === 'cbe-lab')!
      expect(row).toMatchObject({ done: true, by: 'CHEM 2411 + CHEM 2421' })
    })
  }
})
