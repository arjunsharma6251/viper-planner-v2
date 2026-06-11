import { z } from 'zod'
import type { Mutation, MutationResult, Plan } from '../plan/types'

/**
 * LLM tool definitions. These mirror the user-action surface exactly —
 * if a student can do it manually, the LLM can do it via tool call, and
 * both paths run through the same mutation API (src/plan/mutations.ts).
 *
 * Every input is validated with Zod so the model gets a structured
 * validation error back instead of a silent failure.
 */

const semesterKeySchema = z.enum([
  'fall-y1',
  'spring-y1',
  'summer-y1',
  'fall-y2',
  'spring-y2',
  'summer-y2',
  'fall-y3',
  'spring-y3',
  'summer-y3',
  'fall-y4',
  'spring-y4',
])

const fulfillmentTagSchema = z.enum([
  'ncc-kite',
  'ncc-key',
  'ncc-fys',
  'ncc-writ',
  'ncc-pad',
  'ncc-lang',
  'ncc-distrib-ss',
  'ncc-distrib-h',
  'ncc-distrib-n',
  'seas-ssh',
  'seas-writ',
  'seas-ethics',
])

const courseDraftSchema = z.object({
  code: z.string().describe('Penn course code, e.g. "CHEM 2410"'),
  title: z.string().optional(),
  cu: z.number().min(0).max(2).optional(),
  category: z.enum(['sas', 'seas', 'both', 'viper', 'gened']).optional(),
})

const mutationSchema: z.ZodType<Mutation> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('add_course'),
    semester: semesterKeySchema,
    course: courseDraftSchema,
  }),
  z.object({
    kind: z.literal('remove_course'),
    semester: semesterKeySchema,
    courseId: z.string(),
  }),
  z.object({
    kind: z.literal('move_course'),
    from: semesterKeySchema,
    to: semesterKeySchema,
    courseId: z.string(),
    targetIndex: z.number().int().min(0).optional(),
  }),
  z.object({
    kind: z.literal('tag_fulfillment'),
    courseId: z.string(),
    fulfillmentId: fulfillmentTagSchema,
    on: z.boolean(),
  }),
  z.object({
    kind: z.literal('swap_elective'),
    slotId: z.string(),
    newCode: z.string(),
  }),
  z.object({
    kind: z.literal('rename_course'),
    courseId: z.string(),
    newCode: z.string(),
  }),
])

// ---- Tool input schemas, keyed by tool name ----

export const TOOL_INPUT_SCHEMAS = {
  get_plan: z.object({}),
  get_requirements: z.object({}),
  get_course_info: z.object({
    code: z.string().describe('Penn course code, e.g. "CHEM 2410"'),
  }),
  analyze_plan: z.object({}),
  simulate_change: z.object({
    mutations: z
      .array(mutationSchema)
      .min(1)
      .describe('Mutations to simulate. State is NOT modified.'),
  }),
  add_course: z.object({
    semester: semesterKeySchema,
    course: courseDraftSchema,
  }),
  remove_course: z.object({
    semester: semesterKeySchema,
    courseId: z.string(),
  }),
  move_course: z.object({
    from: semesterKeySchema,
    to: semesterKeySchema,
    courseId: z.string(),
    targetIndex: z.number().int().min(0).optional(),
  }),
  tag_fulfillment: z.object({
    courseId: z.string(),
    fulfillmentId: fulfillmentTagSchema,
    on: z.boolean(),
  }),
  swap_elective: z.object({
    slotId: z.string(),
    newCode: z.string(),
  }),
  rename_course: z.object({
    courseId: z.string(),
    newCode: z.string(),
  }),
} as const

export type ToolName = keyof typeof TOOL_INPUT_SCHEMAS

const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  get_plan: 'Read the full current plan: courses per semester, CU loads, placement map.',
  get_requirements:
    'Read requirement status: FA / Sector / energy fulfillment, double-count info.',
  get_course_info:
    'Look up a course in the catalog: title, CU, offering, prereqs, attributes, PCR link. Returns null if unknown.',
  analyze_plan:
    'Analyze the current plan: requirement gaps, load warnings, graduation readiness.',
  simulate_change:
    'Dry-run a list of mutations and return the resulting analysis WITHOUT modifying the plan. ALWAYS use this before any mutation tool, and present the consequences to the student before applying.',
  add_course: 'Add a course to a semester. Snapshot is taken automatically for undo.',
  remove_course: 'Remove a course from a semester. Fixed courses (summer-y1 VIPR 1300) cannot be removed.',
  move_course:
    'Move a course between semesters (or reorder within one — same from/to is a reorder).',
  tag_fulfillment: 'Mark or unmark what requirement a course fulfills.',
  swap_elective: 'Swap which course fills an elective/gen-ed slot.',
  rename_course: 'Rename a course (e.g. correct a code).',
}

export interface ToolDefinition {
  name: string
  description: string
  input_schema: { type: 'object' } & Record<string, unknown>
}

