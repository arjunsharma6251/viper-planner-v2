/**
 * Penn brand tokens. Single source of truth for brand values used in TS
 * (charts, inline SVG, canvas). Tailwind utilities pull the same values
 * from the @theme block in src/index.css — keep the two in sync.
 */
export const PENN_RED = '#990000' // PMS 201 — problem status and key callouts only
export const PENN_BLUE = '#011F5B' // PMS 288 — the BA bus and the primary control
export const SHEET = '#FAFAF8' // the drawing ground, off-white
export const INK = '#1B2130' // all text (a Penn-Blue-tinted black), and the BSE bus
export const RULE = '#DCDDE2' // hairlines that rule every region
export const ENERGY = '#B8860B' // the Energy bus (VIPER concentration)

// Penn web identity: EB Garamond primary, Roboto secondary.
export const FONT_SERIF = "'EB Garamond', Garamond, 'Times New Roman', serif"
export const FONT_SANS = "'Roboto', system-ui, sans-serif"
/** Labels and controls (historical name: this was the condensed face). */
export const FONT_COND = FONT_SANS
export const FONT_MONO = "'Roboto Mono', ui-monospace, monospace"

/** Status colors — green = good, amber = caution, Penn red = problem. Never re-purpose. */
export const STATUS_GOOD = '#1e7e34'
export const STATUS_CAUTION = '#b45309'
export const STATUS_PROBLEM = PENN_RED
