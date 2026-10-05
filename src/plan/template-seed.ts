import { AP_CREDITS } from '../data/ap-credits'
import { lookupCourse } from '../data/courses'
import { SEMESTER_KEYS, type SemesterKey } from '../data/semesters'
import type { PlanTemplate, TemplateEntry, TemplateSlotKind } from '../data/templates'
import { VIPER_PROGRAM } from '../data/viper-program'
import type { DistributionTargets, ViperMods } from '../ncc/types'
import { NCC_GENED_SLOTS } from '../ncc/scheduler-module'
import { CAP, FIRST_SEMESTER_CAP } from '../ui/load'
import { augmentPlan } from './augment'
import { createEmptyPlan, recomputeDerived } from './mutations'
import { computeNccAudit } from './ncc-audit'
import type { CourseTag, FoundationId, FulfillmentIntent, Plan, PlanMeta, PlannedCourse } from './types'

/**
 * The College policy a seed is built against: which VIPER modifications
 * are in force and the SS / H distribution targets. Students always get
 * the confirmed policy; only an admin seeding under the sandbox gets a
 * proposal.
 */
export interface SeedPolicy {
  mods: ViperMods
  targets: DistributionTargets
}

export interface TemplateSeedOptions {
  apCreditIds: readonly string[]
  gradYear: number | null
  seasMajorKey: string
  meta: PlanMeta
  policy: SeedPolicy
}

// ---- Open-slot rows ----

const SLOT_TITLES: Record<Exclude<TemplateSlotKind, 'elective'>, string> = {
  writ: 'Critical Writing Foundation',
  kite: 'Kite — Humanities Foundation',
  key: 'Key Foundation',
  pad: 'Perspectives and Difference',
  'dist-ss': 'Social Sciences Distribution',
  'dist-h': 'Humanities & Arts Distribution',
}

const SLOT_FOUNDATION: Partial<Record<TemplateSlotKind, FoundationId>> = {
  writ: 'ncc-writ',
  kite: 'ncc-kite',
  key: 'ncc-key',
  pad: 'ncc-pad',
}

/** Intent + notes for a Foundation slot, from the scheduler's slot table. */
function foundationSlotDef(id: FoundationId) {
  return NCC_GENED_SLOTS.find((s) => s.id === id)
}

function genEdSlot(slotId: string, title: string, intent: FulfillmentIntent, note?: string): PlannedCourse {
  return {
    code: `— ${slotId}`,
    title,
    cu: 1,
    category: 'gened',
    tags: ['Gen-Ed'],
    isGenEd: true,
    isElective: true,
    isPlaceholder: true,
    slotId,
    slotLabel: title,
    intent,
    ...(note ? { note } : {}),
  }
}

function slotRow(entry: Extract<TemplateEntry, { slot: TemplateSlotKind }>, ordinal: Map<string, number>): PlannedCourse {
  if (entry.slot === 'elective') {
    const slotId = entry.slotId ?? 'elective'
    const title = entry.label ?? 'Elective'
    return {
      code: `— ${slotId}`,
      title,
      cu: 1,
      category: entry.category ?? 'sas',
      tags: [],
      isElective: true,
      isPlaceholder: true,
      slotId,
      slotLabel: title,
    }
  }
  const foundation = SLOT_FOUNDATION[entry.slot]
  if (foundation) {
    const def = foundationSlotDef(foundation)
    return genEdSlot(foundation, SLOT_TITLES[entry.slot], def?.intent ?? { foundation }, def?.note ?? undefined)
  }
  // Distribution slots: numbered like the scheduler's ncc-dist-ss-1, -2 ...
  const division = entry.slot === 'dist-ss' ? 'ss' : 'h'
  const n = (ordinal.get(division) ?? 0) + 1
  ordinal.set(division, n)
  return genEdSlot(`ncc-dist-${division}-${n}`, SLOT_TITLES[entry.slot], { distribution: division.toUpperCase() })
}

function courseRow(entry: Extract<TemplateEntry, { code: string }>): PlannedCourse {
  const data = lookupCourse(entry.code)
  const tags: CourseTag[] = [entry.category === 'both' ? 'DC' : entry.category === 'sas' ? 'SAS' : 'SEAS']
  if (data?.energy) tags.push('ENERGY')
  if (data?.fa) tags.push(`FA:${data.fa}`)
  if (data?.sec) tags.push(`SEC:${data.sec}`)
  return {
    code: entry.code,
    title: data?.title ?? entry.code,
    cu: data?.cu ?? 1,
    category: entry.category,
    tags,
    isDouble: entry.category === 'both',
    isEnergy: !!data?.energy,
    fa: data?.fa ?? null,
    sec: data?.sec ?? null,
    ...(entry.slotId ? { slotId: entry.slotId, isElective: true } : {}),
    ...(entry.slotLabel ? { slotLabel: entry.slotLabel } : {}),
    ...(entry.pool ? { pool: entry.pool } : {}),
    note: entry.note ?? data?.note ?? null,
  }
}

/** Course codes the student's incoming credit covers (AP_CREDITS grants). */
function creditedCodes(apCreditIds: readonly string[], gradYear: number | null): Set<string> {
  const codes = new Set<string>()
  for (const id of apCreditIds) {
    const cred = AP_CREDITS.find((c) => c.id === id)
    if (!cred) continue
    const grants = typeof cred.grants === 'function' ? cred.grants(gradYear) : cred.grants
    for (const g of grants) if (/^[A-Z]{2,5} \d{4}$/.test(g)) codes.add(g)
  }
  return codes
}

/**
 * Lay a template out as a user plan: its courses, VIPER's fixed program
 * courses, incoming credit removed (and recorded as 'credit'), then any
 * slots the policy still requires on top (see topUpRequirements).
 */
