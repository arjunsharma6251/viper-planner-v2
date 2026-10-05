import type { Plan } from '../plan/types'
import { ALL_SEMESTER_KEYS } from '../data/semesters'

/**
 * Compact plan digest injected into the chat context each turn.
 *
 * Token economics: the raw Plan object serializes to ~10-15K tokens
 * (prereqs, slot pools, notes — detail the model rarely needs up front).
 * This digest is ~1-2K tokens and carries everything needed to reason
 * about the plan's shape; the model calls get_plan / get_course_info
 * when it needs full detail. Keeping the digest OUT of the system prompt
 * (it goes in the user turn) keeps the cached system+tools prefix frozen.
 */
export function buildPlanContext(plan: Plan): string {
  const lines: string[] = []
  const meta = plan.meta
  lines.push(
    `Majors: ${meta.sasMajor ?? '?'} (BA${meta.sasConc ? `, ${meta.sasConc}` : ''}) + ${meta.seasMajor ?? '?'} (BSE${meta.seasConc ? `, ${meta.seasConc}` : ''}) · Class of ${meta.gradYear ?? '?'}`,
  )
  lines.push(
    meta.curriculumMode === 'ncc'
      ? 'College curriculum: New College Curriculum (six Foundations + 12+5+3 distribution; slot ids ncc-*). Confirmed VIPER overlap: VIPR 1200/1210 = First-Year Seminar only.'
      : 'College curriculum: old core (Foundational Approaches + Sectors; slot ids gened-*).',
  )

  for (const key of ALL_SEMESTER_KEYS) {
    const courses = plan.semesters[key] ?? []
    if (courses.length === 0) continue
    const load = plan.loads[key] ?? 0
    const entries = courses
      .map((c) => {
        const code = c.isPlaceholder ? (c.label ?? '—') : c.code
        const flags = [
          c.fixed ? 'fixed' : '',
          c.slotId ? `slot:${c.slotId}` : '',
          c.isEnergy ? 'energy' : '',
        ]
          .filter(Boolean)
          .join(',')
        return `${code} (${c.cu}${flags ? `; ${flags}` : ''})`
      })
      .join(', ')
    lines.push(`${key} [${load} CU]: ${entries}`)
  }

  const credits = Object.entries(plan.placement)
    .filter(([, where]) => where === 'credit')
    .map(([code]) => code)
  if (credits.length > 0) lines.push(`Satisfied by AP/placement credit: ${credits.join(', ')}`)

  const fulfillments = Object.entries(plan.fulfillments ?? {})
    .filter(([, tags]) => tags.length > 0)
    .map(([code, tags]) => `${code}→${tags.join('+')}`)
  if (fulfillments.length > 0)
    lines.push(
      `Student overrides of what courses count toward (tag = ticked on, !tag = a catalog/slot-derived requirement ticked off): ${fulfillments.join('; ')}`,
    )

  return lines.join('\n')
}
