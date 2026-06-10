import Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic API client for the chat sidekick.
 *
 * Pilot-phase wiring: the key comes from localStorage (maintainer pastes it
 * in via the chat settings) and calls go straight from the browser.
 * BEFORE PILOT LAUNCH this must move behind a thin Vercel edge-function
 * proxy so the key is never shipped or stored client-side — see CLAUDE.md
 * "LLM costs". The proxy swap only changes this file.
 */
const API_KEY_STORAGE = 'viper-planner:anthropic-key'

export const CHAT_MODEL = 'claude-sonnet-4-6'

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

export function createClient(): Anthropic | null {
  const apiKey = getStoredApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}
