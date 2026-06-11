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
}

/**
 * The primary planning surface: four year columns, each Fall → Spring →
 * Summer. Summers get the slimmer treatment (tone, not chrome) since
 * they're margins of the plan, not the spine.
 */
export function ScheduleGrid({
  plan,
  gradYear,
  onOpenCourse,
  onAddCourse,
  onMove,
}: ScheduleGridProps) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)

  const years = [1, 2, 3, 4] as const

  function card(semKey: SemesterKey) {
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
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
      {years.map((y) => {
        const fall = SEMESTER_KEYS[(y - 1) * 2]
        const spring = SEMESTER_KEYS[(y - 1) * 2 + 1]
        const summer = SUMMER_KEYS[y - 1] // year 4 has no summer
        return (
          <div key={y} className="flex flex-col gap-4">
            {fall && card(fall)}
            {spring && card(spring)}
            {summer && card(summer)}
          </div>
        )
      })}
    </div>
  )
}
