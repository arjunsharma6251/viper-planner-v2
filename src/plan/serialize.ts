// JSON export/import and CSV export, ported from the old app's exportJSON /
// applyImportedState / exportCSV (references/old-app/index.html ~5108-5223).
//
// Everything here is pure string-in/string-out — no DOM, no Blob. The UI
// layer wraps these in download/clipboard plumbing.

import { semesterLabel, type SemesterKey } from '../data/semesters'
import type { AugmentedPlan, FulfillmentTag, Plan, PlanMeta, PlannedCourse } from './types'
import { createEmptyPlan, recomputeDerived } from './mutations'

export interface DistributionTargets {
  N: number
  SS: number
  H: number
}

/**
 * Snapshot of the full app state. Field names are EXACTLY the old app's
 * exportJSON / copyShareLink state object (version 8) — JSON files exported
 * from the old app and existing share links parse into this shape, and
 * states we serialize stay readable by anything expecting the old format.
 */
export interface AppState {
  version?: number
  exportedAt?: string
  sasMajorKey?: string
  sasConcKey?: string
  seasMajorKey?: string
  seasConcKey?: string
  apCreditIds?: string[]
  gradYear?: number | null
  shiftForward?: boolean
  genedDistribution?: string
  curriculumMode?: string
  viperMods?: Record<string, boolean>
  distributionTargets?: DistributionTargets
  /** The old app's userPlan held ONLY semesters; loads/placement are derived. */
  userPlan?: { semesters: Partial<Record<string, PlannedCourse[]>> } | null
  userPlanFulfillments?: Record<string, FulfillmentTag[]>
  userColorOverrides?: Record<string, string>
}

/** The state-shape version the old app stamped on exports. */
export const APP_STATE_VERSION = 8

// ---- JSON export / import ----

/** Serialize app state for the "Download JSON" export (pretty-printed). */
export function serializeAppState(state: AppState): string {
  const payload: AppState = {
    ...state,
    version: APP_STATE_VERSION,
    exportedAt: new Date().toISOString(),
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Parse an exported/shared state JSON string. Tolerant like the old
 * applyImportedState: unknown fields pass through, a malformed userPlan
 * (no semesters object) is dropped rather than rejected. Returns null only
 * when the text isn't a JSON object at all. Never throws.
 */
export function parseAppState(text: string): AppState | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const state = parsed as AppState
    if (state.userPlan && typeof state.userPlan.semesters !== 'object') {
      return { ...state, userPlan: null }
    }
    return state
  } catch {
    return null
  }
}

/**
 * Hydrate a full Plan from an imported AppState. The old app stored only
 * {semesters} and re-derived everything else; this rebuilds loads/placement
 * and guarantees all 11 semester keys exist (trap #2). Returns null when the
 * state carries no plan.
 */
export function planFromAppState(state: AppState): Plan | null {
  if (!state.userPlan || !state.userPlan.semesters) return null
  const meta: PlanMeta = {}
  if (state.sasMajorKey !== undefined) meta.sasMajor = state.sasMajorKey
  if (state.sasConcKey !== undefined) meta.sasConc = state.sasConcKey
  if (state.seasMajorKey !== undefined) meta.seasMajor = state.seasMajorKey
  if (state.seasConcKey !== undefined) meta.seasConc = state.seasConcKey
  if (state.gradYear !== undefined) meta.gradYear = state.gradYear

  const plan = createEmptyPlan(meta)
  const target = plan.semesters as Record<string, PlannedCourse[]>
  for (const [k, courses] of Object.entries(state.userPlan.semesters)) {
    if (!Array.isArray(courses)) continue
    target[k] = courses.map((c) => ({ ...c }))
  }
  if (state.userPlanFulfillments) {
    plan.fulfillments = Object.fromEntries(
      Object.entries(state.userPlanFulfillments).map(([k, v]) => [k, [...v]]),
    )
  }
  return recomputeDerived(plan)
}

/** Export filename, matching the old app's pattern for both JSON and CSV. */
export function planFileName(
  sasMajorKey: string,
  seasMajorKey: string,
  gradYear: number | null | undefined,
  ext: 'json' | 'csv',
): string {
  return `viper-plan-${sasMajorKey}-${seasMajorKey}-${gradYear ?? 'plan'}.${ext}`
}

// ---- CSV export ----

export interface CsvExportOptions {
  /** e.g. "Chemistry" — full name of the BA major. */
  sasMajorName: string
  /** e.g. "Chemical & Biomolecular Engineering" — full name of the BSE major. */
  seasMajorName: string
  gradYear?: number | null
}

type CsvCell = string | number

function csvEscape(rows: CsvCell[][]): string {
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

/**
 * Build the spreadsheet (CSV) export — same column format as the old
 * exportCSV: per year a "Year N" row, season-header row, a
 * Course/CU/(spacer)/Course/CU header, paired fall/spring course rows, and a
 * Total row; then a Summary block (Total CU, Energy courses, Double-counted).
 *
 * NOTE: deliberately NO "Developed by Arjun Sharma" credit line anywhere in
 * this file's output. Michelle matches the CSV against the degree-audit
 * format and a trailing credit row broke that (CLAUDE.md common trap #8).
 */
export function planToCSV(plan: AugmentedPlan, opts: CsvExportOptions): string {
  const { sasMajorName, seasMajorName, gradYear } = opts
  const semesters = plan.semesters as Record<string, PlannedCourse[] | undefined>

  const rows: CsvCell[][] = []
  rows.push([
    `VIPER Four-Year Plan: ${sasMajorName} (BA) + ${seasMajorName} (BSE) — Class of ${gradYear}`,
  ])
  rows.push([])
  for (let yr = 1; yr <= 4; yr++) {
    const fk = `fall-y${yr}` as SemesterKey
    const sk = `spring-y${yr}` as SemesterKey
    const fl = semesterLabel(fk, gradYear).season
    const sl = semesterLabel(sk, gradYear).season
    const fc = semesters[fk] ?? []
    const sc = semesters[sk] ?? []
    rows.push([`Year ${yr}`])
    rows.push([fl, '', '', sl])
    rows.push(['Course', 'CU', '', 'Course', 'CU'])
    for (let i = 0; i < Math.max(fc.length, sc.length); i++) {
      const a = fc[i]
      const b = sc[i]
      rows.push([
        a ? `${a.code} (${a.title})` : '',
        a ? a.cu : '',
        '',
        b ? `${b.code} (${b.title})` : '',
        b ? b.cu : '',
      ])
    }
    rows.push([
      'Total',
      fc.reduce((s, c) => s + c.cu, 0).toFixed(1),
      '',
      'Total',
      sc.reduce((s, c) => s + c.cu, 0).toFixed(1),
    ])
    rows.push([])
  }
  rows.push(['Summary'])
  rows.push(['Total CU', plan.summary.totalCU.toFixed(1)])
  rows.push(['Energy courses', `${plan.summary.energyCoursesCount}/3`])
  rows.push(['Double-counted', plan.summary.doubleCountedCodes.length])
  return csvEscape(rows)
}
