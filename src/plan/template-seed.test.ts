import { describe, expect, it } from 'vitest'
import { seedPlan, type PlanConfig } from '../ui/store/use-plan-store'
import { augmentPlan } from './augment'
import { computeNccAudit } from './ncc-audit'
import { applyMutation } from './mutations'
import { planFromAppState } from './serialize'
import { findTemplate, PLAN_TEMPLATES } from '../data/templates'
import { lookupCourse } from '../data/courses'
import { MEMO_DISTRIBUTION_TARGETS, MEMO_VIPER_MODS } from '../ncc/mods'
import { SEMESTER_KEYS } from '../data/semesters'
import type { Plan } from './types'

const MEMO = { mods: { ...MEMO_VIPER_MODS }, targets: { ...MEMO_DISTRIBUTION_TARGETS } }

function configFor(t: (typeof PLAN_TEMPLATES)[number], extra: Partial<PlanConfig> = {}): PlanConfig {
  return {
    sasMajorKey: t.sasMajorKey,
    sasConcKey: t.sasConcKey,
    seasMajorKey: t.seasMajorKey,
    seasConcKey: t.seasConcKey,
    apCreditIds: [],
    gradYear: 2031,
    curriculumMode: 'ncc',
    ...extra,
  }
}

const codes = (p: Plan) => Object.values(p.semesters).flat().map((c) => c.code)

