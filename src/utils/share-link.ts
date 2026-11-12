// URL-fragment share-link encoding/decoding.
//
// The share link is the killer feature (CLAUDE.md non-negotiable #6): it
// contains the ENTIRE app state, not a pointer — open the link, see the exact
// plan, no fetch, no auth.
//
// Two wire formats:
//
// v1 (the old app's, references/old-app/index.html ~5169-5232), still read
// so links already sent to Michelle and classmates keep working:
//
//   encode: btoa(unescape(encodeURIComponent(JSON.stringify(state))))
//   decode: JSON.parse(decodeURIComponent(escape(atob(hash))))
//
// i.e. base64 of the UTF-8 bytes of the state JSON (~20k characters for a
// full plan). Always starts with "ey" (base64 of '{"').
//
// v2 (2026-11-12, "make link shorter"): "z." + base64url(deflate-raw(JSON of
// the slimmed state)). Slimming drops each course field that equals the
// catalog's value for that code (title, CU, offering, prereqs, …) and
// restores it from the catalog on open; a field the course lacked but the
// catalog has is listed in `_u` so the round trip is exact. ~2.7k
// characters for the same plan. The "." can't occur in base64, so the two
// formats never collide. Compression is synchronous (fflate) because the
// link is decoded during the first render.

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { courseEntry, lookupCourse } from '../data/courses'
import type { PlannedCourse } from '../plan/types'
import { parseAppState, type AppState } from '../plan/serialize'

const V2_PREFIX = 'z.'

// ---- v1 ----

/** The old app's encoding (base64 of the UTF-8 JSON). Kept for tests and fallback. */
export function encodeShareStateV1(state: AppState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))))
}

function decodeV1(hash: string): AppState | null {
  return parseAppState(decodeURIComponent(escape(atob(hash))))
}

// ---- slimming ----

type Loose = Record<string, unknown>
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function slimCourse(course: PlannedCourse): Loose {
  const c = course as unknown as Loose
  if (typeof c.code !== 'string' || !lookupCourse(c.code)) return { ...c }
  const ref = courseEntry(c.code) as unknown as Loose
  const out: Loose = {}
  const unset: string[] = []
  for (const [k, v] of Object.entries(c)) {
    if (k !== 'code' && k in ref && same(v, ref[k])) continue
    out[k] = v
  }
  for (const k of Object.keys(ref)) if (!(k in c)) unset.push(k)
  if (unset.length) out._u = unset
  return out
}

function fattenCourse(slim: Loose): PlannedCourse {
  const code = slim.code
  if (typeof code !== 'string' || !lookupCourse(code)) return slim as unknown as PlannedCourse
  const ref = courseEntry(code) as unknown as Loose
  const unset = new Set(Array.isArray(slim._u) ? (slim._u as string[]) : [])
  const out: Loose = {}
  for (const [k, v] of Object.entries(ref)) if (!unset.has(k)) out[k] = v
  for (const [k, v] of Object.entries(slim)) if (k !== '_u') out[k] = v
  return out as unknown as PlannedCourse
}

function mapCourses(state: AppState, fn: (c: never) => unknown): AppState {
  const semesters = state.userPlan?.semesters
  if (!semesters) return state
  const next: Record<string, unknown[]> = {}
  for (const [k, list] of Object.entries(semesters)) next[k] = Array.isArray(list) ? list.map((c) => fn(c as never)) : []
  return { ...state, userPlan: { ...state.userPlan, semesters: next as never } }
}

// ---- base64url ----

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---- public API ----

/** Encode app state into the URL-fragment payload (no leading '#'), v2. */
export function encodeShareState(state: AppState): string {
  const { exportedAt: _drop, ...rest } = state
  void _drop
  const slim = mapCourses(rest, slimCourse)
  return V2_PREFIX + toBase64Url(deflateSync(strToU8(JSON.stringify(slim)), { level: 9 }))
}

/**
 * Decode a share-link fragment (with or without the leading '#'), either
 * format. Returns null for empty/corrupt fragments — never throws, matching
 * the old app's silent `catch {}` on malformed hashes.
 */
export function decodeShareState(fragment: string): AppState | null {
  const hash = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!hash) return null
  try {
    if (hash.startsWith(V2_PREFIX)) {
      const parsed = parseAppState(strFromU8(inflateSync(fromBase64Url(hash.slice(V2_PREFIX.length)))))
      return parsed ? mapCourses(parsed, fattenCourse) : null
    }
    return decodeV1(hash)
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
