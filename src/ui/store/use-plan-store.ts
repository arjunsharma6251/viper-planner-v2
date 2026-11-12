import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AugmentedPlan,
  Mutation,
  MutationResult,
  Plan,
  PlannedCourse,
} from '../../plan/types'
import { applyMutation, applyMutations, createEmptyPlan, recomputeDerived } from '../../plan/mutations'
import { augmentPlan } from '../../plan/augment'
import {
  parseAppState,
  planFromAppState,
  planFileName,
  planToCSV,
  serializeAppState,
  type AppState,
  type DistributionTargets,
} from '../../plan/serialize'
import { buildShareLink, readShareLinkState } from '../../utils/share-link'
import {
  activePlan,
  addPlan,
  defaultPlanName,
  deletePlan as deleteFromLibrary,
  duplicatePlan as duplicateInLibrary,
  LIBRARY_KEY,
  loadLibrary,
  mergeLibraries,
  readStoredLibrary,
  renamePlan as renameInLibrary,
  restorePlan,
  saveLibrary,
  switchPlan as switchInLibrary,
  updatePlan,
  type PlanLibrary,
} from '../../utils/plan-library'
import { buildPlan } from '../../scheduler/build-plan'
import { lookupCourse } from '../../data/courses'
import { MAJORS } from '../../data/majors'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { pcrUrlFor } from '../../utils/pcr'
import { CONFIRMED_DISTRIBUTION_TARGETS, CONFIRMED_VIPER_MODS, DEFAULT_VIPER_MODS } from '../../ncc/mods'
import { findTemplate } from '../../data/templates'
import { planFromTemplate, topUpRequirements, type SeedPolicy } from '../../plan/template-seed'
import { uniquifyOpenSlots } from '../../plan/open-slot'
import { applyCompletedTerms, type CompletedTerms } from '../../plan/completed-terms'
import { ALL_SEMESTER_KEYS } from '../../data/semesters'
import { installNccModule } from '../../ncc/scheduler-module'
import type { PlanToolContext } from '../../llm/tools'

export type CurriculumMode = 'legacy' | 'ncc'

export interface PlanConfig {
  sasMajorKey: string
  sasConcKey: string | null
  seasMajorKey: string
  seasConcKey: string | null
  apCreditIds: string[]
  gradYear: number | null
  /** Which College curriculum the seed is built for. Omitted = derived from gradYear. */
  curriculumMode?: CurriculumMode
  /** The student's name, shown on the sheet and in print. Optional. */
  studentName?: string
  /** Terms already finished → course codes taken; the seed plans only the rest. */
  completedTerms?: CompletedTerms
}

/**
 * The Class of 2031 (entering Fall 2027) and later default to the New
 * College Curriculum; earlier classes default to the old core. Either can
 * be chosen in setup — this only sets the default.
 */
export const FIRST_NCC_CLASS = 2031

export function defaultCurriculumMode(gradYear: number | null | undefined): CurriculumMode {
  return gradYear != null && gradYear >= FIRST_NCC_CLASS ? 'ncc' : 'legacy'
}

export function curriculumModeOf(config: Pick<PlanConfig, 'gradYear' | 'curriculumMode'>): CurriculumMode {
  return config.curriculumMode ?? defaultCurriculumMode(config.gradYear)
}

// Must precede any seedPlan() call (boot runs inside the first render).
installNccModule()

const UNDO_LIMIT = 50

/**
 * Which policy the audit runs under. Students: always 'confirmed'. Admins
 * can flip to 'proposal' (the sandbox's mods + targets) — never shown or
 * shared outside admin mode.
 */
export type AuditPolicy = 'confirmed' | 'proposal'
const AUDIT_POLICY_KEY = 'viper-planner:admin-audit-policy'

/** The policy every student seed and audit uses. */
export const CONFIRMED_POLICY: SeedPolicy = {
  mods: { ...CONFIRMED_VIPER_MODS },
  targets: { ...CONFIRMED_DISTRIBUTION_TARGETS },
}