describe('program-office templates', () => {
  it('every template course is in the catalog', () => {
    for (const t of PLAN_TEMPLATES)
      for (const entries of Object.values(t.terms))
        for (const e of entries ?? []) if ('code' in e) expect(lookupCourse(e.code), `${t.id}: ${e.code}`).not.toBeNull()
  })

  it('matches only the template concentration', () => {
    expect(findTemplate('CHEM', null, 'CBE', null)?.id).toBe('chem-cbe') // defaults: STANDARD + ENERGY
    expect(findTemplate('CHEM', 'STANDARD', 'CBE', 'PHARMA')).toBeNull()
    expect(findTemplate('PHYS', null, 'MSE', null)).toBeNull() // PHYS default is PTET, not B&T
    expect(findTemplate('PHYS', 'BIZ', 'MSE', 'ENERGY')?.id).toBe('phys-bt-mse')
  })

  it('old core never uses a template', () => {
    const plan = seedPlan(configFor(PLAN_TEMPLATES[0]!, { curriculumMode: 'legacy' }))!
    expect(codes(plan)).not.toContain('ESE 2030')
  })

  for (const t of PLAN_TEMPLATES) {
    describe(t.id, () => {
      it('under the memo, seeds the template as drawn (Key per its own toggle) and passes the proposal audit', () => {
        // The PHYS+MSE document counts VIPR 1200/1210 as Key; the others plan Key in term.
        const policy = t.id === 'phys-bt-mse' ? { ...MEMO, mods: { ...MEMO.mods, keyWaiver: true } } : MEMO
        const plan = seedPlan(configFor(t), policy)!
        const aug = augmentPlan(plan)!
        const audit = computeNccAudit(aug, [], policy.mods, t.seasMajorKey, policy.targets)
        expect(audit.foundations.filter((f) => f.state === 'missing')).toEqual([])
        for (const d of audit.divisions) expect(d.planned, d.id).toBeGreaterThanOrEqual(d.target)
        for (const r of audit.seas) expect(r.planned, r.id).toBeGreaterThanOrEqual(r.target)
        expect(aug.summary.meetsEnergyReq).toBe(true)
        expect(aug.summary.meetsDualMin).toBe(true)
        // Nothing topped up: the template already meets the proposal.
        expect(codes(plan).filter((c) => c.includes('ncc-lang') || /-\d+ #|seas-ssh/.test(c))).toEqual([])
        expect(plan.loads['fall-y1']).toBeLessThanOrEqual(5.5)
        for (const k of SEMESTER_KEYS) expect(plan.loads[k], k).toBeLessThanOrEqual(6.5)
      })

      it('under confirmed policy, tops up what the College still requires and passes the student audit', () => {
        const plan = seedPlan(configFor(t))!
        const aug = augmentPlan(plan)!
        const audit = computeNccAudit(aug, [], undefined, t.seasMajorKey)
        expect(audit.foundations.filter((f) => f.state === 'missing')).toEqual([])
        for (const d of audit.divisions) expect(d.planned, d.id).toBeGreaterThanOrEqual(d.target)
        for (const r of audit.seas) expect(r.planned, r.id).toBeGreaterThanOrEqual(r.target)
        expect(codes(plan)).toContain('— ncc-lang')
        expect(plan.loads['fall-y1']).toBeLessThanOrEqual(5.5)
      })

      it('gives every open slot its own code', () => {
        const open = Object.values(seedPlan(configFor(t))!.semesters)
          .flat()
          .filter((c) => c.isPlaceholder)
          .map((c) => c.code)
        expect(new Set(open).size).toBe(open.length)
      })
    })
  }

  it('incoming credit removes the course from the template and records it', () => {
    const plan = seedPlan(configFor(PLAN_TEMPLATES[0]!, { apCreditIds: ['chem-1012'] }))!
    expect(plan.placement['CHEM 1012']).toBe('credit')
    expect(codes(plan)).not.toContain('CHEM 1012')
  })

  it('confirmed-policy top-ups never land in Fall Y1 above the first-semester cap', () => {
    for (const t of PLAN_TEMPLATES) expect(seedPlan(configFor(t))!.loads['fall-y1']).toBeLessThanOrEqual(5.5)
  })
})

describe('open-slot identity', () => {
  it('removing one seeded open slot removes only that one', () => {
    const plan = seedPlan(configFor(PLAN_TEMPLATES[0]!))!
    const spring = plan.semesters['spring-y3'].filter((c) => c.isPlaceholder)
    expect(spring.length).toBeGreaterThanOrEqual(2)
    const target = spring[1]!
    const result = applyMutation(plan, { kind: 'remove_course', semester: 'spring-y3', courseId: target.code })
    expect(result.ok).toBe(true)
    const left = result.plan.semesters['spring-y3'].map((c) => c.code)
    expect(left).not.toContain(target.code)
    expect(left).toContain(spring[0]!.code)
  })

  it('repairs plans saved with several "—" rows, keeping their marks', () => {
    const plan = planFromAppState({
      userPlan: {
        semesters: {
          'spring-y3': [
            { code: '—', title: 'Social Sciences Distribution', cu: 1, isPlaceholder: true, slotId: 'ncc-dist-ss-1' },
            { code: '—', title: 'Humanities Distribution', cu: 1, isPlaceholder: true, slotId: 'ncc-dist-h-1' },
          ],
        },
      },
      userPlanFulfillments: { '—': ['seas-ssh'] },
    })!
    const rows = plan.semesters['spring-y3'].map((c) => c.code)
    expect(rows).toEqual(['— ncc-dist-ss-1', '— ncc-dist-h-1'])
    expect(plan.fulfillments?.['— ncc-dist-h-1']).toEqual(['seas-ssh'])
    expect(plan.fulfillments?.['—']).toBeUndefined()
  })
})

describe('open-slot repair scope', () => {
  it('shared "—" marks go only to rows that were "—"', () => {
    const plan = planFromAppState({
      userPlan: {
        semesters: {
          'fall-y3': [
            { code: '— ncc-pad', title: 'P&D', cu: 1, isPlaceholder: true, slotId: 'ncc-pad' },
            { code: '— ncc-pad', title: 'P&D copy', cu: 1, isPlaceholder: true, slotId: 'ncc-pad' },
            { code: '—', title: 'Open', cu: 1, isPlaceholder: true, slotId: 'ncc-dist-h-1' },
          ],
        },
      },
      userPlanFulfillments: { '—': ['seas-tbs'] },
    })!
    expect(plan.semesters['fall-y3'].map((c) => c.code)).toEqual(['— ncc-pad', '— ncc-pad #2', '— ncc-dist-h-1'])
    expect(plan.fulfillments?.['— ncc-dist-h-1']).toEqual(['seas-tbs'])
    expect(plan.fulfillments?.['— ncc-pad #2']).toBeUndefined()
  })
})