export function planFromTemplate(template: PlanTemplate, opts: TemplateSeedOptions): Plan {
  const plan = createEmptyPlan(opts.meta)
  const ordinal = new Map<string, number>()
  for (const [semKey, entries] of Object.entries(template.terms) as Array<[SemesterKey, readonly TemplateEntry[]]>) {
    plan.semesters[semKey] = entries.map((e) => ('slot' in e ? slotRow(e, ordinal) : courseRow(e)))
  }
  for (const v of VIPER_PROGRAM.fixedCourses) {
    plan.semesters[v.semKey].unshift({
      code: v.code,
      title: v.title,
      cu: v.cu,
      category: 'viper',
      tags: ['VIPER'],
      note: v.note ?? null,
      fixed: v.fixed !== false,
    })
  }
  const credited = creditedCodes(opts.apCreditIds, opts.gradYear)
  for (const k of Object.keys(plan.semesters) as SemesterKey[]) {
    plan.semesters[k] = plan.semesters[k].filter((c) => !credited.has(c.code))
  }
  for (const code of credited) plan.placement[code] = 'credit'
  recomputeDerived(plan)
  return topUpRequirements(plan, opts)
}

// ---- Top-up ----

const EARLY_TERMS: readonly SemesterKey[] = ['fall-y1', 'spring-y1', 'fall-y2', 'spring-y2']
const LATE_FIRST: readonly SemesterKey[] = [...SEMESTER_KEYS].reverse()

/**
 * The term for one more 1 CU slot: the lightest term that stays within the
 * cap (5.5 CU in Fall Y1, 6.5 after), searching the first two years first
 * for Foundations and the latest years first for everything else; ties go
 * to the first term searched. With no room under the cap, the lightest
 * term after Fall Y1 (the first-semester cap is a hard rule), latest first.
 */
function pickTerm(plan: Plan, early: boolean): SemesterKey {
  const load = (k: SemesterKey) => plan.loads[k] ?? 0
  const capOf = (k: SemesterKey) => (k === 'fall-y1' ? FIRST_SEMESTER_CAP : CAP)
  const lightest = (keys: readonly SemesterKey[], fits: (k: SemesterKey) => boolean): SemesterKey | null => {
    let best: SemesterKey | null = null
    for (const k of keys) if (fits(k) && (best === null || load(k) < load(best))) best = k
    return best
  }
  const underCap = (k: SemesterKey) => load(k) + 1 <= capOf(k)
  return (
    (early ? lightest(EARLY_TERMS, underCap) : null) ??
    lightest(early ? SEMESTER_KEYS : LATE_FIRST, underCap) ??
    lightest(LATE_FIRST, (k) => k !== 'fall-y1') ??
    'spring-y4'
  )
}

/** Place a slot row; repeatable slots ('<prefix>-n') take the next free n. */
function addSlot(plan: Plan, row: PlannedCourse, early: boolean): void {
  const rows = Object.values(plan.semesters).flat()
  let slotId = row.slotId ?? 'slot'
  if (slotId.endsWith('-n')) {
    const prefix = slotId.slice(0, -1)
    const ids = new Set(rows.map((c) => c.slotId))
    let n = 1
    while (ids.has(`${prefix}${n}`)) n++
    slotId = `${prefix}${n}`
  }
  const codes = new Set(rows.map((c) => c.code))
  let code = `— ${slotId}`
  for (let n = 2; codes.has(code); n++) code = `— ${slotId} #${n}`
  const term = pickTerm(plan, early)
  plan.semesters[term] = [...plan.semesters[term], { ...row, code, slotId, slotLabel: row.title }]
  recomputeDerived(plan)
}

/**
 * Add the open slots a policy still requires: missing Foundations, then
 * the SS / H distribution shortfall, then the SEAS SS/H/TBS shortfall.
 * One slot at a time, re-auditing after each, so a slot that fills two
 * gaps is never doubled. Shared by template seeds and scheduler seeds
 * (the scheduler fills the College distribution but not the SEAS floor).
 */
export function topUpRequirements(plan: Plan, opts: TemplateSeedOptions): Plan {
  const note = 'Required under the current College curriculum.'
  for (let guard = 0; guard < 16; guard++) {
    const aug = augmentPlan(plan)
    if (!aug) return plan
    const audit = computeNccAudit(aug, opts.apCreditIds, opts.policy.mods, opts.seasMajorKey, opts.policy.targets)

    const missing = audit.foundations.find((f) => f.state === 'missing')
    if (missing) {
      const def = foundationSlotDef(missing.id)
      const title = missing.id === 'ncc-lang' ? 'Language Foundation' : (def?.label ?? missing.label)
      addSlot(plan, genEdSlot(missing.id, title, def?.intent ?? { foundation: missing.id }, note), true)
      continue
    }
    const shortDivision = audit.divisions.find((d) => d.planned < d.target)
    if (shortDivision) {
      const division = shortDivision.id.toLowerCase()
      const title = shortDivision.id === 'SS' ? SLOT_TITLES['dist-ss'] : SLOT_TITLES['dist-h']
      addSlot(plan, genEdSlot(`ncc-dist-${division}-n`, title, { distribution: shortDivision.id }, note), false)
      continue
    }
    const shortSeas = audit.seas.find((r) => r.planned < r.target && r.id !== 'seas-writ' && r.id !== 'seas-ethics')
    if (shortSeas) {
      addSlot(
        plan,
        genEdSlot('seas-ssh-n', 'SEAS Social Science / Humanities', { seas: ['ssh'] }, 'Required by SEAS: general electives in the social sciences or humanities.'),
        false,
      )
      continue
    }
    return plan
  }
  return plan
}
