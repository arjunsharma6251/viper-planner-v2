import type { DragEvent } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import { isOpenSlot } from '../../plan/open-slot'
import { busesOf, useTrace } from '../trace'
import { Ties } from './Ties'
import { IconGrip, IconLock, IconOpenBreaker } from './icons'

export interface CourseRowProps {
  course: AugmentedCourse
  /** The whole row is the click target — opens the detail modal. */
  onOpen: (course: AugmentedCourse) => void
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: (event: DragEvent<HTMLDivElement>) => void
  /** True while this row is the one being dragged. */
  dragging?: boolean
  /** True while this row's detail modal is open. */
  selected?: boolean
  /** User-picked cluster color (a thin key at the left edge). */
  color?: string
  /** Narrow ruling for summer panels: tag · title · CU, no ties column. */
  compact?: boolean
}

/** The one column ruling every course row on the sheet obeys. */
export const ROW_COLUMNS = 'grid-cols-[4.5rem_minmax(0,1fr)_2.75rem_2rem]'
/** Summer panels are narrow: the same ruling without the ties column. */
export const ROW_COLUMNS_COMPACT = 'grid-cols-[4.25rem_minmax(0,1fr)_2rem]'

/**
 * One breaker on a feeder: tag · title · ties · CU, ruled by a hairline.
 * Hovering or focusing the row traces the buses it feeds. Dragging inverts
 * the row fully to ink on sheet; there are no half-opacity states.
 */
export function CourseRow({ course, onOpen, onDragStart, onDragEnd, dragging, selected, color, compact }: CourseRowProps) {
  const inverted = !!dragging || !!selected
  const open = isOpenSlot(course)
  const code = course.isPlaceholder ? (course.label ?? '—') : course.code
  const { setLit } = useTrace()
  const title = open ? `Open slot — ${course.title}` : `${code} — ${course.title}`

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!course.fixed}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(course)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(course)
        }
      }}
      onMouseEnter={() => setLit(busesOf(course))}
      onMouseLeave={() => setLit(null)}
      onFocus={() => setLit(busesOf(course))}
      onBlur={() => setLit(null)}
      data-course-row
      aria-current={selected ? 'true' : undefined}
      className={[
        'group relative grid min-h-9 cursor-pointer items-center py-1.5 pr-1',
        compact ? `${ROW_COLUMNS_COMPACT} gap-x-1.5 pl-5` : `${ROW_COLUMNS} gap-x-2 pl-6`,
        'border-b border-rule last:border-b-0',
        'transition-colors duration-100 ease-out',
        inverted ? 'bg-ink text-sheet' : 'hover:bg-tint-blue focus-visible:bg-tint-blue',
      ].join(' ')}
      title={title}
    >
      {/* cluster key */}
      {color && (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-0 w-[3px]"
          style={{ backgroundColor: color }}
        />
      )}
      {!course.fixed && (
        <span
          aria-hidden
          className={[
            'absolute top-1/2 left-1.5 -translate-y-1/2 cursor-grab transition-opacity duration-100',
            inverted ? 'text-sheet opacity-100' : 'text-ink-3 opacity-0 group-hover:opacity-100',
          ].join(' ')}
        >
          <IconGrip size={14} />
        </span>
      )}

      {open ? (
        <span
          className={[
            'label flex items-center gap-1 !text-[0.625rem]',
            inverted ? '!text-sheet' : '!text-ink-3',
          ].join(' ')}
        >
          <IconOpenBreaker size={14} />
          open
        </span>
      ) : (
        <span className={['tag', inverted ? 'text-sheet' : 'text-ink'].join(' ')}>{code}</span>
      )}

      <span
        className={[
          'line-clamp-2 min-w-0 text-[0.8125rem] leading-snug break-words',
          inverted ? 'text-sheet' : open ? 'text-ink-2' : 'text-ink',
        ].join(' ')}
      >
        {course.title}
        {course.fixed && (
          <span className="ml-1.5 inline-block align-[-2px] text-ink-3" title="Fixed VIPER requirement">
            <IconLock size={12} />
            <span className="sr-only"> (fixed)</span>
          </span>
        )}
        {course.tags?.includes('MOVED') && (
          <span className="label ml-1.5 !text-[0.625rem] !text-ink-3">moved</span>
        )}
      </span>

      {compact ? null : open ? (
        <span
          className={[
            'label !text-[0.625rem] opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100',
            '!text-penn-blue',
          ].join(' ')}
          aria-hidden
        >
          choose
        </span>
      ) : (
        <Ties course={course} inverted={inverted} />
      )}

      <span className={['tag text-right', inverted ? 'text-sheet' : 'text-ink-2'].join(' ')}>
        {course.cu}
      </span>
    </div>
  )
}
