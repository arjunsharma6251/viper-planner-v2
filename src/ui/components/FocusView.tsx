import { useState } from 'react'
import type { AugmentedCourse, AugmentedPlan } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { ALL_SEMESTER_KEYS, isSummerSem, semesterLabel } from '../../data/semesters'
import { SemesterCard, type DragPayload } from './SemesterCard'

export interface FocusViewProps {
  plan: AugmentedPlan
  gradYear: number | null
  selected: SemesterKey
  onSelect: (key: SemesterKey) => void
  onOpenCourse: (course: AugmentedCourse, semKey: SemesterKey) => void
  onAddCourse: (semKey: SemesterKey) => void
  onMove: (from: SemesterKey, to: SemesterKey, courseId: string, targetIndex: number) => void
  colorOverrides?: Record<string, string>
}

/**
 * One semester at a time: a navigator strip of all eleven terms, arrow
 * paging, and the selected semester rendered large. Same card, same
 * handlers as the grid — switching views never loses state.
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
}: FocusViewProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const idx = ALL_SEMESTER_KEYS.indexOf(selected)
  const prev = idx > 0 ? ALL_SEMESTER_KEYS[idx - 1] : undefined
  const next = idx < ALL_SEMESTER_KEYS.length - 1 ? ALL_SEMESTER_KEYS[idx + 1] : undefined
  const label = semesterLabel(selected, gradYear ?? undefined)

  const arrow =
    'flex w-11 shrink-0 items-center justify-center rounded-lg border border-hairline bg-paper font-display text-[1.375rem] text-ink/45 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:text-penn-blue hover:shadow-[var(--shadow-card-hover)] disabled:opacity-25 disabled:hover:translate-y-0 disabled:hover:text-ink/45'

  return (
    <div className="mx-auto w-full max-w-[46rem]">
      {/* ── Term navigator strip ── */}
      <div
        className="rise mb-5 flex flex-wrap justify-center gap-1.5"
        style={{ '--i': 0 } as React.CSSProperties}
        role="tablist"
        aria-label="Semesters"
      >
        {ALL_SEMESTER_KEYS.map((k) => {
          const l = semesterLabel(k, gradYear ?? undefined)
          const active = k === selected
          const count = (plan.semesters[k] ?? []).length
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(k)}
              className={[
                'tnum rounded-md border px-2.5 py-1.5 font-mono text-[0.6875rem] transition-all duration-150',
                isSummerSem(k) ? 'border-dashed' : '',
                active
                  ? 'border-penn-blue bg-penn-blue text-white shadow-[var(--shadow-card)]'
                  : count > 0
                    ? 'border-hairline bg-paper text-ink/70 hover:border-penn-blue/50 hover:text-penn-blue'
                    : 'border-hairline bg-transparent text-ink/35 hover:border-penn-blue/50 hover:text-penn-blue',
              ].join(' ')}
            >
              {l.short}
            </button>
          )
        })}
      </div>

      {/* ── Selected term, large ── */}
      <div className="flex items-stretch gap-4">
        <button
          type="button"
          className={arrow}
          disabled={!prev}
          onClick={() => prev && onSelect(prev)}
          aria-label={prev ? `Previous: ${semesterLabel(prev, gradYear ?? undefined).season}` : 'No earlier term'}
        >
          ‹
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
            riseIndex={1}
          />
        </div>
        <button
          type="button"
          className={arrow}
          disabled={!next}
          onClick={() => next && onSelect(next)}
          aria-label={next ? `Next: ${semesterLabel(next, gradYear ?? undefined).season}` : 'No later term'}
        >
          ›
        </button>
      </div>
      <p className="mt-3 text-center text-[0.6875rem] text-ink/35">
        Drag reorders within the term · use a course's Actions tab to move it to another
        term
      </p>
    </div>
  )
}
