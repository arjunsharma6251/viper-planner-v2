// Ported verbatim from references/old-app/index.html (~lines 3879–3946).

import { normalizeViperMods } from './mods'
import type { NCCPlanInput, SEASGenElectiveSlot, SEASGenElectivesResult, ViperModsInput } from './types'

/**
 * SEAS Gen Elective requirements (UNTOUCHED by NCC; same under both curricula):
 *   - 1 ethics course (VIPR 1200/1210 covers this)
 *   - 1 Writing seminar (overlaps with College Writing Foundation)
 *   - 5 SS or H courses
 * Total: 7 courses, but most overlap with College work, so net new is small.
 *
 * Returns a breakdown showing which SEAS slots are filled, and which College
 * Foundations / Distribution courses double-count toward them.
 */
export function computeSEASGenElectives(
  plan: NCCPlanInput,
  viperMods?: ViperModsInput,
): SEASGenElectivesResult {
  const mods = normalizeViperMods(viperMods)
  // The 7 SEAS slots
  const requirements: SEASGenElectiveSlot[] = [
    { id: 'seas-ethics',  label: 'Ethics',          fillsByVIPR: true,  filledBy: 'VIPR 1200/1210', satisfied: true },
    { id: 'seas-writ',    label: 'Writing Seminar', fillsByCollegeWrit: true, filledBy: 'College Writing Foundation (overlap)', satisfied: true },
    { id: 'seas-ssh-1',   label: 'SS/H course #1',  satisfied: false },
    { id: 'seas-ssh-2',   label: 'SS/H course #2',  satisfied: false },
    { id: 'seas-ssh-3',   label: 'SS/H course #3',  satisfied: false },
    { id: 'seas-ssh-4',   label: 'SS/H course #4',  satisfied: false },
    { id: 'seas-ssh-5',   label: 'SS/H course #5',  satisfied: false },
  ]

  // Look at what College gen-eds the student is taking — these overlap into
  // SEAS SS/H slots automatically. Each College SS or H course counts toward
  // one SEAS SS/H slot.
  let sshOverlapCount = 0
  for (const sem of Object.values(plan.semesters)) {
    for (const c of sem || []) {
      if (c.category !== 'gened') continue
      const slotId = c.slotId || ''
      // Foundation courses (Kite, P&D) count for SEAS SS/H if they're H or SS
      // Distribution slots count too.
      const intentDiv = c.intent?.distribution
      if (intentDiv === 'SS' || intentDiv === 'H') {
        sshOverlapCount += 1
        continue
      }
      // VIPR 1300 with the doubleCountVIPR1300 mod also counts as SS for SEAS
      // PORTING NOTE: comment kept from the old source, but this branch checks
      // the P&D / Kite slot ids (Foundation slots without an explicit
      // intent.distribution), not VIPR 1300. Looks odd; kept verbatim.
      if (slotId === 'ncc-pad' || slotId === 'ncc-kite') {
        sshOverlapCount += 1
      }
    }
  }
  // VIPR 1300 (placed in plan as recurring half-CU, totals 2.5 CU) overlaps if doubleCount on
  if (mods.doubleCountVIPR1300) {
    sshOverlapCount += 2 // up to 2 SS/H slots from VIPR 1300
  }

  // Mark slots satisfied
  const toFill = Math.min(5, sshOverlapCount)
  for (let i = 2; i < 2 + toFill; i++) {
    const slot = requirements[i]
    if (!slot) break // unreachable (toFill <= 5 keeps i in range); satisfies noUncheckedIndexedAccess
    slot.satisfied = true
    slot.filledBy = 'College gen-ed (overlap)'
  }

  const satisfiedCount = requirements.filter(r => r.satisfied).length
  const remainingCount = requirements.length - satisfiedCount

  return {
    requirements,
    total: requirements.length,
    satisfied: satisfiedCount,
    remaining: remainingCount,
    // Per Michelle: SEAS untouched, overlaps allowed. With current mods,
    // most or all SEAS slots are covered by College work.
  }
}
