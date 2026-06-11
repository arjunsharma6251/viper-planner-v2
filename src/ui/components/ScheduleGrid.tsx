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
 * The primary planning surface. At xl the four year columns share strict
 * rows — every Fall card top-aligned with the other Falls, Springs with
 * Springs, Summers with Summers — so the document reads as a true table.
 * Achieved with `xl:contents` on the year wrappers: below xl each year is
 * a self-contained stack; at xl the wrappers dissolve and each cell takes
 * an explicit grid position.
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
  // Literal class lists — Tailwind only generates classes it can see in source.
  const COL = ['xl:col-start-1', 'xl:col-start-2', 'xl:col-start-3', 'xl:col-start-4']
  const ROW = ['xl:row-start-1', 'xl:row-start-2', 'xl:row-start-3', 'xl:row-start-4']

  function card(semKey: SemesterKey, y: number, row: number, riseIndex: number) {
    const label = semesterLabel(semKey, gradYear ?? undefined)
    return (
      <div key={semKey} className={`${COL[y - 1]} ${ROW[row - 1]}`}>
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
          riseIndex={riseIndex}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-7 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_auto_auto_auto]">
      {years.map((y, yi) => {
        const fall = SEMESTER_KEYS[(y - 1) * 2]
        const spring = SEMESTER_KEYS[(y - 1) * 2 + 1]
        const summer = SUMMER_KEYS[y - 1] // year 4 has no summer
        const fallLabel = fall ? semesterLabel(fall, gradYear ?? undefined) : null
        return (
          <div key={y} className="flex flex-col gap-5 xl:contents">
            {/* ── Year chapter head: ghost numeral + small caps ── */}
            <div
              className={`rise flex items-end gap-3 ${COL[yi]} xl:row-start-1`}
              style={{ '--i': yi } as React.CSSProperties}
            >
              <span
                aria-hidden
                className="font-display text-[3.75rem] leading-[0.78] font-semibold tracking-tight text-penn-blue/12 select-none"
              >
                {String(y).padStart(2, '0')}
              </span>
              <div className="min-w-0 pb-0.5">
                <span className="smallcaps block">Year {y}</span>
                {fallLabel && (
                  <span className="tnum block font-mono text-[0.625rem] text-ink/35">
                    {fallLabel.season.split(' ')[1]}–
                    {String(Number(fallLabel.season.split(' ')[1]) + 1).slice(2)}
                  </span>
                )}
              </div>
              <span className="mb-1.5 h-px flex-1 self-end bg-rule/70" aria-hidden />
            </div>
            {fall && card(fall, y, 2, yi + 1)}
            {spring && card(spring, y, 3, yi + 2)}
            {summer && card(summer, y, 4, yi + 3)}
          </div>
        )
      })}
    </div>
  )
}
