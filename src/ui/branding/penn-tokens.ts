/**
 * Penn brand tokens. Single source of truth for brand values used in TS
 * (charts, inline SVG, canvas). Tailwind utilities pull the same values
 * from the @theme block in src/index.css — keep the two in sync.
 */
export const PENN_RED = '#990000' // PMS 201 — accents, warnings, key data only
export const PENN_BLUE = '#011F5B' // PMS 288 — primary actionable color
export const CREAM = '#FAF8F4' // app background, off-white
export const INK = '#1A1A1A' // body text, near-black
export const HAIRLINE = '#E8E4DC' // borders that almost disappear

export const FONT_DISPLAY = "'Fraunces', Georgia, serif"
export const FONT_SANS = "'Inter', system-ui, sans-serif"
export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"

/** Status colors — green = good, gold = caution, Penn red = problem. Never re-purpose. */
export const STATUS_GOOD = '#1e7e34'
export const STATUS_CAUTION = '#b8860b'
export const STATUS_PROBLEM = PENN_RED
