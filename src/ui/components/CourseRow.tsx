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
}

/**
 * One course line in a semester card. Shows code, title, CU, star
 * indicator — everything else lives in the detail modal (progressive
 * disclosure). Hover previews the modal opening (slight elevation).
 */
export function CourseRow({ course, onOpen, onDragStart, onDragEnd, attention }: CourseRowProps) {
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
        'group flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5',
        'transition-all duration-150 ease-out hover:-translate-y-px hover:bg-white hover:shadow-sm',
        attention ? 'border border-penn-red' : 'border border-transparent',
        course.isPlaceholder ? 'opacity-70' : '',
      ].join(' ')}
    >
      {!course.fixed && (
        <span
          aria-hidden
          className="-ml-1 w-3 select-none text-ink/0 transition-colors duration-150 group-hover:text-ink/30"
        >
          ⋮⋮
        </span>
      )}
      <span className="font-mono text-xs font-medium text-penn-blue">{code}</span>
      <span className="min-w-0 flex-1 truncate text-sm">{course.title}</span>
      <Stars course={course} />
      {course.tags?.includes('MOVED') && (
        <span className="rounded bg-ink/5 px-1 font-mono text-[10px] uppercase tracking-wide text-ink/50">
          moved
        </span>
      )}
      <span className="font-mono text-xs text-ink/60">{course.cu}</span>
    </div>
  )
}
