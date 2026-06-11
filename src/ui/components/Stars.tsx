import type { AugmentedCourse } from '../../plan/types'

/**
 * Multi-star double-count / overlap indicator.
 * Gold = cross-degree overlap (BA+BSE). Red = within-degree double-count.
 * Cap at 3 stars. Silent under 2 contributions (a course doing one job
 * doesn't need decoration).
 */
export function Stars({ course }: { course: AugmentedCourse }) {
  if (course.requirementCount < 2 || !course.overlapKind) return null
  const n = Math.min(course.requirementCount, 3)
  const gold = course.overlapKind === 'overlap'
  return (
    <span
      className={[
        'shrink-0 text-[0.625rem] tracking-[0.15em]',
        gold ? 'text-[#b8860b]' : 'text-penn-red',
      ].join(' ')}
      title={
        gold
          ? `Counts toward both degrees (${course.requirementCount} requirements)`
          : `Double-counts within one degree (${course.requirementCount} requirements)`
      }
      aria-label={
        gold
          ? `Cross-degree overlap, ${n} requirements`
          : `Within-degree double-count, ${n} requirements`
      }
    >
      {'★'.repeat(n)}
    </span>
  )
}
