import { useState } from 'react'
import type { AugmentedCourse, AugmentedPlan } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { SEMESTER_KEYS, SUMMER_KEYS, semesterLabel, yearName } from '../../data/semesters'
import { SemesterCard, type DragPayload } from './SemesterCard'

export interface ScheduleGridProps {
  plan: AugmentedPlan
  gradYear: number | null
  onOpenCourse: (course: AugmentedCourse, semKey: SemesterKey) => void
  onAddCourse: (semKey: SemesterKey) => void
  onMove: (from: SemesterKey, to: SemesterKey, courseId: string, targetIndex: number) => void
  colorOverrides?: Record<string, string>
  /** The course whose detail modal is open. */
  selected?: { semKey: SemesterKey; courseId: string } | null
}

/**
 * The sheet, read year by year. Each year is a ruled band (FRESHMAN …
 * SENIOR) over three feeder panels: Fall | Spring | Summer, left to right.
 * Senior year's third slot is commencement.
 */
export function ScheduleGrid({
  plan,
  gradYear,
  onOpenCourse,
  onAddCourse,
  onMove,
  colorOverrides,
  selected,
}: ScheduleGridProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const years = [1, 2, 3, 4] as const

  function card(semKey: SemesterKey, extraClass = '') {
    const label = semesterLabel(semKey, gradYear ?? undefined)
    return (
      <div key={semKey} className={extraClass}>
        <SemesterCard
          semKey={semKey}
          seasonLabel={label.season}
          yearLabel={label.year}
          courses={plan.semesters[semKey] ?? []}
          load={plan.loads[semKey] ?? 0}
          onOpenCourse={onOpenCourse}
          onAddCourse={onAddCourse}
          onMove={onMove}
          dragging={dragging}
          onDragChange={setDragging}
          colorOverrides={colorOverrides}
          selectedId={selected?.semKey === semKey ? selected.courseId : null}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-9">
      {years.map((y) => {
        const fall = SEMESTER_KEYS[(y - 1) * 2]
        const spring = SEMESTER_KEYS[(y - 1) * 2 + 1]
        const summer = SUMMER_KEYS[y - 1]

        return (
          <section key={y} id={`year-${y}`} aria-label={`${yearName(y)} year`} className="scroll-mt-32">
            <div className="mb-3 border-b-2 border-ink pb-1.5">
              <h2 className="font-cond text-[1.125rem] leading-none font-bold tracking-[0.04em] text-ink uppercase">
                {yearName(y)}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_minmax(15rem,0.55fr)]">
              {fall && card(fall)}
              {spring && card(spring)}
              {summer ? (
                card(summer, 'md:col-span-2 xl:col-span-1 xl:self-start')
              ) : (
                <div
                  className="hidden border border-dashed border-rule-2 px-3 py-3 xl:block xl:self-start"
                  aria-hidden
                >
                  <p className="font-cond text-[0.9375rem] leading-none font-semibold tracking-[0.04em] text-ink-2 uppercase">
                    Commencement
                  </p>
                  {gradYear && <p className="tag mt-1.5 text-ink-3">May {gradYear}</p>}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