/**
 * Seed a user-owned Plan (runs ONCE — principle #2). Combinations with a
 * program-office template start from it; everything else comes from the
 * scheduler. NCC seeds are then topped up to whatever the policy still
 * requires. `policy` is the confirmed policy for every student; only an
 * admin seeding under the sandbox passes a proposal.
 */
export function seedPlan(config: PlanConfig, policy: SeedPolicy = CONFIRMED_POLICY): Plan | null {
  const seeded = seedFresh(config, policy)
  // A current student's finished terms replace what the seed drew there;
  // the rest of the plan covers what is left (src/plan/completed-terms.ts).
  return seeded ? applyCompletedTerms(seeded, config.completedTerms) : null
}

function seedFresh(config: PlanConfig, policy: SeedPolicy): Plan | null {
  const mode = curriculumModeOf(config)
  const meta = {
    sasMajor: config.sasMajorKey,
    sasConc: config.sasConcKey ?? undefined,
    seasMajor: config.seasMajorKey,
    seasConc: config.seasConcKey ?? undefined,
    gradYear: config.gradYear,
    curriculumMode: mode,
  }
  const template =
    mode === 'ncc' ? findTemplate(config.sasMajorKey, config.sasConcKey, config.seasMajorKey, config.seasConcKey) : null
  if (template) {
    return planFromTemplate(template, {
      apCreditIds: config.apCreditIds,
      gradYear: config.gradYear,
      seasMajorKey: config.seasMajorKey,
      meta,
      policy,
    })
  }
  const built = buildPlan({
    sasMajorKey: config.sasMajorKey,
    sasConcKey: config.sasConcKey,
    seasMajorKey: config.seasMajorKey,
    seasConcKey: config.seasConcKey,
    apCreditIds: config.apCreditIds,
    gradYear: config.gradYear,
    shiftForward: true,
    genedDistribution: 'frontload',
    curriculumMode: mode,
    // Students are seeded under confirmed policy; an admin may seed under
    // the sandbox's proposal to see what it would build.
    viperMods: { ...policy.mods } as Record<string, boolean>,
    distributionTargets: { ...policy.targets },
  })
  if (!built) return null
  const plan = createEmptyPlan(meta)
  // The user plan keeps only what the user can edit; loads/placement re-derive.
  plan.semesters = built.semesters as unknown as Plan['semesters']
  for (const [code, where] of Object.entries(built.placement)) {
    if (where === 'credit') plan.placement[code] = 'credit'
  }
  uniquifyOpenSlots(recomputeDerived(plan))
  if (mode !== 'ncc') return plan
  return topUpRequirements(plan, {
    apCreditIds: config.apCreditIds,
    gradYear: config.gradYear,
    seasMajorKey: config.seasMajorKey,
    meta,
    policy,
  })
}

function completedFromState(raw: NonNullable<AppState['completedTerms']>): CompletedTerms {
  const out: Record<string, string[]> = {}
  for (const k of ALL_SEMESTER_KEYS) {
    const v = raw[k]
    if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string')
  }
  return out as CompletedTerms
}

export function configFromState(state: AppState): PlanConfig | null {
  if (!state.sasMajorKey || !state.seasMajorKey) return null
  return {
    sasMajorKey: state.sasMajorKey,
    sasConcKey: state.sasConcKey ?? null,
    seasMajorKey: state.seasMajorKey,
    seasConcKey: state.seasConcKey ?? null,
    apCreditIds: state.apCreditIds ?? [],
    gradYear: state.gradYear ?? null,
    ...(state.studentName ? { studentName: state.studentName } : {}),
    ...(state.completedTerms ? { completedTerms: completedFromState(state.completedTerms) } : {}),
    ...(state.curriculumMode === 'ncc' || state.curriculumMode === 'legacy'
      ? { curriculumMode: state.curriculumMode }
      : {}),
  }
}

