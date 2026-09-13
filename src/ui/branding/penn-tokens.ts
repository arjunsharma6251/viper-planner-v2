/**
 * Penn brand tokens. Single source of truth for brand values used in TS
 * (charts, inline SVG, canvas). Tailwind utilities pull the same values
 * from the @theme block in src/index.css — keep the two in sync.
 */
export const PENN_RED = '#990000' // PMS 201 — problem status and key callouts only
export const PENN_BLUE = '#011F5B' // PMS 288 — the BA bus and the primary control
export const SHEET = '#FAF9F6' // the drawing ground, off-white
export const INK = '#1A1A1A' // all text, and the BSE bus
export const RULE = '#D9D6CF' // hairlines that rule every region
export const ENERGY = '#B8860B' // the Energy bus (VIPER concentration)

export const FONT_COND = "'Barlow Semi Condensed', 'Barlow', system-ui, sans-serif"
export const FONT_SANS = "'Barlow', system-ui, sans-serif"
export const FONT_MONO = "'Red Hat Mono', ui-monospace, monospace"

/** Status colors — green = good, amber = caution, Penn red = problem. Never re-purpose. */
export const STATUS_GOOD = '#1e7e34'
export const STATUS_CAUTION = '#b45309'
export const STATUS_PROBLEM = PENN_RED
