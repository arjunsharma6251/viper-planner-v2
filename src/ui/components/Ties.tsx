import type { AugmentedCourse } from '../../plan/types'
import { busesOf, type Bus } from '../trace'

const BUS_COLOR: Record<Bus, string> = {
  ba: 'var(--color-penn-blue)',
  bse: 'var(--color-ink)',
  energy: 'var(--color-energy)',
}
/** On an inverted (ink) row the BSE terminal prints in sheet so it stays visible. */
const BUS_COLOR_INVERTED: Record<Bus, string> = {
  ba: 'var(--color-tint-blue)',
  bse: 'var(--color-sheet)',
  energy: 'var(--color-energy)',
}

const BUS_NAME: Record<Bus, string> = { ba: 'BA', bse: 'BSE', energy: 'Energy' }

/**
 * The tie marks: three terminals (BA · BSE · Energy) drawn in one fixed
 * column. A filled terminal means the course feeds that bus; a bar joins
 * BA and BSE when the course counts toward both degrees (overlap). A
 * course doing double duty inside one degree prints its count.
 */
export function Ties({ course, inverted }: { course: AugmentedCourse; inverted?: boolean }) {
  const color = inverted ? BUS_COLOR_INVERTED : BUS_COLOR
  const buses = busesOf(course)
  const overlap = course.overlapKind === 'overlap' && buses.includes('ba') && buses.includes('bse')
  const within = course.overlapKind === 'within-degree' && course.requirementCount >= 2
  const n = Math.min(course.requirementCount, 3)
  const text = [
    buses.length ? `feeds ${buses.map((b) => BUS_NAME[b]).join(', ')}` : 'feeds no tracked bus',
    overlap ? `overlap, ${n} requirements` : within ? `double-counts within one degree, ${n} requirements` : '',
  ]
    .filter(Boolean)
    .join('; ')

  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={text}
      title={text}
    >
      <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true" focusable="false">
        {overlap && <rect x="5" y="4" width="12" height="2" fill={color.ba} />}
        {(['ba', 'bse', 'energy'] as Bus[]).map((b, i) => {
          const on = buses.includes(b)
          const cx = 5 + i * 12
          return on ? (
            <rect key={b} x={cx - 3.5} y="1.5" width="7" height="7" fill={color[b]} />
          ) : (
            <rect
              key={b}
              x={cx - 3}
              y="2"
              width="6"
              height="6"
              fill="none"
              stroke={inverted ? 'var(--color-ink-3)' : 'var(--color-rule-2)'}
              strokeWidth="1"
            />
          )
        })}
      </svg>
      {within && (
        <span className={['tag !text-[0.625rem]', inverted ? 'text-sheet' : 'text-penn-red'].join(' ')} aria-hidden="true">
          ×{n}
        </span>
      )}
    </span>
  )
}
