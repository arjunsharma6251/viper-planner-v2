// URL-fragment share-link encoding/decoding.
//
// The share link is the killer feature (CLAUDE.md non-negotiable #6): it
// contains the ENTIRE app state, not a pointer — open the link, see the exact
// plan, no fetch, no auth.
//
// Wire format must stay byte-compatible with the old app's copyShareLink /
// hash-load effect (references/old-app/index.html ~5169-5232) so links
// already sent to Michelle and classmates keep working:
//
//   encode: location.hash = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
//   decode: JSON.parse(decodeURIComponent(escape(atob(hash))))
//
// i.e. base64 of the UTF-8 bytes of the state JSON. The deprecated
// escape/unescape pair is exactly how the old app round-tripped UTF-8 through
// btoa/atob — keep it, byte-for-byte compatibility is the whole point.

import { parseAppState, type AppState } from '../plan/serialize'

/** Encode app state into the URL-fragment payload (no leading '#'). */
export function encodeShareState(state: AppState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))))
}

/**
 * Decode a share-link fragment (with or without the leading '#').
 * Returns null for empty/corrupt fragments — never throws, matching the old
 * app's silent `catch {}` on malformed hashes.
 */
export function decodeShareState(fragment: string): AppState | null {
  const hash = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!hash) return null
  try {
    return parseAppState(decodeURIComponent(escape(atob(hash))))
  } catch {
    return null
  }
}

/**
 * Build the full shareable URL. Defaults to the current page so the link
 * opens the same deployment that produced it.
 */
export function buildShareLink(state: AppState, baseUrl?: string): string {
  const base =
    baseUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '')
  return `${base}#${encodeShareState(state)}`
}

/** Read app state from the current location's hash (load-on-mount path). */
export function readShareLinkState(): AppState | null {
  if (typeof window === 'undefined') return null
  return decodeShareState(window.location.hash)
}
