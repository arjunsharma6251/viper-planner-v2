import { useState, type DragEvent } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { isSummerSem } from '../../data/semesters'
import { CourseRow } from './CourseRow'

export interface DragPayload {
  from: SemesterKey
  courseId: string
}

export interface SemesterCardProps {
  semKey: SemesterKey
  /** e.g. "Fall 2024" */
  seasonLabel: string
  /** e.g. "Year 1" */
  yearLabel: string
  courses: AugmentedCourse[]
  load: number
  onOpenCourse: (course: AugmentedCourse, semKey: SemesterKey) => void
  onAddCourse: (semKey: SemesterKey) => void
  onMove: (from: SemesterKey, to: SemesterKey, courseId: string, targetIndex: number) => void
  dragging: DragPayload | null
  onDragChange: (payload: DragPayload | null) => void
  colorOverrides?: Record<string, string>
  /** Load-order index for the staggered page-load reveal. */
  riseIndex?: number
}

/**
 * Load classification (academic-year semesters only — summers are judged
 * differently and never get these labels).
 */
function loadTone(
  load: number,
  summer: boolean,
  firstSemester: boolean,
): { cls: string; word: string | null } {
  if (summer || load === 0) return { cls: 'text-ink-soft', word: null }
  // Penn caps first-semester students at 5.5 CU — no overload allowed.
  if (firstSemester && load > 5.5)
    return { cls: 'text-penn-red font-semibold', word: 'over first-semester cap' }
  if (load > 7.5) return { cls: 'text-penn-red font-semibold', word: 'over hard cap' }
  if (load > 6.5) return { cls: 'text-penn-red', word: 'needs approval' }
  if (load > 5.5) return { cls: 'text-[#9a6a00]', word: 'overload' }
  return { cls: 'text-ink-soft', word: null }
}

/**
 * A semester panel of the ledger: season set in Fraunces over a hairline,
 * CU in tabular numerals, course lines divided by dotted rules. Summers are
 * quieter — tinted paper, no elevation. Drop targets glow during drag.
 */
export function SemesterCard({
  semKey,
  seasonLabel,
  yearLabel,
  courses,
  load,
  onOpenCourse,
  onAddCourse,
  onMove,
  dragging,
  onDragChange,
  colorOverrides,
  riseIndex = 0,
}: SemesterCardProps) {
  const summer = isSummerSem(semKey)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const firstSemester = semKey === 'fall-y1'
  const tone = loadTone(load, summer, firstSemester)
  const crowded = courses.length > 7

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!dragging) return
    e.preventDefault()
    const rows = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[data-course-row]'),
    )
    let idx = rows.length
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const rect = row.getBoundingClientRect()
      if (e.clientY < rect.top + rect.height / 2) {
        idx = i
        break
      }
    }
    setInsertAt(idx)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (dragging && insertAt !== null) {
      onMove(dragging.from, semKey, dragging.courseId, insertAt)
    }
    setInsertAt(null)
    onDragChange(null)
  }

  return (
    <section
      aria-label={`${yearLabel} ${seasonLabel}`}
      style={{ '--i': riseIndex } as React.CSSProperties}
      className={[
        'rise print-block group/card flex h-full flex-col rounded-lg transition-all duration-200',
        summer
          ? 'border border-dashed border-rule/70 bg-cream/40 px-5 py-4'
          : 'border border-hairline bg-paper px-6 py-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
        dragging ? 'outline-1 outline-penn-blue/25 outline-dashed' : '',
        insertAt !== null && dragging ? 'bg-[#f4f6fb] outline-penn-blue/60' : '',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={() => setInsertAt(null)}
      onDrop={handleDrop}
    >
      <header className="mb-1 flex items-baseline justify-between gap-2">
        <h3
          className={[
            'font-display font-semibold whitespace-nowrap',
            summer ? 'text-[1.0625rem] text-ink/70 italic' : 'text-[1.1875rem] text-ink',
          ].join(' ')}
        >
          {seasonLabel}
        </h3>
        <div className={`tnum font-mono text-[0.6875rem] whitespace-nowrap ${tone.cls}`}>
          {load > 0 && <span>{load.toFixed(1)} CU</span>}
          {tone.word && <span className="smallcaps ml-1.5 !text-[0.5rem] !text-current">{tone.word}</span>}
        </div>
      </header>
      <div className={`mb-1 h-px ${summer ? 'bg-rule/50' : 'bg-rule/80'}`} aria-hidden />

      {/* ── Load meter: CU against the 5.5 / 6.5 / 7.5 thresholds ──
          Academic-year terms only; summers are judged differently. */}
      {!summer && (
        <div
          className="relative mt-1 mb-2 h-[3px] rounded-full bg-ink/6"
          role="img"
          aria-label={`${load} CU of 7.5 CU hard cap`}
        >
          <div
            className={[
              'absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-300 ease-out',
              load > 6.5 || (firstSemester && load > 5.5)
                ? 'bg-penn-red'
                : load > 5.5
                  ? 'bg-[#b8860b]'
                  : 'bg-penn-blue/70',
            ].join(' ')}
            style={{ width: `${Math.min(load / 7.5, 1) * 100}%` }}
          />
          <span
            className="absolute -top-[2px] h-[7px] w-px bg-ink/20"
            style={{ left: `${(5.5 / 7.5) * 100}%` }}
            aria-hidden
          />
          <span
            className="absolute -top-[2px] h-[7px] w-px bg-ink/20"
            style={{ left: `${(6.5 / 7.5) * 100}%` }}
            aria-hidden
          />
        </div>
      )}

      <div
        className={[
          'flex-1', // stretches so the add button sits flush with the row baseline
          crowded ? 'rounded-sm shadow-[inset_0_0_0_1px_rgba(154,106,0,0.45)]' : '',
        ].join(' ')}
      >
        {courses.map((c, i) => (
          <div key={`${c.placeholderCode ?? c.originalCode ?? c.code}-${i}`} data-course-row>
            {insertAt === i && dragging && (
              <div className="my-0.5 h-[2px] rounded bg-penn-blue" aria-hidden />
            )}
            <CourseRow
              course={c}
              color={colorOverrides?.[c.originalCode ?? c.code]}
              onOpen={(course) => onOpenCourse(course, semKey)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                onDragChange({ from: semKey, courseId: c.originalCode ?? c.code })
              }}
              onDragEnd={() => {
                setInsertAt(null)
                onDragChange(null)
              }}
            />
          </div>
        ))}
        {insertAt === courses.length && dragging && (
          <div className="my-0.5 h-[2px] rounded bg-penn-blue" aria-hidden />
        )}
        {courses.length === 0 && !dragging && (
          <p className="py-2 pl-3 text-xs text-ink/35 italic">Add a course to this semester</p>
        )}
      </div>

      {/* Present but quiet at rest — a first-time user must be able to see
          how to add a course without hovering. Engaging the card brings it
          to full strength; coarse pointers (touch) always get it. */}
      <button
        type="button"
        onClick={() => onAddCourse(semKey)}
        className="no-print mt-3 w-full rounded-md border border-dashed border-rule py-1.5 text-[0.71875rem] tracking-wide text-ink/45 opacity-45 transition-all duration-200 group-hover/card:opacity-100 hover:border-penn-blue hover:bg-penn-blue/3 hover:text-penn-blue focus-visible:opacity-100 pointer-coarse:opacity-100"
      >
        + Add course
      </button>
    </section>
  )
}
