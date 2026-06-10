const MODE_KEY = 'viper-planner:mode'

/**
 * Admin mode is gated by `?mode=admin` and persisted to localStorage.
 * `?mode=student` explicitly reverts to student mode. No password —
 * a client-side gate is security theater, this is just de-cluttering.
 */
export function isAdminMode(): boolean {
  const param = new URLSearchParams(window.location.search).get('mode')
  if (param === 'admin') {
    safeSet(MODE_KEY, 'admin')
    return true
  }
  if (param === 'student') {
    safeSet(MODE_KEY, 'student')
    return false
  }
  return safeGet(MODE_KEY) === 'admin'
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage unavailable (private mode etc.) — mode just won't persist
  }
}
