// localStorage wrappers with graceful failure: every call is try/catch'd and
// NEVER throws (private browsing, quota, disabled storage, SSR/test
// environments without a localStorage global at all).
//
// Persistence is a side effect, not a feature the user waits on (CLAUDE.md
// "optimistic updates everywhere") — the plan in memory is the truth, so a
// failed write just means the next visit starts from the seed/share link.
//
// Key naming: the OLD app had NO localStorage persistence (verified — its
// only state carriers were the share-link hash and JSON export), so there are
// no legacy keys to migrate. These keys are new with this build: prefixed
// `viper-planner:` to match the existing mode key (src/utils/mode.ts), and
// versioned `v8` to match the AppState JSON shape the old app stamped on its
// exports — future migrations key off the same number.

import { parseAppState, APP_STATE_VERSION, type AppState } from '../plan/serialize'

export const STORAGE_KEYS = {
  /** Full AppState snapshot (same v8 shape as JSON export / share link). */
  appState: 'viper-planner:state:v8',
} as const

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    // Accessing the global itself can throw (e.g. sandboxed iframes).
    return null
  }
}

/** Read a raw string. Returns null when unavailable/missing — never throws. */
export function safeGetItem(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Write a raw string. Returns false on failure — never throws. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    const s = storage()
    if (!s) return false
    s.setItem(key, value)
    return true
  } catch {
    // Quota exceeded / private mode — the edit already applied in memory.
    return false
  }
}

/** Remove a key. Returns false on failure — never throws. */
export function safeRemoveItem(key: string): boolean {
  try {
    const s = storage()
    if (!s) return false
    s.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** Load the persisted app state, or null if absent/corrupt/unavailable. */
export function loadAppState(): AppState | null {
  const raw = safeGetItem(STORAGE_KEYS.appState)
  if (raw === null) return null
  return parseAppState(raw)
}

/** Persist the app state (compact JSON, version-stamped). */
export function saveAppState(state: AppState): boolean {
  try {
    const payload: AppState = { ...state, version: APP_STATE_VERSION }
    return safeSetItem(STORAGE_KEYS.appState, JSON.stringify(payload))
  } catch {
    // JSON.stringify can throw on circular structures — never propagate.
    return false
  }
}

/** Clear the persisted app state (used by "Reset to template"). */
export function clearAppState(): boolean {
  return safeRemoveItem(STORAGE_KEYS.appState)
}
