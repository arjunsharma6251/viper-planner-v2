// "Making sure everything saves" (Michelle, 2026-11-12): a plan written to
// the library, a share link or a JSON export must come back exactly as the
// student left it — setup, courses, open slots, marks, colors, incoming
// credit and finished terms.

import { describe, expect, it } from 'vitest'
import { installNccModule } from '../ncc/scheduler-module'
import { applyMutation } from '../plan/mutations'
import { parseAppState, planFromAppState, serializeAppState } from '../plan/serialize'
import { appStateOf, configFromState, seedPlan, type PlanConfig } from '../ui/store/use-plan-store'
import { addPlan, emptyLibrary } from '../utils/plan-library'
import { decodeShareState, encodeShareState } from '../utils/share-link'
import { computeMajorAudit } from '../plan/major-audit'
import { augmentPlan } from '../plan/augment'
import type { Plan } from '../plan/types'

installNccModule()

const extras = {
  viperMods: { fysWaiver: true, keyWaiver: true },
  distributionTargets: { N: 12, SS: 3, H: 2 },
  colorOverrides: { 'CHEM 1012': '#3d6ec9' },
}

const CONFIGS: PlanConfig[] = [
  { sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'CBE', seasConcKey: 'PHARMA', apCreditIds: ['ap-phys-c-mech', 'ap-phys-c-em'], gradYear: 2031, studentName: 'Test Student' },
  { sasMajorKey: 'PHYS', sasConcKey: null, seasMajorKey: 'MSE', seasConcKey: null, apCreditIds: ['lang-fluency'], gradYear: 2029, curriculumMode: 'ncc' },
  { sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'CBE', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2030, completedTerms: { 'fall-y1': ['CHEM 1012', 'MATH 1400', 'WRIT 0130'] } },
]

/** What a reload restores: the config and the plan the store would hydrate. */
function reload(stateJson: string) {
  const state = parseAppState(stateJson)!
  return { config: configFromState(state), plan: planFromAppState(state), state }
}

function comparable(p: Plan) {
  return { semesters: p.semesters, placement: p.placement, fulfillments: p.fulfillments ?? {}, mode: p.meta.curriculumMode }
}

describe('everything saves', () => {
  for (const config of CONFIGS) {
    const label = `${config.sasMajorKey}+${config.seasMajorKey} '${config.gradYear}`
    // An edited plan: a mark, a move and an added course on top of the seed.
    let plan = seedPlan(config)!
    const first = plan.semesters['fall-y2'][0]!
    plan = applyMutation(plan, { kind: 'tag_fulfillment', courseId: first.code, fulfillmentId: 'viper-energy', on: true }).plan
    plan = applyMutation(plan, { kind: 'add_course', semester: 'spring-y3', course: { code: 'ECON 0100', title: 'Intro Micro', cu: 1 } }).plan
    const state = appStateOf(config, plan, extras)

    it(`${label}: library entry restores config and plan`, () => {
      const lib = addPlan(emptyLibrary(), state).lib
      const back = reload(JSON.stringify(JSON.parse(JSON.stringify(lib)).plans[0].state))
      expect(back.config).toEqual(config)
      expect(comparable(back.plan!)).toEqual(comparable(plan))
      expect(back.state.userColorOverrides).toEqual(extras.colorOverrides)
      expect(back.state.viperMods).toEqual(extras.viperMods)
    })

    it(`${label}: share link restores config and plan`, () => {
      const back = decodeShareState(encodeShareState(state))!
      expect(configFromState(back)).toEqual(config)
      expect(comparable(planFromAppState(back)!)).toEqual(comparable(plan))
    })

    it(`${label}: JSON export restores config and plan`, () => {
      const back = reload(serializeAppState(state))
      expect(back.config).toEqual(config)
      expect(comparable(back.plan!)).toEqual(comparable(plan))
    })
  }

  it('incoming credit still covers its core courses after a reload', () => {
    const config = CONFIGS[0]!
    const plan = seedPlan(config)!
    expect(plan.placement['PHYS 0150']).toBe('credit')
    const back = reload(JSON.stringify(appStateOf(config, plan, extras)))
    expect(back.plan!.placement['PHYS 0150']).toBe('credit')
    const aug = augmentPlan(back.plan!, { sasMajorKey: config.sasMajorKey, seasMajorKey: config.seasMajorKey, gradYear: config.gradYear })!
    const audit = computeMajorAudit(aug, config.seasMajorKey, config.seasConcKey, config.sasMajorKey)!
    expect(audit.core.find((r) => r.id === 'PHYS 0150')?.by).toBe('credit')
  })
})