/** Anthropic-API tool definitions (JSON Schema generated from the Zod schemas). */
export function buildToolDefinitions(): ToolDefinition[] {
  return (Object.keys(TOOL_INPUT_SCHEMAS) as ToolName[]).map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    // All tool inputs are z.object(...) — the generated schema root is always type:'object'.
    input_schema: z.toJSONSchema(TOOL_INPUT_SCHEMAS[name]) as ToolDefinition['input_schema'],
  }))
}

/** Human-readable one-liner for a tool call, shown in the chat transcript. */
export function describeToolCall(name: string, input: unknown): string {
  const arg = (key: string): string => {
    if (input && typeof input === 'object' && key in input) {
      const v = (input as Record<string, unknown>)[key]
      if (typeof v === 'string' || typeof v === 'number') return String(v)
    }
    return ''
  }
  switch (name) {
    case 'get_plan':
      return 'Reading your plan'
    case 'get_requirements':
      return 'Checking requirement status'
    case 'get_course_info':
      return `Looking up ${arg('code') || 'a course'}`
    case 'analyze_plan':
      return 'Analyzing your plan'
    case 'simulate_change': {
      const n =
        input && typeof input === 'object' && Array.isArray((input as { mutations?: unknown[] }).mutations)
          ? (input as { mutations: unknown[] }).mutations.length
          : 0
      return `Simulating ${n} change${n === 1 ? '' : 's'} (dry run)`
    }
    case 'add_course': {
      const course = (input as { course?: { code?: string } } | null)?.course
      return `Adding ${course?.code ?? 'a course'} to ${arg('semester')}`
    }
    case 'remove_course':
      return `Removing ${arg('courseId')} from ${arg('semester')}`
    case 'move_course':
      return `Moving ${arg('courseId')}: ${arg('from')} → ${arg('to')}`
    case 'tag_fulfillment':
      return `Tagging ${arg('courseId')} (${arg('fulfillmentId')})`
    case 'swap_elective':
      return `Swapping slot ${arg('slotId')} to ${arg('newCode')}`
    case 'rename_course':
      return `Renaming ${arg('courseId')} to ${arg('newCode')}`
    default:
      return name
  }
}

/**
 * The surface the chat loop executes tools against. Implemented by the
 * plan store — the same functions the UI calls, so LLM and direct user
 * edits cannot drift (CLAUDE.md "seamless" requirement).
 */
export interface PlanToolContext {
  getPlan(): Plan
  getRequirements(): unknown
  getCourseInfo(code: string): unknown
  analyzePlan(): unknown
  simulateChange(mutations: Mutation[]): unknown
  applyMutation(mutation: Mutation): MutationResult
}

export interface ToolExecutionResult {
  ok: boolean
  /** JSON-serializable payload returned to the model as the tool result. */
  result: unknown
}

/** Validate and execute one tool call. Invalid input returns the Zod error, not a throw. */
export function executeTool(
  ctx: PlanToolContext,
  name: string,
  rawInput: unknown,
): ToolExecutionResult {
  if (!(name in TOOL_INPUT_SCHEMAS)) {
    return { ok: false, result: { error: `Unknown tool: ${name}` } }
  }
  const toolName = name as ToolName
  const parsed = TOOL_INPUT_SCHEMAS[toolName].safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      result: { error: 'Invalid input', issues: parsed.error.issues },
    }
  }

  switch (toolName) {
    case 'get_plan':
      return { ok: true, result: ctx.getPlan() }
    case 'get_requirements':
      return { ok: true, result: ctx.getRequirements() }
    case 'get_course_info': {
      const { code } = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.get_course_info>
      return { ok: true, result: ctx.getCourseInfo(code) }
    }
    case 'analyze_plan':
      return { ok: true, result: ctx.analyzePlan() }
    case 'simulate_change': {
      const { mutations } = parsed.data as z.infer<
        typeof TOOL_INPUT_SCHEMAS.simulate_change
      >
      return { ok: true, result: ctx.simulateChange(mutations) }
    }
    case 'add_course': {
      const input = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.add_course>
      return runMutation(ctx, { kind: 'add_course', ...input })
    }
    case 'remove_course': {
      const input = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.remove_course>
      return runMutation(ctx, { kind: 'remove_course', ...input })
    }
    case 'move_course': {
      const input = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.move_course>
      return runMutation(ctx, { kind: 'move_course', ...input })
    }
    case 'tag_fulfillment': {
      const input = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.tag_fulfillment>
      return runMutation(ctx, { kind: 'tag_fulfillment', ...input })
    }
    case 'swap_elective': {
      const input = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.swap_elective>
      return runMutation(ctx, { kind: 'swap_elective', ...input })
    }
    case 'rename_course': {
      const input = parsed.data as z.infer<typeof TOOL_INPUT_SCHEMAS.rename_course>
      return runMutation(ctx, { kind: 'rename_course', ...input })
    }
  }
}

function runMutation(ctx: PlanToolContext, mutation: Mutation): ToolExecutionResult {
  const result = ctx.applyMutation(mutation)
  return { ok: result.ok, result: { ok: result.ok, message: result.message } }
}
