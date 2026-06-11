import type { DragEvent } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import { Stars } from './Stars'

export interface CourseRowProps {
  course: AugmentedCourse
  /** The whole row is the click target — opens the detail modal. */
  onOpen: (course: AugmentedCourse) => void
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: (event: DragEvent<HTMLDivElement>) => void
  /** Course needs attention (over-cap, prereq concern) — colored border. */
  attention?: boolean
  /** User-picked cluster color (left edge chip). */
  color?: string
}

/**
 * One line of the ledger: code · title · stars · CU, divided from its
 * neighbors by a dotted hairline. Hover warms the paper and reveals the
 * grip — the row should read as typeset until touched.
 */
export function CourseRow({
  course,
  onOpen,
  onDragStart,
  onDragEnd,
  attention,
  color,
}: CourseRowProps) {
  const code = course.isPlaceholder ? (course.label ?? '—') : course.code
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
      className={[
        'group relative flex min-h-10 cursor-pointer items-center gap-2 py-2 pr-0.5 pl-3',
        'border-b border-dotted border-hairline/70 last:border-b-0',
        'transition-colors duration-150 ease-out hover:bg-[#fbf8f0]',
        attention ? 'shadow-[inset_2px_0_0_var(--color-penn-red)]' : '',
        course.isPlaceholder ? 'opacity-65' : '',
      ].join(' ')}
    >
      {/* cluster color chip / grip well */}
      <span
        aria-hidden
        className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full transition-colors duration-150"
        style={color ? { backgroundColor: color } : undefined}
      />
      {!course.fixed && (
        <span
          aria-hidden
          className="-ml-1.5 w-2 cursor-grab font-mono text-[0.5625rem] leading-none text-ink/0 transition-colors duration-150 select-none group-hover:text-ink/35"
        >
          ⠿
        </span>
      )}
      <span className="w-[4.5rem] shrink-0 font-mono text-[0.6875rem] font-medium tracking-tight text-penn-blue">
        {code}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-[0.84375rem] leading-snug text-ink/85"
        title={`${code} — ${course.title}`}
      >
        {course.title}
      </span>
      <Stars course={course} />
      {course.tags?.includes('MOVED') && (
        <span className="smallcaps shrink-0 !text-[0.5rem] text-ink/40">moved</span>
      )}
      <span className="tnum w-7 shrink-0 text-right font-mono text-[0.6875rem] text-ink-soft">
        {course.cu}
      </span>
    </div>
  )
}
