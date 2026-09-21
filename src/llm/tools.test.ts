// LLM tool-layer tests per CLAUDE.md: every tool — valid input → expected
// mutation, invalid input → schema error message (not silent failure),
// edge cases (empty plan, plan with summer-only courses).
import { describe, expect, it } from 'vitest'
import type { Mutation, Plan } from '../plan/types'
import { applyMutation, applyMutations, createEmptyPlan } from '../plan/mutations'
import { augmentPlan } from '../plan/augment'
import { lookupCourse } from '../data/courses'
import { seedPlan } from '../ui/store/use-plan-store'
import {
  buildToolDefinitions,
  executeTool,
  TOOL_INPUT_SCHEMAS,
  type PlanToolContext,
} from './tools'

/** A context backed by the REAL mutation API — same path the UI uses. */
function makeContext(initial: Plan): PlanToolContext & { plan: () => Plan } {
  let plan = initial
  return {
    plan: () => plan,
    getPlan: () => plan,
    getRequirements: () => augmentPlan(plan)?.summary ?? { error: 'no plan' },
    getCourseInfo: (code: string) => lookupCourse(code.toUpperCase()),
    analyzePlan: () => augmentPlan(plan)?.summary ?? { error: 'no plan' },
    simulateChange: (mutations: Mutation[]) => {
      const result = applyMutations(plan, mutations)
      return { ok: result.ok, message: result.message }
    },
    applyMutation: (mutation: Mutation) => {
      const result = applyMutation(plan, mutation)
      if (result.ok) plan = result.plan
      return result
    },
  }
}

const SEED_CONFIG = {
  sasMajorKey: 'CHEM',
  sasConcKey: 'STANDARD',
  seasMajorKey: 'CBE',
  seasConcKey: 'ENERGY',
  apCreditIds: [],
  gradYear: 2028,
}

describe('tool definitions', () => {
  it('exposes all 11 tools from the spec with object schemas', () => {
    const defs = buildToolDefinitions()
    expect(defs.map((d) => d.name).sort()).toEqual(
      [
        'add_course',
        'analyze_plan',
        'get_course_info',
        'get_plan',
        'get_requirements',
        'move_course',
        'remove_course',
        'rename_course',
        'simulate_change',
        'swap_elective',
        'tag_fulfillment',
      ].sort(),
    )
    for (const def of defs) {
      expect(def.input_schema.type).toBe('object')
      expect(def.description.length).toBeGreaterThan(10)
    }
    expect(Object.keys(TOOL_INPUT_SCHEMAS)).toHaveLength(11)
  })
})

describe('valid input → expected mutation', () => {
  it('add_course places the course', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const out = executeTool(ctx, 'add_course', {
      semester: 'spring-y3',
      course: { code: 'PHYS 2280', title: 'Physical Models', cu: 1 },
    })
    expect(out.ok).toBe(true)
    expect(ctx.plan().semesters['spring-y3']!.some((c) => c.code === 'PHYS 2280')).toBe(true)
  })

  it('move_course relocates and remove_course deletes', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    executeTool(ctx, 'add_course', {
      semester: 'spring-y3',
      course: { code: 'PHYS 2280', cu: 1 },
    })
    const moved = executeTool(ctx, 'move_course', {
      from: 'spring-y3',
      to: 'fall-y4',
      courseId: 'PHYS 2280',
    })
    expect(moved.ok).toBe(true)
    expect(ctx.plan().semesters['fall-y4']!.some((c) => c.code === 'PHYS 2280')).toBe(true)
    const removed = executeTool(ctx, 'remove_course', {
      semester: 'fall-y4',
      courseId: 'PHYS 2280',
    })
    expect(removed.ok).toBe(true)
    expect(ctx.plan().semesters['fall-y4']!.some((c) => c.code === 'PHYS 2280')).toBe(false)
  })

  it('tag_fulfillment writes the mark onto the plan', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const first = ctx.plan().semesters['fall-y1']![0]!
    const id = first.originalCode ?? first.code
    const out = executeTool(ctx, 'tag_fulfillment', {
      courseId: id,
      fulfillmentId: 'seas-ssh',
      on: true,
    })
    expect(out.ok).toBe(true)
    expect(ctx.plan().fulfillments?.[id]).toContain('seas-ssh')
  })

  it('simulate_change does NOT modify state', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const before = ctx.plan()
    const out = executeTool(ctx, 'simulate_change', {
      mutations: [
        {
          kind: 'add_course',
          semester: 'spring-y3',
          course: { code: 'PHYS 2280', cu: 1 },
        },
      ],
    })
    expect(out.ok).toBe(true)
    expect(ctx.plan()).toBe(before)
  })

  it('get_course_info returns catalog data, null for unknown codes', () => {
    const ctx = makeContext(createEmptyPlan())
    const known = executeTool(ctx, 'get_course_info', { code: 'chem 2410' })
    expect(known.ok).toBe(true)
    expect(known.result).not.toBeNull()
    const unknown = executeTool(ctx, 'get_course_info', { code: 'FAKE 9999' })
    expect(unknown.result).toBeNull()
  })
})

describe('invalid input → schema error, not silent failure', () => {
  it('rejects a bad semester key with Zod issues', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const out = executeTool(ctx, 'add_course', {
      semester: 'fall-y9',
      course: { code: 'CHEM 2410' },
    })
    expect(out.ok).toBe(false)
    const result = out.result as { error: string; issues: unknown[] }
    expect(result.error).toBe('Invalid input')
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('rejects a bad fulfillment tag and an unknown tool', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const bad = executeTool(ctx, 'tag_fulfillment', {
      courseId: 'CHEM 1012',
      fulfillmentId: 'not-a-tag',
      on: true,
    })
    expect(bad.ok).toBe(false)
    const unknown = executeTool(ctx, 'definitely_not_a_tool', {})
    expect(unknown.ok).toBe(false)
    expect((unknown.result as { error: string }).error).toMatch(/Unknown tool/)
  })

  it('rejects missing required fields', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const out = executeTool(ctx, 'move_course', { from: 'fall-y1' })
    expect(out.ok).toBe(false)
  })
})

describe('edge cases', () => {
  it('empty plan: remove fails with a message, reads still work', () => {
    const ctx = makeContext(createEmptyPlan())
    const out = executeTool(ctx, 'remove_course', {
      semester: 'fall-y1',
      courseId: 'CHEM 1012',
    })
    expect(out.ok).toBe(false)
    expect((out.result as { message: string }).message).toBeTruthy()
    expect(executeTool(ctx, 'get_plan', {}).ok).toBe(true)
    expect(executeTool(ctx, 'analyze_plan', {}).ok).toBe(true)
  })

  it('fixed summer VIPR 1300 cannot be removed via tools', () => {
    const ctx = makeContext(seedPlan(SEED_CONFIG)!)
    const out = executeTool(ctx, 'remove_course', {
      semester: 'summer-y1',
      courseId: 'VIPR 1300',
    })
    expect(out.ok).toBe(false)
  })

  it('summer-only plan: mutations target summer keys without crashing', () => {
    const plan = createEmptyPlan()
    const ctx = makeContext(plan)
    const add = executeTool(ctx, 'add_course', {
      semester: 'summer-y2',
      course: { code: 'VIPR 1300', title: 'Energy Research', cu: 0.5 },
    })
    expect(add.ok).toBe(true)
    const move = executeTool(ctx, 'move_course', {
      from: 'summer-y2',
      to: 'summer-y3',
      courseId: 'VIPR 1300',
    })
    expect(move.ok).toBe(true)
    expect(ctx.plan().semesters['summer-y3']!).toHaveLength(1)
  })
})
