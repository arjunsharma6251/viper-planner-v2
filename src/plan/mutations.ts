// The internal plan-mutation API. BOTH the UI (drag/drop, modals) and the
// LLM tools (src/llm/tools.ts) call these — same path through the code, so
// the two surfaces cannot drift (CLAUDE.md "seamless" requirement).
//
// Semantics are ported from the old app's App-section handlers
// (references/old-app/index.html ~4915-5105): handleAddCourse,
// handleDeleteCourse, onDrop, handleToggleFulfillment, onSelectElective,
// handleEditCode. All edits flow through these. The scheduler is NOT
// consulted; the user is the source of truth after the seed.
//
// Every function is pure: it returns a MutationResult holding a NEW plan
// object and never mutates the input. On failure the result carries the
// original plan unchanged.

import { ALL_SEMESTER_KEYS, semesterLabel, type SemesterKey } from '../data/semesters'
import { lookupCourse } from '../data/courses'
import type {
  CourseDraft,
  FulfillmentTag,
  Mutation,
  MutationResult,
  Plan,
  PlanMeta,
  PlannedCourse,
} from './types'

// ---- Plan construction / bookkeeping helpers ----

function roundCU(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Create an empty plan structure. Initializes ALL 11 semester slots
 * (8 in-term + 3 summer) — CLAUDE.md common trap #2: forgetting the summer
 * keys crashes addCourse on summer-y1/y2/y3.
 */
export function createEmptyPlan(meta: PlanMeta = {}): Plan {
  const semesters = {} as Record<SemesterKey, PlannedCourse[]>
  const loads = {} as Record<SemesterKey, number>
  for (const k of ALL_SEMESTER_KEYS) {
    semesters[k] = []
    loads[k] = 0
  }
  return { semesters, loads, placement: {}, meta, notes: [] }
}

/**
 * Recompute the derived fields (loads + placement) from `semesters`.
 * AP/placement-credit entries ('credit') live only in the placement map,
 * not in any semester — they are preserved. Mirrors how augmentPlan
 * rebuilds placement: key is originalCode || code.
 * Mutates and returns the given plan (callers pass a fresh clone).
 */
export function recomputeDerived(plan: Plan): Plan {
  const loads: Record<string, number> = {}
  const placement: Record<string, SemesterKey | 'credit'> = {}
  for (const [code, where] of Object.entries(plan.placement)) {
    if (where === 'credit') placement[code] = 'credit'
  }
  for (const [k, courses] of Object.entries(
    plan.semesters as Record<string, PlannedCourse[]>,
  )) {
    let sum = 0
    for (const c of courses) {
      sum += c.cu || 0
      const code = c.originalCode || c.code
      if (code) placement[code] = k as SemesterKey
    }
    loads[k] = roundCU(sum)
  }
  plan.loads = loads as Plan['loads']
  plan.placement = placement
  return plan
}

/**
 * Deep-enough copy for safe mutation: semester arrays and course objects are
 * copied (courses shallow-copied, same as the old `mutate` helper); all 11
 * semester keys are guaranteed to exist afterward (trap #2). The stale
 * `summary` is deliberately dropped — augmentPlan recomputes it on render.
 */
function clonePlan(plan: Plan): Plan {
  const source = plan.semesters as Record<string, PlannedCourse[] | undefined>
  const keys = [...new Set<string>([...ALL_SEMESTER_KEYS, ...Object.keys(source)])]
  const semesters: Record<string, PlannedCourse[]> = {}
  for (const k of keys) {
    semesters[k] = (source[k] ?? []).map((c) => ({ ...c })) // shallow-copy each course
  }
  const next: Plan = {
    semesters: semesters as Plan['semesters'],
    loads: { ...plan.loads },
    placement: { ...plan.placement },
    meta: { ...plan.meta },
    notes: [...plan.notes],
  }
  if (plan.fulfillments) {
    next.fulfillments = Object.fromEntries(
      Object.entries(plan.fulfillments).map(([k, v]) => [k, [...v]]),
    )
  }
  return next
}

// ---- Course identity ----

// Match a course by its stable identity. Placeholders use slotId; real
// courses use originalCode || code (old App `courseMatches`). We also accept
// the current display code so callers holding a renamed code still match.
function matchesId(courseId: string) {
  return (c: PlannedCourse): boolean =>
    (c.slotId !== undefined && c.slotId === courseId) ||
    (c.originalCode || c.code) === courseId ||
    c.code === courseId
}

interface CourseLocation {
  semKey: string
  index: number
}

/** Identify a course in the plan. Returns { semKey, index } or null. */
function findCourse(
  plan: Plan,
  predicate: (c: PlannedCourse) => boolean,
  onlySem?: string,
): CourseLocation | null {
  for (const [k, courses] of Object.entries(
    plan.semesters as Record<string, PlannedCourse[]>,
  )) {
    if (onlySem !== undefined && k !== onlySem) continue
    const i = courses.findIndex(predicate)
    if (i >= 0) return { semKey: k, index: i }
  }
  return null
}

function courseAt(plan: Plan, loc: CourseLocation): PlannedCourse {
  const courses = (plan.semesters as Record<string, PlannedCourse[]>)[loc.semKey] ?? []
  const c = courses[loc.index]
  if (!c) throw new Error(`Internal: no course at ${loc.semKey}[${loc.index}]`)
  return c
}

/** VIPR courses with the fixed flag are program-locked (summer-y1 VIPR 1300 etc.). */
function isLockedViper(c: PlannedCourse): boolean {
  return c.category === 'viper' && c.fixed === true
}

function isSemesterKey(k: string): k is SemesterKey {
  return (ALL_SEMESTER_KEYS as readonly string[]).includes(k)
}

function semLabel(plan: Plan, semKey: string): string {
  if (!isSemesterKey(semKey)) return semKey
  return semesterLabel(semKey, plan.meta.gradYear).season
}

function fail(plan: Plan, message: string): MutationResult {
  return { ok: false, message, plan }
}

// ---- Mutations ----

/**
 * Add a course to a specific semester (old handleAddCourse).
 * Title/CU default from the catalog when omitted; unknown courses are allowed
 * — "if the user knows what they want, even a course not in our data, they
 * type it in and it's added".
 */
export function addCourse(plan: Plan, semester: SemesterKey, course: CourseDraft): MutationResult {
  if (!isSemesterKey(semester)) {
    return fail(plan, `Unknown semester "${semester as string}".`)
  }
  let code = course.code?.trim()
  if (!code) return fail(plan, 'Course code is required.')

  const catalog = lookupCourse(code)
  const next = clonePlan(plan)
  const placeholder = !!course.isPlaceholder
  if (placeholder) {
    // Open slots share a display code ("—") but need distinct identities
    // for tagging, moving and removal: suffix with the next free ordinal.
    const base = code
    const taken = new Set(
      Object.values(next.semesters)
        .flat()
        .map((c) => c.originalCode ?? c.code),
    )
    let n = 1
    code = `${base} #${n}`
    while (taken.has(code)) code = `${base} #${++n}`
  }
  next.semesters[semester].push({
    code,
    title: course.title?.trim() || catalog?.title || code,
    cu: course.cu ?? catalog?.cu ?? 1,
    category: course.category ?? 'gened',
    isElective: placeholder,
    isPlaceholder: placeholder,
    ...(course.slotId ? { slotId: course.slotId, slotLabel: course.title?.trim() } : {}),
    ...(course.intent ? { intent: course.intent } : {}),
    isUserAdded: true,
    tags: ['USER-ADDED'],
  })
  recomputeDerived(next)
  const what = placeholder ? `an open ${course.title?.trim() ?? 'requirement'} slot` : code
  return { ok: true, message: `Added ${what} to ${semLabel(next, semester)}`, plan: next }
}

/**
 * Delete: just remove from the semester (old handleDeleteCourse). No
 * "deletedCourses" tracking needed since there's no scheduler trying to
 * re-add it. Fixed VIPER courses (summer-y1 VIPR 1300) cannot be removed.
 */
export function removeCourse(plan: Plan, semester: SemesterKey, courseId: string): MutationResult {
  const loc = findCourse(plan, matchesId(courseId), semester)
  if (!loc) {
    return fail(plan, `Course "${courseId}" not found in ${semLabel(plan, semester)}.`)
  }
  const target = courseAt(plan, loc)
  if (isLockedViper(target)) {
    return fail(plan, 'VIPR courses are required by the program and cannot be removed.')
  }
  const next = clonePlan(plan)
  ;(next.semesters as Record<string, PlannedCourse[]>)[loc.semKey]?.splice(loc.index, 1)
  recomputeDerived(next)
  const label = target.code === '—' ? target.title : target.code
  return { ok: true, message: `Removed ${label}`, plan: next }
}

/**
 * Move a course between semesters, or reorder within one (old onDrop).
 *
 * Trap #7: dragging a course within its current semester is a REORDER, not a
 * move — the MOVED tag is NOT added, and the insertion index must be adjusted
 * when fromIdx < insertAt because the removal splice shifts positions.
 */
export function moveCourse(
  plan: Plan,
  from: SemesterKey,
  to: SemesterKey,
  courseId: string,
  targetIndex?: number,
): MutationResult {
  if (!isSemesterKey(to)) return fail(plan, `Unknown semester "${to as string}".`)

  const next = clonePlan(plan)
  // The old onDrop located the course wherever it actually was (findCourse
  // over the whole plan) — honor that, preferring the caller's `from`.
  const loc =
    findCourse(next, matchesId(courseId), from) ?? findCourse(next, matchesId(courseId))
  if (!loc) return fail(plan, `Course "${courseId}" not found in the plan.`)

  const fromSem = loc.semKey
  const fromIdx = loc.index
  const fromCourses = (next.semesters as Record<string, PlannedCourse[]>)[fromSem] ?? []
  const candidate = fromCourses[fromIdx]
  if (!candidate) return fail(plan, `Course "${courseId}" not found in the plan.`)
  // The old UI never let locked courses be dragged (isDraggable = !isLocked);
  // enforce the same rule here so LLM tool calls can't move them either.
  if (isLockedViper(candidate)) {
    return fail(plan, 'VIPR courses are required by the program and cannot be moved.')
  }

  const [moved] = fromCourses.splice(fromIdx, 1)
  if (!moved) return fail(plan, `Course "${courseId}" not found in the plan.`)
  // Tag as moved (only when crossing semesters; not for in-place reorder)
  if (fromSem !== to) {
    if (!moved.tags) moved.tags = []
    if (!moved.tags.includes('MOVED')) moved.tags.push('MOVED')
  }
  // Insert at the target position. If target is undefined, append.
  const toCourses = (next.semesters as Record<string, PlannedCourse[]>)[to] ?? []
  ;(next.semesters as Record<string, PlannedCourse[]>)[to] = toCourses
  let insertAt = typeof targetIndex === 'number' ? targetIndex : toCourses.length
  // Adjust insertion index if we removed from earlier in the same semester
  if (fromSem === to && fromIdx < insertAt) insertAt -= 1
  // Clamp
  insertAt = Math.max(0, Math.min(insertAt, toCourses.length))
  toCourses.splice(insertAt, 0, moved)
  recomputeDerived(next)

  const label = moved.code === '—' ? moved.title : moved.code
  const message =
    fromSem === to
      ? `Reordered ${label} within ${semLabel(next, to)}`
      : `Moved ${label} from ${semLabel(next, fromSem)} to ${semLabel(next, to)}`
  return { ok: true, message, plan: next }
}

/**
 * Mark / unmark fulfillment for a course (old handleToggleFulfillment, but
 * with an explicit on/off instead of a toggle so LLM calls are idempotent).
 * The fulfillment id is a slot key like 'ncc-kite', 'ncc-distrib-h', 'seas-ssh'.
 */
export function tagFulfillment(
  plan: Plan,
  courseId: string,
  fulfillmentId: FulfillmentTag,
  on: boolean,
): MutationResult {
  if (!courseId || !fulfillmentId) {
    return fail(plan, 'courseId and fulfillmentId are required.')
  }
  const loc = findCourse(plan, matchesId(courseId))
  if (!loc) return fail(plan, `Course "${courseId}" not found in the plan.`)
  const course = courseAt(plan, loc)
  // Marks are keyed by stable identity so they survive renames/swaps.
  const key = course.originalCode || course.code

  const next = clonePlan(plan)
  const current = next.fulfillments?.[key] ?? []
  const updated = on
    ? current.includes(fulfillmentId)
      ? current
      : [...current, fulfillmentId]
    : current.filter((x) => x !== fulfillmentId)
  next.fulfillments = { ...(next.fulfillments ?? {}), [key]: updated }
  const message = on
    ? `Marked ${key} as fulfilling ${fulfillmentId}`
    : `Unmarked ${fulfillmentId} on ${key}`
  return { ok: true, message, plan: next }
}

/**
 * Replace an elective slot's course (old onSelectElective, from the picker).
 * Keeps slotId so we know what the slot fulfills.
 */
export function swapElective(plan: Plan, slotId: string, newCode: string): MutationResult {
  const code = newCode?.trim()
  if (!slotId || !code) return fail(plan, 'slotId and newCode are required.')

  const next = clonePlan(plan)
  for (const [k, courses] of Object.entries(
    next.semesters as Record<string, PlannedCourse[]>,
  )) {
    const idx = courses.findIndex((c) => c.slotId === slotId)
    if (idx >= 0) {
      const existing = courses[idx]
      if (!existing) continue
      const courseData = lookupCourse(code)
      courses[idx] = {
        ...existing,
        code,
        title: courseData?.title || code,
        cu: courseData?.cu || existing.cu,
        isPlaceholder: false,
        originalCode: code,
        // Keep slotId so we know what it fulfills
      }
      recomputeDerived(next)
      return {
        ok: true,
        message: `Picked ${code} for ${existing.slotLabel || slotId} (${semLabel(next, k)})`,
        plan: next,
      }
    }
  }
  return fail(plan, `No elective slot "${slotId}" in the plan.`)
}

/**
 * Rename: rewrite `code` and/or `title` directly (old handleEditCode —
 * scheduler-era prereqs are gone, so this is safe). We keep `originalCode`
 * so the user can see what it was renamed from, and so fulfillment marks
 * stay attached. An open slot may be named this way too: it becomes a real
 * course but keeps its slotId/intent, so the audit still counts it.
 */
export function renameCourse(
  plan: Plan,
  courseId: string,
  newCode: string,
  newTitle?: string,
): MutationResult {
  const trimmed = newCode?.trim()
  if (!trimmed) return fail(plan, 'New course code is required.')
  const title = newTitle?.trim()

  const loc = findCourse(plan, matchesId(courseId))
  if (!loc) return fail(plan, `Course "${courseId}" not found in the plan.`)
  const target = courseAt(plan, loc)
  if (isLockedViper(target)) {
    return fail(plan, 'VIPR courses are required by the program and cannot be renamed.')
  }
  const original = target.originalCode || target.code
  if (!original) return fail(plan, `Course "${courseId}" cannot be renamed.`)

  const next = clonePlan(plan)
  const c = courseAt(next, loc)
  const codeChanged = trimmed !== c.code
  if (c.isPlaceholder) {
    // Naming an open slot: same shape as swapElective, minus the pool.
    if (trimmed.startsWith('—')) return fail(plan, 'Enter a course code to fill this slot.')
    const catalog = lookupCourse(trimmed)
    c.code = trimmed
    c.originalCode = trimmed
    // Keep the slot's own label when the catalog has no title for the code.
    c.title = title || catalog?.title || c.title
    c.cu = catalog?.cu || c.cu
    c.isPlaceholder = false
    c.isRenamed = false
    recomputeDerived(next)
    return { ok: true, message: `Filled ${target.title} with ${trimmed}`, plan: next }
  }
  c.code = trimmed
  if (!c.originalCode) c.originalCode = original
  c.isRenamed = trimmed !== c.originalCode
  if (title) c.title = title
  else if (codeChanged) c.title = lookupCourse(trimmed)?.title ?? c.title
  recomputeDerived(next)
  const what = codeChanged ? `Renamed ${original} to ${trimmed}` : `Retitled ${trimmed}`
  return { ok: true, message: what, plan: next }
}

// ---- Mutation dispatch (used by the LLM tool layer and simulate_change) ----

/** Apply a single Mutation value (the discriminated-union form). */
export function applyMutation(plan: Plan, mutation: Mutation): MutationResult {
  switch (mutation.kind) {
    case 'add_course':
      return addCourse(plan, mutation.semester, mutation.course)
    case 'remove_course':
      return removeCourse(plan, mutation.semester, mutation.courseId)
    case 'move_course':
      return moveCourse(plan, mutation.from, mutation.to, mutation.courseId, mutation.targetIndex)
    case 'tag_fulfillment':
      return tagFulfillment(plan, mutation.courseId, mutation.fulfillmentId, mutation.on)
    case 'swap_elective':
      return swapElective(plan, mutation.slotId, mutation.newCode)
    case 'rename_course':
      return renameCourse(plan, mutation.courseId, mutation.newCode, mutation.newTitle)
  }
}

/**
 * Apply a list of mutations in order — the primitive behind simulate_change.
 * All-or-nothing: if any mutation fails, the ORIGINAL plan is returned
 * untouched so a partial what-if can never leak into state.
 */
export function applyMutations(plan: Plan, mutations: readonly Mutation[]): MutationResult {
  let current = plan
  const messages: string[] = []
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i]
    if (!mutation) continue
    const result = applyMutation(current, mutation)
    if (!result.ok) {
      return {
        ok: false,
        message: `Mutation ${i + 1} of ${mutations.length} (${mutation.kind}) failed: ${result.message}`,
        plan,
      }
    }
    messages.push(result.message)
    current = result.plan
  }
  return {
    ok: true,
    message: messages.length > 0 ? messages.join(' · ') : 'No mutations to apply.',
    plan: current,
  }
}
