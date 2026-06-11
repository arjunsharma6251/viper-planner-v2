import Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic API client for the chat sidekick. Two modes:
 *
 * - PROXY (production / pilot): VITE_LLM_PROXY=1 at build time routes all
 *   calls through /api/anthropic (Vercel edge function), which injects the
 *   real key server-side. Students never see or paste a key.
 * - DIRECT (local dev): the maintainer pastes a key into the chat panel;
 *   it lives in this browser's localStorage only.
 */
const API_KEY_STORAGE = 'viper-planner:anthropic-key'

export const CHAT_MODEL = 'claude-sonnet-4-6'

export const USES_PROXY = import.meta.env.VITE_LLM_PROXY === '1'

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE)
  } catch {
    return null
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE, key)
  } catch {
    // localStorage unavailable — chat will ask again next session
  }
}

/** True when the chat can talk to the API without asking for a key. */
export function chatIsReady(): boolean {
  return USES_PROXY || !!getStoredApiKey()
}

export function createClient(): Anthropic | null {
  if (USES_PROXY) {
    return new Anthropic({
      apiKey: 'proxy', // placeholder; the edge function injects the real key
      baseURL: `${window.location.origin}/api/anthropic`,
      dangerouslyAllowBrowser: true,
    })
  }
  const apiKey = getStoredApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}
