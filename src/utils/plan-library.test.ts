import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LIBRARY_KEY, addPlan, defaultPlanName, deletePlan, duplicatePlan, emptyLibrary, loadLibrary, renamePlan, restorePlan, saveLibrary, switchPlan, updatePlan,
} from './plan-library'
import { STORAGE_KEYS } from './storage'
import type { AppState } from '../plan/serialize'

const chemCbe: AppState = { sasMajorKey: 'CHEM', seasMajorKey: 'CBE', gradYear: 2028, userPlan: { semesters: { 'fall-y1': [] } } }
const physEse: AppState = { sasMajorKey: 'PHYS', seasMajorKey: 'ESE', gradYear: 2028, userPlan: { semesters: {} } }

function memoryStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  }
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
afterEach(() => vi.unstubAllGlobals())

describe('plan library', () => {
  it('names plans by combination and keeps names unique', () => {
    expect(defaultPlanName(chemCbe)).toBe('CHEM + CBE')
    expect(defaultPlanName({ ...chemCbe, studentName: 'Max' })).toBe('Max · CHEM + CBE')
    let lib = addPlan(emptyLibrary(), chemCbe).lib
    lib = addPlan(lib, chemCbe).lib
    expect(lib.plans.map((p) => p.name)).toEqual(['CHEM + CBE', 'CHEM + CBE (2)'])
  })

  it('duplicates a plan as an independent copy and switches to it', () => {
    const a = addPlan(emptyLibrary(), chemCbe)
    const d = duplicatePlan(a.lib, a.id)!
    expect(d.lib.activeId).toBe(d.id)
    expect(d.lib.plans[1]!.name).toBe('CHEM + CBE (copy)')
    const edited = updatePlan(d.lib, d.id, { ...chemCbe, studentName: 'changed' })
    expect(edited.plans[0]!.state.studentName).toBeUndefined()
  })

  it('keeps each plan with its own setup (several combinations side by side)', () => {
    let lib = addPlan(emptyLibrary(), chemCbe).lib
    const second = addPlan(lib, physEse)
    lib = switchPlan(second.lib, lib.plans[0]!.id)
    expect(lib.plans.map((p) => `${p.state.sasMajorKey}+${p.state.seasMajorKey}`)).toEqual(['CHEM+CBE', 'PHYS+ESE'])
    expect(lib.activeId).toBe(lib.plans[0]!.id)
  })

  it('renames, deletes and restores with undo', () => {
    const a = addPlan(emptyLibrary(), chemCbe)
    const b = addPlan(a.lib, physEse)
    const renamed = renamePlan(b.lib, a.id, '  Plan A  ')
    expect(renamed.plans[0]!.name).toBe('Plan A')
    expect(renamePlan(renamed, a.id, '   ')).toBe(renamed)
    const del = deletePlan(renamed, b.id)!
    expect(del.wasActive).toBe(true)
    expect(del.lib.activeId).toBe(a.id)
    const back = restorePlan(del.lib, del.removed, del.index, del.wasActive)
    expect(back.plans.map((p) => p.id)).toEqual([a.id, b.id])
    expect(back.activeId).toBe(b.id)
  })

  it('migrates the existing single saved plan once and leaves the old key alone', () => {
    localStorage.setItem(STORAGE_KEYS.appState, JSON.stringify(chemCbe))
    const lib = loadLibrary()
    expect(lib.plans).toHaveLength(1)
    expect(lib.activeId).toBe(lib.plans[0]!.id)
    expect(lib.plans[0]!.state.sasMajorKey).toBe('CHEM')
    expect(localStorage.getItem(STORAGE_KEYS.appState)).not.toBeNull()
    expect(loadLibrary().plans).toHaveLength(1) // not migrated twice
  })

  it('survives a corrupt library and an empty browser', () => {
    expect(loadLibrary()).toEqual(emptyLibrary())
    localStorage.setItem(LIBRARY_KEY, '{nope')
    expect(loadLibrary().plans).toEqual([])
    const lib = addPlan(emptyLibrary(), chemCbe).lib
    expect(saveLibrary(lib)).toBe(true)
    expect(loadLibrary()).toEqual(lib)
  })
})
