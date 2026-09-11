// ============================================================================
// VIPER MODIFICATIONS — Granular flags for the curriculum-committee sandbox.
// Each flag represents one specific modification to the standard NCC. Toggling
// them individually lets users find the minimum set needed to keep the dual
// degree completable — and shows the committee which asks are essential vs.
// negotiable.
//
// Ported verbatim from references/old-app/index.html (~lines 3684–3861).
// ============================================================================

import type { ModDefinition, ModPreset, ViperModKey, ViperMods, ViperModsInput } from './types'

/**
 * What is actually approved today (Arjun, 2026-09-11): VIPR 1200/1210 count
 * as the First-Year Seminar. Every other modification is a proposal that
 * needs committee approval. Student-facing audits use THIS set; the admin
 * sandbox starts from DEFAULT_VIPER_MODS (the current proposal) and toggles.
 */
export const CONFIRMED_VIPER_MODS: ViperMods = {
  fysWaiver: true,
  keyWaiver: false,
  langWaiver: false,
  pdWaiver: false,
  kiteFullWaiver: false,
  viprKiteWaiver: false,
  kiteLabWaiver: false,
  summerFoundation: false,
  doubleCountVIPR1300: false,
  doubleCountKite: false,
  doubleCountWriting: false,
  seasHumanitiesKite: false,
  aandsCUWaiver: false,
}

export const DEFAULT_VIPER_MODS: ViperMods = {
  // — Foundation waivers via VIPR courses —
  fysWaiver:          true,   // VIPR 1200 satisfies First-Year Seminar
  keyWaiver:          false,  // [Walking back] May meeting: VIPR 1210 → Key under reconsideration

  // — Full Foundation waivers —
  langWaiver:         true,   // Language Foundation waivable (0 CU)
  pdWaiver:           false,  // [Proposed] VIPR 1300 satisfies Perspectives & Difference
  kiteFullWaiver:     false,  // [Proposed] Kite entirely waivable (aggressive)
  viprKiteWaiver:     false,  // [New idea] VIPR 1300 partially satisfies Kite (community + reflection arc)

  // — Course modifications (keep course, reduce load) —
  kiteLabWaiver:      true,   // Kite 3-hr lab waived/async/summer
  summerFoundation:   false,  // [Legacy] Foundation may be completed in summer — now placement-based, see SUMMER_KEYS detection

  // — Double-counting rules —
  doubleCountVIPR1300: true,  // 2.5 CU of VIPR 1300 → SS distribution
  doubleCountKite:     true,  // Kite → H distribution (also Foundation)
  doubleCountWriting:  true,  // Writing → H distribution (also Foundation)

  // — SEAS attribute —
  seasHumanitiesKite: true,   // Kite gets SEAS Humanities attribute

  // — CU waivers —
  aandsCUWaiver:      true,   // Up to 3 A&S CUs waivable on audit
}