/**
 * Everything one saved plan holds, as stored in the library, the share link
 * and the JSON export. The inverse of `configFromState` + `planFromAppState`
 * (save-roundtrip.test.ts pins that nothing is lost).
 */
export function appStateOf(
  c: PlanConfig | null,
  p: Plan | null,
  extras: {
    viperMods: Record<string, boolean>
    distributionTargets: DistributionTargets
    colorOverrides: Record<string, string>
  },
): AppState {
  return {
    sasMajorKey: c?.sasMajorKey,
    sasConcKey: c?.sasConcKey ?? undefined,
    seasMajorKey: c?.seasMajorKey,
    seasConcKey: c?.seasConcKey ?? undefined,
    apCreditIds: c?.apCreditIds,
    gradYear: c?.gradYear,
    studentName: c?.studentName,
    completedTerms: c?.completedTerms as AppState['completedTerms'],
    // Only an explicit choice is saved; otherwise the class default applies.
    curriculumMode: c?.curriculumMode,
    planCurriculumMode: p?.meta.curriculumMode,
    viperMods: extras.viperMods,
    distributionTargets: extras.distributionTargets,
    userPlan: p ? { semesters: p.semesters as Record<string, PlannedCourse[]> } : null,
    userPlanFulfillments: p?.fulfillments,
    userColorOverrides: extras.colorOverrides,
  }
}

interface BootState {
  config: PlanConfig | null
  plan: Plan | null
  viperMods: Record<string, boolean>
  distributionTargets: DistributionTargets
  /** Course key → user-picked accent color (the "my Chem cluster" mental map). */
  colorOverrides: Record<string, string>
  fromShareLink: boolean
  library: PlanLibrary
  /** The saved plan being edited; null while viewing a share link or before the first setup. */
  activeId: string | null
}

/** Everything one saved plan restores. */
function hydrate(state: AppState | null) {
  const config = state ? configFromState(state) : null
  const plan = state ? planFromAppState(state) : null
  return {
    config,
    plan: plan ?? (config ? seedPlan(config) : null),
    viperMods: state?.viperMods ?? { ...DEFAULT_VIPER_MODS },
    distributionTargets: state?.distributionTargets ?? { N: 12, SS: 5, H: 3 },
    colorOverrides: state?.userColorOverrides ?? {},
  }
}

function boot(): BootState {
  const library = loadLibrary()
  // A share link opens as an unsaved view: it never overwrites a saved plan
  // (2026-11). The first edit saves it as a new plan in the library.
  const shared = readShareLinkState()
  const state = shared ?? activePlan(library)?.state ?? null
  return {
    ...hydrate(state),
    fromShareLink: !!shared,
    library,
    activeId: shared ? null : library.activeId,
  }
}

/** Drop the share-link fragment so a reload opens the saved plan, not the link. */
function clearShareFragment() {
  try {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    /* not in a browser */
  }
}

/** A saved plan as the plan menu lists it. */
export interface PlanListing {
  id: string
  name: string
  updatedAt: string
  combo: string
}

