// Several saved plans in one browser (2026-11 beta feedback: Max wanted to
// duplicate a plan and keep versions, and to compare major combinations side
// by side). Each saved plan is a full AppState — its own setup, plan, marks
// and colors — so switching plans switches everything.
//
// Storage: one localStorage key holding { activeId, plans }. The single
// app-state key from before (viper-planner:state:v8) is read once to seed the
// library and then left untouched, so rolling back loses nothing.
//
// Pure functions below take and return a library; the store owns the state.

import { MAJORS } from '../data/majors'
import type { AppState } from '../plan/serialize'
import { loadAppState, safeGetItem, safeSetItem } from './storage'

export const LIBRARY_KEY = 'viper-planner:library:v1'

export interface SavedPlan {
  id: string
  name: string
  /** ISO time of the last change. */
  updatedAt: string
  state: AppState
}

export interface PlanLibrary {
  version: 1
  activeId: string | null
  plans: SavedPlan[]
}

export const emptyLibrary = (): PlanLibrary => ({ version: 1, activeId: null, plans: [] })

export function newPlanId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // fall through
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** "CHEM + CBE", with the student's name in front when there is one. */
export function defaultPlanName(state: AppState): string {
  const sas = state.sasMajorKey ? (MAJORS[state.sasMajorKey]?.code ?? state.sasMajorKey) : null
  const seas = state.seasMajorKey ? (MAJORS[state.seasMajorKey]?.code ?? state.seasMajorKey) : null
  const combo = sas && seas ? `${sas} + ${seas}` : 'New plan'
  return state.studentName?.trim() ? `${state.studentName.trim()} · ${combo}` : combo
}

/** A name not already used in the library ("CHEM + CBE (2)"). */
export function uniqueName(lib: PlanLibrary, base: string, exceptId?: string): string {
  const taken = new Set(lib.plans.filter((p) => p.id !== exceptId).map((p) => p.name))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base} (${n})`)) return `${base} (${n})`
}

const now = () => new Date().toISOString()

export function activePlan(lib: PlanLibrary): SavedPlan | null {
  return lib.plans.find((p) => p.id === lib.activeId) ?? null
}

/** Add a plan and make it active. */
export function addPlan(lib: PlanLibrary, state: AppState, name?: string): { lib: PlanLibrary; id: string } {
  const id = newPlanId()
  const plan: SavedPlan = { id, name: uniqueName(lib, name?.trim() || defaultPlanName(state)), updatedAt: now(), state }
  return { lib: { ...lib, activeId: id, plans: [...lib.plans, plan] }, id }
}

/** Replace a plan's state (an edit, autosaved). */
export function updatePlan(lib: PlanLibrary, id: string, state: AppState): PlanLibrary {
  return { ...lib, plans: lib.plans.map((p) => (p.id === id ? { ...p, state, updatedAt: now() } : p)) }
}

export function renamePlan(lib: PlanLibrary, id: string, name: string): PlanLibrary {
  const trimmed = name.trim()
  if (!trimmed) return lib
  return { ...lib, plans: lib.plans.map((p) => (p.id === id ? { ...p, name: uniqueName(lib, trimmed, id), updatedAt: now() } : p)) }
}

/** Copy a plan (deep) under "<name> (copy)" and make the copy active. */
export function duplicatePlan(lib: PlanLibrary, id: string): { lib: PlanLibrary; id: string } | null {
  const source = lib.plans.find((p) => p.id === id)
  if (!source) return null
  return addPlan(lib, structuredClone(source.state), `${source.name} (copy)`)
}

export function switchPlan(lib: PlanLibrary, id: string): PlanLibrary {
  return lib.plans.some((p) => p.id === id) ? { ...lib, activeId: id } : lib
}

/**
 * Remove a plan. When it was active, the most recently edited other plan
 * becomes active (or none). Returns what is needed to undo.
 */
export function deletePlan(
  lib: PlanLibrary,
  id: string,
): { lib: PlanLibrary; removed: SavedPlan; index: number; wasActive: boolean } | null {
  const index = lib.plans.findIndex((p) => p.id === id)
  const removed = lib.plans[index]
  if (index < 0 || !removed) return null
  const plans = lib.plans.filter((p) => p.id !== id)
  const wasActive = lib.activeId === id
  const nextActive = wasActive
    ? ([...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id ?? null)
    : lib.activeId
  return { lib: { ...lib, plans, activeId: nextActive }, removed, index, wasActive }
}

/** Undo a delete: put the plan back where it was (and re-activate it if it was active). */
export function restorePlan(lib: PlanLibrary, removed: SavedPlan, index: number, wasActive: boolean): PlanLibrary {
  if (lib.plans.some((p) => p.id === removed.id)) return lib
  const plans = [...lib.plans]
  plans.splice(Math.min(index, plans.length), 0, removed)
  return { ...lib, plans, activeId: wasActive ? removed.id : lib.activeId }
}

/**
 * Combine this tab's library with what another tab stored since (2026-11-12,
 * "making sure everything saves": with the planner open in two tabs, each
 * wrote its whole library and erased plans the other had made or edited).
 * Per plan, the later `updatedAt` wins; a plan only the other tab has is
 * kept unless this tab deleted it. The active plan stays this tab's own.
 */
export function mergeLibraries(mine: PlanLibrary, stored: PlanLibrary, deletedHere: ReadonlySet<string> = new Set()): PlanLibrary {
  const theirs = new Map(stored.plans.map((p) => [p.id, p]))
  const plans = mine.plans.map((p) => {
    const other = theirs.get(p.id)
    return other && other.updatedAt > p.updatedAt ? other : p
  })
  const have = new Set(plans.map((p) => p.id))
  for (const p of stored.plans) if (!have.has(p.id) && !deletedHere.has(p.id)) plans.push(p)
  const activeId = plans.some((p) => p.id === mine.activeId) ? mine.activeId : (plans[0]?.id ?? null)
  return { ...mine, activeId, plans }
}

// ---- Storage ----

function isLibrary(v: unknown): v is PlanLibrary {
  if (!v || typeof v !== 'object') return false
  const l = v as Partial<PlanLibrary>
  return Array.isArray(l.plans) && (l.activeId === null || typeof l.activeId === 'string')
}

/**
 * The saved library. The first time, the single saved plan from before
 * becomes the library's first entry (migration); its old key is kept.
 */
/** The stored library as written, or null when there is none (or it is corrupt). */
export function readStoredLibrary(raw: string | null = safeGetItem(LIBRARY_KEY)): PlanLibrary | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isLibrary(parsed)) return null
    const plans = parsed.plans.filter((p) => p && typeof p.id === 'string' && p.state && typeof p.state === 'object')
    const activeId = plans.some((p) => p.id === parsed.activeId) ? parsed.activeId : (plans[0]?.id ?? null)
    return { version: 1, activeId, plans }
  } catch {
    return null
  }
}

export function loadLibrary(): PlanLibrary {
  const stored = readStoredLibrary()
  if (stored) return stored
  const legacy = loadAppState()
  if (legacy && (legacy.userPlan || legacy.sasMajorKey)) {
    const migrated = addPlan(emptyLibrary(), legacy).lib
    saveLibrary(migrated)
    return migrated
  }
  return emptyLibrary()
}

export function saveLibrary(lib: PlanLibrary): boolean {
  try {
    return safeSetItem(LIBRARY_KEY, JSON.stringify(lib))
  } catch {
    return false
  }
}
