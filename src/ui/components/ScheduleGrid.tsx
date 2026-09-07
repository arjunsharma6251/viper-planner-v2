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
 * The primary planning surface, read the way a student thinks about it:
 * year by year. Each year is its own chapter — a heading, then Fall and
 * Spring side by side, then the summer as a slim third term at the end
 * of the row. Chronology runs left to right inside a year and top to
 * bottom across years, so "Year 2, Spring" is found by reading, not by
 * decoding a table.
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

  function card(semKey: SemesterKey, riseIndex: number, extraClass = '') {
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
          riseIndex={riseIndex}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {years.map((y, yi) => {
        const fall = SEMESTER_KEYS[(y - 1) * 2]
        const spring = SEMESTER_KEYS[(y - 1) * 2 + 1]
        const summer = SUMMER_KEYS[y - 1] // year 4 has no summer
        const fallLabel = fall ? semesterLabel(fall, gradYear ?? undefined) : null
        const startYear = fallLabel ? Number(fallLabel.season.split(' ')[1]) : null
        const span = startYear ? `${startYear}–${String(startYear + 1).slice(2)}` : null
        const base = yi * 3
        // Academic-year load (Fall + Spring) — the number an advisor asks
        // about first. Summers are judged separately and stay out of it.
        const inTerm = (fall ? (plan.loads[fall] ?? 0) : 0) + (spring ? (plan.loads[spring] ?? 0) : 0)

        return (
          <section key={y} aria-label={`Year ${y}`} className="flex flex-col gap-4">
            {/* ── Year chapter head ── */}
            <div
              className="rise flex items-baseline gap-4"
              style={{ '--i': base } as React.CSSProperties}
            >
              <h2 className="font-display text-[1.625rem] leading-none font-semibold tracking-tight text-penn-blue">
                Year {y}
              </h2>
              {span && (
                <span className="tnum font-mono text-[0.6875rem] text-ink/45">{span}</span>
              )}
              <span className="h-px flex-1 self-center bg-rule/70" aria-hidden />
              {inTerm > 0 && (
                <span className="tnum font-mono text-[0.6875rem] whitespace-nowrap text-ink/45">
                  {inTerm.toFixed(1)} CU
                  <span className="smallcaps ml-1.5 !text-[0.5rem] !text-ink/40">in term</span>
                </span>
              )}
            </div>

            {/* ── Fall · Spring · Summer, left to right ── */}
            {/* Every year shares the same three-column rhythm so Fall and
                Spring line up top to bottom. Year 4's third slot holds the
                end of the road instead of a summer. */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_minmax(11.5rem,0.55fr)]">
              {fall && card(fall, base + 1)}
              {spring && card(spring, base + 2)}
              {summer ? (
                card(summer, base + 3, 'md:col-span-2 xl:col-span-1 xl:self-start')
              ) : (
                <div
                  className="rise hidden px-5 pt-5 xl:block"
                  style={{ '--i': base + 3 } as React.CSSProperties}
                  aria-hidden
                >
                  <p className="font-display text-[1.0625rem] text-ink/45 italic">
                    Commencement
                  </p>
                  {gradYear && (
                    <p className="tnum mt-1 font-mono text-[0.6875rem] text-ink/35">
                      May {gradYear}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
