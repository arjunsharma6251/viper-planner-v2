import { useState } from 'react'
import type { AugmentedCourse, AugmentedPlan } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { SEMESTER_KEYS, SUMMER_KEYS, semesterLabel } from '../../data/semesters'
import { SemesterCard, type DragPayload } from './SemesterCard'

export interface ScheduleGridProps {
  plan: AugmentedPlan
  gradYear: number | null
  onOpenCourse: (course: AugmentedCourse, semKey: SemesterKey) => void
  onAddCourse: (semKey: SemesterKey) => void
  onMove: (from: SemesterKey, to: SemesterKey, courseId: string, targetIndex: number) => void
  colorOverrides?: Record<string, string>
}

/**
 * The primary planning surface: four year columns under small-caps column
 * heads, each Fall → Spring → Summer. Years are the document's chapters;
 * the staggered reveal walks left to right.
 */
export function ScheduleGrid({
  plan,
  gradYear,
  onOpenCourse,
  onAddCourse,
  onMove,
  colorOverrides,
}: ScheduleGridProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)

  const years = [1, 2, 3, 4] as const

  function card(semKey: SemesterKey, riseIndex: number) {
    const label = semesterLabel(semKey, gradYear ?? undefined)
    return (
      <SemesterCard
        key={semKey}
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
        riseIndex={riseIndex}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
      {years.map((y, yi) => {
        const fall = SEMESTER_KEYS[(y - 1) * 2]
        const spring = SEMESTER_KEYS[(y - 1) * 2 + 1]
        const summer = SUMMER_KEYS[y - 1] // year 4 has no summer
        return (
          <div key={y} className="flex flex-col gap-5">
            <div
              className="rise flex items-baseline gap-3"
              style={{ '--i': yi } as React.CSSProperties}
            >
              <span className="font-display text-[22px] leading-none font-semibold text-penn-blue/90">
                {String(y).padStart(2, '0')}
              </span>
              <span className="smallcaps">Year {y}</span>
              <span className="h-px flex-1 self-center bg-rule/70" aria-hidden />
            </div>
            {fall && card(fall, yi + 1)}
            {spring && card(spring, yi + 2)}
            {summer && card(summer, yi + 3)}
          </div>
        )
      })}
    </div>
  )
}
