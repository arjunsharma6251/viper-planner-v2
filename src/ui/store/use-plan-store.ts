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
import { loadAppState, saveAppState } from '../../utils/storage'
import { buildPlan } from '../../scheduler/build-plan'
import { lookupCourse } from '../../data/courses'
import { MAJORS } from '../../data/majors'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { pcrUrlFor } from '../../utils/pcr'
import { DEFAULT_VIPER_MODS } from '../../ncc/mods'
import type { PlanToolContext } from '../../llm/tools'

export interface PlanConfig {
  sasMajorKey: string
  sasConcKey: string | null
  seasMajorKey: string
  seasConcKey: string | null
  apCreditIds: string[]
  gradYear: number | null
}

const UNDO_LIMIT = 50

/** Seed a user-owned Plan from the scheduler (runs ONCE — principle #2). */
export function seedPlan(config: PlanConfig): Plan | null {
  const built = buildPlan({
    sasMajorKey: config.sasMajorKey,
    sasConcKey: config.sasConcKey,
    seasMajorKey: config.seasMajorKey,
    seasConcKey: config.seasConcKey,
    apCreditIds: config.apCreditIds,
    gradYear: config.gradYear,
    shiftForward: true,
    genedDistribution: 'frontload',
  })
  if (!built) return null
  const plan = createEmptyPlan({
    sasMajor: config.sasMajorKey,
    sasConc: config.sasConcKey ?? undefined,
    seasMajor: config.seasMajorKey,
    seasConc: config.seasConcKey ?? undefined,
    gradYear: config.gradYear,
  })
  // The user plan keeps only what the user can edit; loads/placement re-derive.
  plan.semesters = built.semesters as unknown as Plan['semesters']
  for (const [code, where] of Object.entries(built.placement)) {
    if (where === 'credit') plan.placement[code] = 'credit'
  }
  return recomputeDerived(plan)
}

function configFromState(state: AppState): PlanConfig | null {
  if (!state.sasMajorKey || !state.seasMajorKey) return null
  return {
    sasMajorKey: state.sasMajorKey,
    sasConcKey: state.sasConcKey ?? null,
    seasMajorKey: state.seasMajorKey,
    seasConcKey: state.seasConcKey ?? null,
    apCreditIds: state.apCreditIds ?? [],
    gradYear: state.gradYear ?? null,
  }
}

interface BootState {
  config: PlanConfig | null
  plan: Plan | null
  viperMods: Record<string, boolean>
  distributionTargets: DistributionTargets
  fromShareLink: boolean
}

function boot(): BootState {
  const shared = readShareLinkState()
  const state = shared ?? loadAppState()
  const config = state ? configFromState(state) : null
  const plan = state ? planFromAppState(state) : null
  return {
    config,
    plan: plan ?? (config ? seedPlan(config) : null),
    viperMods: state?.viperMods ?? { ...DEFAULT_VIPER_MODS },
    distributionTargets: state?.distributionTargets ?? { N: 12, SS: 5, H: 3 },
    fromShareLink: !!shared,
  }
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
  /** Pick majors → scheduler seeds the starting plan. */
  setup: (config: PlanConfig) => boolean
  /** Discard edits, re-seed from the major template (confirm first in UI). */
  resetToTemplate: () => void
  apply: (mutation: Mutation) => MutationResult
  undo: () => boolean
  canUndo: boolean
  shareLink: () => string
  exportJson: () => void
  exportCsv: () => void
  /** The exact surface the LLM tools execute against. */
  toolContext: PlanToolContext
  importStateText: (text: string) => boolean
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
  const undoStack = useRef<Plan[]>([])
  const [undoSize, setUndoSize] = useState(0)

  // Refs so the stable toolContext always reads current state (the chat
  // loop holds it across awaits).
  const planRef = useRef(plan)
  planRef.current = plan
  const configRef = useRef(config)
  configRef.current = config

  const toAppState = useCallback((): AppState => {
    const c = configRef.current
    const p = planRef.current
    return {
      sasMajorKey: c?.sasMajorKey,
      sasConcKey: c?.sasConcKey ?? undefined,
      seasMajorKey: c?.seasMajorKey,
      seasConcKey: c?.seasConcKey ?? undefined,
      apCreditIds: c?.apCreditIds,
      gradYear: c?.gradYear,
      viperMods,
      distributionTargets,
      userPlan: p ? { semesters: p.semesters as Record<string, PlannedCourse[]> } : null,
      userPlanFulfillments: p?.fulfillments,
    }
  }, [viperMods, distributionTargets])

  // Persistence is a side effect, never a step the user waits on.
  useEffect(() => {
    if (config || plan) saveAppState(toAppState())
  }, [config, plan, viperMods, distributionTargets, toAppState])

  const augmented = useMemo(
    () =>
      augmentPlan(plan, {
        sasMajorKey: config?.sasMajorKey,
        seasMajorKey: config?.seasMajorKey,
        gradYear: config?.gradYear,
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

  const undo = useCallback((): boolean => {
    const prev = undoStack.current.pop()
    setUndoSize(undoStack.current.length)
    if (!prev) return false
    setPlan(prev)
    return true
  }, [])

  const setup = useCallback((next: PlanConfig): boolean => {
    const seeded = seedPlan(next)
    if (!seeded) return false
    undoStack.current = []
    setUndoSize(0)
    setConfig(next)
    setPlan(seeded)
    return true
  }, [])

  const resetToTemplate = useCallback(() => {
    if (configRef.current) setup(configRef.current)
  }, [setup])

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
    return true
  }, [])

  const analyze = useCallback((p: Plan | null) => {
    const c = configRef.current
    const aug = augmentPlan(p, {
      sasMajorKey: c?.sasMajorKey,
      seasMajorKey: c?.seasMajorKey,
      gradYear: c?.gradYear,
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
    setup,
    resetToTemplate,
    apply,
    undo,
    canUndo: undoSize > 0,
    shareLink,
    exportJson,
    exportCsv,
    toolContext,
    importStateText,
  }
}
