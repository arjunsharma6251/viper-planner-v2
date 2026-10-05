import { useState } from 'react'
import type { AugmentedCourse, AugmentedPlan } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { ALL_SEMESTER_KEYS, isSummerSem, semesterLabel, yearName } from '../../data/semesters'
import { SemesterCard, type DragPayload } from './SemesterCard'
import { IconChevronLeft, IconChevronRight } from './icons'

export interface FocusViewProps {
  plan: AugmentedPlan
  gradYear: number | null
  selected: SemesterKey
  onSelect: (key: SemesterKey) => void
  onOpenCourse: (course: AugmentedCourse, semKey: SemesterKey) => void
  onAddCourse: (semKey: SemesterKey) => void
  onMove: (from: SemesterKey, to: SemesterKey, courseId: string, targetIndex: number) => void
  colorOverrides?: Record<string, string>
  /** The course whose detail modal is open. */
  selectedCourse?: { semKey: SemesterKey; courseId: string } | null
}

/**
 * One feeder at a time: a ruled navigator of all eleven terms grouped by
 * year, then the selected term at full width. Same panel and handlers as
 * the grid, so switching views never loses state.
 */
export function FocusView({
  plan,
  gradYear,
  selected,
  onSelect,
  onOpenCourse,
  onAddCourse,
  onMove,
  colorOverrides,
  selectedCourse,
}: FocusViewProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const idx = ALL_SEMESTER_KEYS.indexOf(selected)
  const prev = idx > 0 ? ALL_SEMESTER_KEYS[idx - 1] : undefined
  const next = idx < ALL_SEMESTER_KEYS.length - 1 ? ALL_SEMESTER_KEYS[idx + 1] : undefined
  const label = semesterLabel(selected, gradYear ?? undefined)

  return (
    <div className="mx-auto w-full max-w-[52rem]">
      <div
        className="mb-5 flex flex-wrap gap-x-6 gap-y-3"
        role="tablist"
        aria-label="Semesters"
      >
        {([1, 2, 3, 4] as const).map((y) => {
          const keys = ALL_SEMESTER_KEYS.filter((k) => k.endsWith(`-y${y}`))
          const yearActive = keys.includes(selected)
          return (
            <div key={y} className="flex flex-col gap-1.5">
              <span className={['label', yearActive ? '!text-ink' : ''].join(' ')}>{yearName(y)}</span>
              <div className="seg">
                {keys.map((k) => {
                  const l = semesterLabel(k, gradYear ?? undefined)
                  const active = k === selected
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={active}
                      onClick={() => onSelect(k)}
                      className={[
                        '!font-mono !text-[0.6875rem] !tracking-normal !normal-case',
                        isSummerSem(k) && !active ? '!text-ink-3' : '',
                      ].join(' ')}
                    >
                      {l.short}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          className="btn mt-3 !px-2.5 !py-3"
          disabled={!prev}
          onClick={() => prev && onSelect(prev)}
          aria-label={prev ? `Previous: ${semesterLabel(prev, gradYear ?? undefined).season}` : 'No earlier term'}
        >
          <IconChevronLeft />
        </button>
        <div className="min-w-0 flex-1">
          <SemesterCard
            key={selected}
            semKey={selected}
            seasonLabel={label.season}
            yearLabel={label.year}
            courses={plan.semesters[selected] ?? []}
            load={plan.loads[selected] ?? 0}
            onOpenCourse={onOpenCourse}
            onAddCourse={onAddCourse}
            onMove={onMove}
            dragging={dragging}
            onDragChange={setDragging}
            colorOverrides={colorOverrides}
            selectedId={selectedCourse?.semKey === selected ? selectedCourse.courseId : null}
          />
        </div>
        <button
          type="button"
          className="btn mt-3 !px-2.5 !py-3"
          disabled={!next}
          onClick={() => next && onSelect(next)}
          aria-label={next ? `Next: ${semesterLabel(next, gradYear ?? undefined).season}` : 'No later term'}
        >
          <IconChevronRight />
        </button>
      </div>
      <p className="mt-3 text-center text-[0.75rem] text-ink-3">
        Drag reorders within the term. To move a course to another term, open it and pick a term.
      </p>
    </div>
  )
}