// Metadata for each modification — description + committee ask difficulty.
// Ask ratings reflect how invasive the modification is to the standard College
// curriculum: 'low' = routine accommodation, 'medium' = needs justification,
// 'high' = waives a politically significant requirement.
export const MOD_DEFINITIONS: Record<ViperModKey, ModDefinition> = {
  fysWaiver: {
    label: 'FYS satisfied by VIPR 1200 + VIPR 1210',
    desc: 'Both half-credit VIPR seminars together fulfill First-Year Seminar.',
    category: 'Foundation waivers',
    ask: 'confirmed',
    proposed: true,
    saves: 1,
  },
  keyWaiver: {
    label: 'Key satisfied by VIPR 1200 + VIPR 1210',
    desc: 'Proposed: half-credit VIPR seminars together fulfill Key. (VIPR 1200/1210 classified as Natural Sciences for distribution — does not help SS/H targets.) Status under reconsideration as of May meeting.',
    category: 'Foundation waivers',
    ask: 'medium',
    proposed: true,
    saves: 1,
  },
  langWaiver: {
    label: 'Language waivable',
    desc: 'If curriculum cannot fit in 4 years, language requirement waived.',
    category: 'Foundation waivers',
    ask: 'high',
    proposed: true,
    saves: 1,
  },
  pdWaiver: {
    label: 'P&D satisfied by VIPR 1300',
    desc: "[New] VIPR 1300's 5-semester arc engages diversity of perspectives across energy research, policy, and ethics.",
    category: 'Foundation waivers',
    ask: 'high',
    proposed: false,
    saves: 1,
  },
  viprKiteWaiver: {
    label: 'Kite satisfied by VIPR 1300',
    desc: "[New] Argue VIPR 1300 community + reflection seminar fulfills Kite's humanities-engagement intent. Tighter ask than full Kite waiver.",
    category: 'Foundation waivers',
    ask: 'high',
    proposed: false,
    saves: 1,
  },
  kiteFullWaiver: {
    label: 'Kite entirely waivable',
    desc: '[Proposed] Waive Kite entirely — aggressive, unlikely to pass committee.',
    category: 'Foundation waivers',
    ask: 'high',
    proposed: false,
    saves: 1,
  },
  kiteLabWaiver: {
    label: 'Lab components async or summer',
    desc: 'Kite (and Key, if not waived by VIPR) lab components completable async or in a summer term.',
    category: 'Course modifications',
    ask: 'medium',
    proposed: true,
    saves: 0, // doesn't reduce course count, just redistributes load
  },
  summerFoundation: {
    label: 'Foundation completable over summer',
    desc: '[New] One Foundation course (e.g. Kite, P&D, Language) may be taken in a non-billable summer term.',
    category: 'Course modifications',
    ask: 'medium',
    proposed: false,
    saves: 0, // doesn't reduce courses, redistributes them
  },
  doubleCountVIPR1300: {
    label: 'VIPR 1300 → SS/H distribution',
    desc: 'All 2.5 CU of VIPR 1300 (across 5 semesters) count toward Social Sciences.',
    category: 'Double-counting',
    ask: 'low',
    proposed: true,
    saves: 2, // saves ~2-3 distribution fillers
  },
  doubleCountKite: {
    label: 'Kite → H distribution',
    desc: 'Kite counts toward Humanities distribution (in addition to being a Foundation).',
    category: 'Double-counting',
    ask: 'low',
    proposed: true,
    saves: 1,
  },
  doubleCountWriting: {
    label: 'Writing → H distribution',
    desc: 'Critical Writing counts toward Humanities (in addition to being a Foundation).',
    category: 'Double-counting',
    ask: 'low',
    proposed: true,
    saves: 1,
  },
  seasHumanitiesKite: {
    label: 'Kite → SEAS Humanities',
    desc: 'Kite gets the SEAS Humanities section attribute.',
    category: 'Other',
    ask: 'low',
    proposed: true,
    saves: 0, // reduces SEAS load, not College gen-eds
  },
  aandsCUWaiver: {
    label: 'Up to 3 A&S CUs waivable',
    desc: 'Existing VIPER policy: up to 3 of the 36 BA CUs may be waived upon audit.',
    category: 'Other',
    ask: 'confirmed',
    proposed: true,
    saves: 0,
  },
}

// The old code built the all-false / all-true presets with
// Object.fromEntries(Object.keys(DEFAULT_VIPER_MODS).map(...)). Spelled out
// via a typed helper here so the preset objects stay fully typed.
const everyMod = (value: boolean): ViperMods => ({
  fysWaiver: value,
  keyWaiver: value,
  langWaiver: value,
  pdWaiver: value,
  kiteFullWaiver: value,
  viprKiteWaiver: value,
  kiteLabWaiver: value,
  summerFoundation: value,
  doubleCountVIPR1300: value,
  doubleCountKite: value,
  doubleCountWriting: value,
  seasHumanitiesKite: value,
  aandsCUWaiver: value,
})

// Preset bundles — each represents a scenario to compare.
export const MOD_PRESETS: Record<'none' | 'current' | 'minimal' | 'aggressive', ModPreset> = {
  none: {
    label: 'No VIPER modifications',
    desc: 'Baseline — what the committee sees without any asks.',
    mods: everyMod(false),
  },
  current: {
    label: 'Currently proposed (memo)',
    desc: 'The exact mods in the current VIPER modification memo.',
    mods: { ...DEFAULT_VIPER_MODS },
  },
  minimal: {
    label: 'Minimum viable',
    desc: 'Smallest set of mods keeping VIPER students near 6 gen-eds total.',
    mods: {
      fysWaiver: true, keyWaiver: true, langWaiver: true,
      pdWaiver: false, kiteFullWaiver: false, viprKiteWaiver: false,
      kiteLabWaiver: true, summerFoundation: false,
      doubleCountVIPR1300: true, doubleCountKite: true, doubleCountWriting: true,
      seasHumanitiesKite: true, aandsCUWaiver: true,
    },
  },
  aggressive: {
    label: 'Aggressive (lower bound)',
    desc: 'All proposed + experimental mods. Unlikely to fly but shows floor.',
    mods: everyMod(true),
  },
}

// Accept legacy boolean or partial object; normalize to full mods object.
export function normalizeViperMods(v?: ViperModsInput): ViperMods {
  if (v && typeof v === 'object') {
    // Already an object — fill in defaults for anything missing
    return { ...DEFAULT_VIPER_MODS, ...v }
  }
  // NOTE (verbatim old behavior): returns the SHARED preset object, not a
  // copy. Callers always spread before mutating, so this is safe — kept as-is.
  if (v === false) return MOD_PRESETS.none.mods
  // Default (true, undefined, etc.) = current proposal
  return { ...DEFAULT_VIPER_MODS }
}