export interface PlanStore {
  config: PlanConfig | null
  plan: Plan | null
  augmented: AugmentedPlan | null
  fromShareLink: boolean
  viperMods: Record<string, boolean>
  distributionTargets: DistributionTargets
  setViperMods: (mods: Record<string, boolean>) => void
  setDistributionTargets: (t: DistributionTargets) => void
  colorOverrides: Record<string, string>
  setCourseColor: (courseKey: string, color: string | null) => void
  /** Pick majors → seed the starting plan (confirmed policy unless an admin passes a proposal). */
  setup: (config: PlanConfig, policy?: SeedPolicy) => boolean
  /** Admin only: audit (and seed) under the sandbox proposal instead of confirmed policy. */
  auditPolicy: AuditPolicy
  setAuditPolicy: (p: AuditPolicy) => void
  /** Discard edits, re-seed from the major template (confirm first in UI). */
  resetToTemplate: () => void
  apply: (mutation: Mutation) => MutationResult
  /** Several mutations as one edit (one undo step); all or nothing. */
  applyAll: (mutations: readonly Mutation[]) => MutationResult
  undo: () => boolean
  canUndo: boolean
  shareLink: () => string
  exportJson: () => void
  exportCsv: () => void
  /** The exact surface the LLM tools execute against. */
  toolContext: PlanToolContext
  importStateText: (text: string) => boolean
  // ---- Plan library (2026-11): several saved plans, one active ----
  plans: PlanListing[]
  activePlanId: string | null
  /** Viewing a share link that is not saved yet. */
  viewingShared: boolean
  /** The last write to this browser's storage failed (private mode, full, blocked). */
  saveFailed: boolean
  switchPlan: (id: string) => void
  /** Seed a new plan from a fresh setup and make it active (the current one is kept). */
  createPlan: (config: PlanConfig, policy?: SeedPolicy) => boolean
  duplicatePlan: (id: string) => void
  renamePlan: (id: string, name: string) => void
  /** Delete a saved plan; returns an undo. */
  deletePlan: (id: string) => (() => void) | null
  /** Keep the share link being viewed as a new saved plan. */
  saveSharedPlan: () => void
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function usePlanStore(): PlanStore {
  const [initial] = useState(boot)
  const [config, setConfig] = useState<PlanConfig | null>(initial.config)
  const [plan, setPlan] = useState<Plan | null>(initial.plan)
  const [viperMods, setViperMods] = useState(initial.viperMods)
  const [distributionTargets, setDistributionTargets] = useState(initial.distributionTargets)
  const [colorOverrides, setColorOverrides] = useState(initial.colorOverrides)
  const undoStack = useRef<Plan[]>([])
  const [undoSize, setUndoSize] = useState(0)
  const [library, setLibrary] = useState<PlanLibrary>(initial.library)
  const [activeId, setActiveId] = useState<string | null>(initial.activeId)
  const libraryRef = useRef(library)
  const bootPlan = useRef(initial.plan)
  /** True while the unsaved share-link view is on screen. */
  const sharedView = useRef(initial.fromShareLink)
  const [viewingShared, setViewingShared] = useState(initial.fromShareLink)

  // Refs so the stable toolContext always reads current state (the chat
  // loop holds it across awaits). Synced after commit, never during render.
  const planRef = useRef(plan)
  const configRef = useRef(config)
  useEffect(() => {
    planRef.current = plan
    configRef.current = config
  }, [plan, config])

  const toAppState = useCallback(
    (): AppState => appStateOf(configRef.current, planRef.current, { viperMods, distributionTargets, colorOverrides }),
    [viperMods, distributionTargets, colorOverrides],
  )

  // Plans this tab deleted, so a merge with another tab's write doesn't bring them back.
  const deletedHere = useRef(new Set<string>())
  const [saveFailed, setSaveFailed] = useState(false)

  /**
   * Commit a library change: state, ref and storage together. Merged with
   * whatever another open tab stored since, so neither tab erases the
   * other's plans (2026-11-12).
   */
  const commitLibrary = useCallback((next: PlanLibrary) => {
    const stored = readStoredLibrary()
    const merged = stored ? mergeLibraries(next, stored, deletedHere.current) : next
    libraryRef.current = merged
    setSaveFailed(!saveLibrary(merged))
    setLibrary(merged)
  }, [])

  // Another tab saved: pick up its plans (list, names) without touching the
  // plan open here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LIBRARY_KEY) return
      const stored = readStoredLibrary(e.newValue)
      if (!stored) return
      const merged = mergeLibraries(libraryRef.current, stored, deletedHere.current)
      libraryRef.current = merged
      setLibrary(merged)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Persistence is a side effect, never a step the user waits on. The active
  // saved plan takes every edit. With no active plan: a share link stays an
  // unsaved view until it is edited, and a first setup becomes a new plan.
  useEffect(() => {
    if (!config && !plan) return
    const state = toAppState()
    const lib = libraryRef.current
    if (activeId && lib.plans.some((p) => p.id === activeId)) {
      commitLibrary(updatePlan(lib, activeId, state))
      return
    }
    if (activeId) return
    if (sharedView.current && plan === bootPlan.current) return
    const name = sharedView.current ? `Shared · ${defaultPlanName(state)}` : undefined
    const added = addPlan(lib, state, name)
    commitLibrary(added.lib)
    setActiveId(added.id)
    if (sharedView.current) {
      sharedView.current = false
      setViewingShared(false)
      clearShareFragment()
    }
  }, [config, plan, viperMods, distributionTargets, colorOverrides, toAppState, activeId, commitLibrary])

  const augmented = useMemo(
    () =>
      augmentPlan(plan, {
        sasMajorKey: config?.sasMajorKey,
        seasMajorKey: config?.seasMajorKey,
        gradYear: config?.gradYear,
        apCreditIds: config?.apCreditIds,
        curriculumMode: config ? curriculumModeOf(config) : undefined,
        viperMods,
        distributionTargets,
      }),
    [plan, config, viperMods, distributionTargets],
  )

  const snapshot = useCallback((prev: Plan) => {
    undoStack.current.push(prev)
    if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift()
    setUndoSize(undoStack.current.length)
  }, [])

  const apply = useCallback(
    (mutation: Mutation): MutationResult => {
      const current = planRef.current
      if (!current) return { ok: false, message: 'No plan yet', plan: createEmptyPlan() }
      const result = applyMutation(current, mutation)
      if (result.ok) {
        snapshot(current)
        setPlan(result.plan)
      }
      return result
    },
    [snapshot],
  )

  const applyAll = useCallback(
    (mutations: readonly Mutation[]): MutationResult => {
      const current = planRef.current
      if (!current) return { ok: false, message: 'No plan yet', plan: createEmptyPlan() }
      const result = applyMutations(current, mutations)
      if (result.ok) {
        snapshot(current)
        setPlan(result.plan)
      }
      return result
    },
    [snapshot],
  )

  const undo = useCallback((): boolean => {
    const prev = undoStack.current.pop()
    setUndoSize(undoStack.current.length)
    if (!prev) return false
    setPlan(prev)
    return true
  }, [])

  const setup = useCallback((next: PlanConfig, policy?: SeedPolicy): boolean => {
    const seeded = seedPlan(next, policy)
    if (!seeded) return false
    undoStack.current = []
    setUndoSize(0)
    setConfig(next)
    setPlan(seeded)
    return true
  }, [])

  const [auditPolicy, setAuditPolicyState] = useState<AuditPolicy>(() => {
    try {
      return localStorage.getItem(AUDIT_POLICY_KEY) === 'proposal' ? 'proposal' : 'confirmed'
    } catch {
      return 'confirmed'
    }
  })
  const setAuditPolicy = useCallback((p: AuditPolicy) => {
    setAuditPolicyState(p)
    try {
      localStorage.setItem(AUDIT_POLICY_KEY, p)
    } catch {
      /* storage unavailable — keep for this session */
    }
  }, [])

  const resetToTemplate = useCallback(() => {
    if (configRef.current) setup(configRef.current)
  }, [setup])

  const setCourseColor = useCallback((courseKey: string, color: string | null) => {
    setColorOverrides((prev) => {
      const next = { ...prev }
      if (color) next[courseKey] = color
      else delete next[courseKey]
      return next
    })
  }, [])

  const shareLink = useCallback(() => buildShareLink(toAppState()), [toAppState])

  const exportJson = useCallback(() => {
    const c = configRef.current
    download(
      planFileName(c?.sasMajorKey ?? 'plan', c?.seasMajorKey ?? '', c?.gradYear, 'json'),
      'application/json',
      serializeAppState(toAppState()),
    )
  }, [toAppState])

  const exportCsv = useCallback(() => {
    const c = configRef.current
    const aug = augmentPlan(planRef.current, {
      sasMajorKey: c?.sasMajorKey,
      seasMajorKey: c?.seasMajorKey,
      gradYear: c?.gradYear,
      apCreditIds: c?.apCreditIds,
      curriculumMode: c ? curriculumModeOf(c) : undefined,
    })
    if (!aug || !c) return
    download(
      planFileName(c.sasMajorKey, c.seasMajorKey, c.gradYear, 'csv'),
      'text/csv',
      planToCSV(aug, {
        sasMajorName: MAJORS[c.sasMajorKey]?.fullName ?? c.sasMajorKey,
        seasMajorName: MAJORS[c.seasMajorKey]?.fullName ?? c.seasMajorKey,
        gradYear: c.gradYear,
      }),
    )
  }, [])

  const importStateText = useCallback((text: string): boolean => {
    const state = parseAppState(text)
    if (!state) return false
    const nextConfig = configFromState(state)
    const nextPlan = planFromAppState(state)
    if (!nextConfig && !nextPlan) return false
    undoStack.current = []
    setUndoSize(0)
    if (nextConfig) setConfig(nextConfig)
    setPlan(nextPlan ?? (nextConfig ? seedPlan(nextConfig) : null))
    if (state.viperMods) setViperMods(state.viperMods)
    if (state.distributionTargets) setDistributionTargets(state.distributionTargets)
    if (state.userColorOverrides) setColorOverrides(state.userColorOverrides)
    return true
  }, [])

  const leaveSharedView = useCallback(() => {
    sharedView.current = false
    setViewingShared(false)
    clearShareFragment()
  }, [])

  const load = useCallback((state: AppState | null) => {
    const h = hydrate(state)
    undoStack.current = []
    setUndoSize(0)
    bootPlan.current = h.plan
    setConfig(h.config)
    setPlan(h.plan)
    setViperMods(h.viperMods)
    setDistributionTargets(h.distributionTargets)
    setColorOverrides(h.colorOverrides)
  }, [])

  const switchPlan = useCallback(
    (id: string) => {
      const lib = libraryRef.current
      const target = lib.plans.find((p) => p.id === id)
      if (!target) return
      leaveSharedView()
      commitLibrary(switchInLibrary(lib, id))
      setActiveId(id)
      load(target.state)
    },
    [commitLibrary, load, leaveSharedView],
  )

  const createPlan = useCallback(
    (next: PlanConfig, policy?: SeedPolicy): boolean => {
      const seeded = seedPlan(next, policy)
      if (!seeded) return false
      leaveSharedView()
      undoStack.current = []
      setUndoSize(0)
      // activeId null + a new plan → the save effect adds it to the library.
      setActiveId(null)
      bootPlan.current = null
      setConfig(next)
      setPlan(seeded)
      setColorOverrides({})
      return true
    },
    [leaveSharedView],
  )

  const duplicatePlan = useCallback(
    (id: string) => {
      const res = duplicateInLibrary(libraryRef.current, id)
      if (!res) return
      commitLibrary(res.lib)
      setActiveId(res.id)
      load(res.lib.plans.find((p) => p.id === res.id)?.state ?? null)
    },
    [commitLibrary, load],
  )

  const renamePlan = useCallback(
    (id: string, name: string) => commitLibrary(renameInLibrary(libraryRef.current, id, name)),
    [commitLibrary],
  )

  const deletePlan = useCallback(
    (id: string): (() => void) | null => {
      const res = deleteFromLibrary(libraryRef.current, id)
      if (!res) return null
      deletedHere.current.add(id)
      commitLibrary(res.lib)
      if (res.wasActive) {
        setActiveId(res.lib.activeId)
        load(activePlan(res.lib)?.state ?? null)
      }
      return () => {
        deletedHere.current.delete(res.removed.id)
        const back = restorePlan(libraryRef.current, res.removed, res.index, res.wasActive)
        commitLibrary(back)
        if (res.wasActive) {
          setActiveId(res.removed.id)
          load(res.removed.state)
        }
      }
    },
    [commitLibrary, load],
  )

  const saveSharedPlan = useCallback(() => {
    if (!sharedView.current || !configRef.current) return
    const state = toAppState()
    const added = addPlan(libraryRef.current, state, `Shared · ${defaultPlanName(state)}`)
    commitLibrary(added.lib)
    setActiveId(added.id)
    leaveSharedView()
  }, [toAppState, commitLibrary, leaveSharedView])

  const plans = useMemo<PlanListing[]>(
    () =>
      library.plans.map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        combo: p.state.sasMajorKey && p.state.seasMajorKey ? `${p.state.sasMajorKey} + ${p.state.seasMajorKey}` : 'not set up',
      })),
    [library],
  )

  const analyze = useCallback((p: Plan | null) => {
    const c = configRef.current
    const aug = augmentPlan(p, {
      sasMajorKey: c?.sasMajorKey,
      seasMajorKey: c?.seasMajorKey,
      gradYear: c?.gradYear,
      apCreditIds: c?.apCreditIds,
      curriculumMode: c ? curriculumModeOf(c) : undefined,
    })
    if (!aug) return { error: 'No plan yet' }
    const { summary } = aug
    return {
      summary,
      loads: aug.loads,
      warnings: [
        ...summary.unfulfilledFA.map((id) => `Foundational Approach not satisfied: ${id}`),
        ...summary.unfulfilledSec.map((id) => `Sector not satisfied: ${id}`),
        ...(summary.meetsEnergyReq
          ? []
          : [`Only ${summary.energyCoursesCount} of 3 energy courses`]),
        ...(summary.meetsDualMin ? [] : [`Total CU ${summary.totalCU} is under the dual minimum`]),
        ...summary.approvalSemesters.map((k) => `${k} load needs approval (> 6.5 CU)`),
        ...summary.exceedsMaxSemesters.map((k) => `${k} exceeds the 7.5 CU hard cap`),
      ],
    }
  }, [])

  const toolContext = useMemo<PlanToolContext>(
    () => ({
      getPlan: () => planRef.current ?? createEmptyPlan(),
      getRequirements: () => {
        const a = analyze(planRef.current)
        if ('error' in a) return a
        const { summary } = a
        return {
          fa: { fulfilled: summary.fulfilledFA, unfulfilled: summary.unfulfilledFA, all: FA_REQUIREMENTS },
          sectors: { fulfilled: summary.fulfilledSec, unfulfilled: summary.unfulfilledSec, all: SECTORS },
          energy: { count: summary.energyCoursesCount, required: 3 },
          totalCU: summary.totalCU,
          doubleCounted: summary.doubleCountedCodes,
        }
      },
      getCourseInfo: (code: string) => {
        const normalized = code.toUpperCase()
        const entry = lookupCourse(normalized)
        if (!entry) return null
        return { code: normalized, ...entry, pcrUrl: pcrUrlFor({ code: normalized }) }
      },
      analyzePlan: () => analyze(planRef.current),
      simulateChange: (mutations: Mutation[]) => {
        const current = planRef.current
        if (!current) return { error: 'No plan yet' }
        const result = applyMutations(current, mutations)
        if (!result.ok) return { ok: false, message: result.message }
        return { ok: true, message: result.message, analysis: analyze(result.plan) }
      },
      applyMutation: apply,
    }),
    [analyze, apply],
  )

  return {
    config,
    plan,
    augmented,
    fromShareLink: initial.fromShareLink,
    viperMods,
    distributionTargets,
    setViperMods,
    setDistributionTargets,
    colorOverrides,
    setCourseColor,
    setup,
    auditPolicy,
    setAuditPolicy,
    resetToTemplate,
    apply,
    applyAll,
    undo,
    canUndo: undoSize > 0,
    shareLink,
    exportJson,
    exportCsv,
    toolContext,
    importStateText,
    plans,
    activePlanId: activeId,
    viewingShared,
    saveFailed,
    switchPlan,
    createPlan,
    duplicatePlan,
    renamePlan,
    deletePlan,
    saveSharedPlan,
  }
}
