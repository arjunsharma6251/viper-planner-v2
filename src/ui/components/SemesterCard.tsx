import { useState, type DragEvent } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { isSummerSem } from '../../data/semesters'
import { CourseRow, ROW_COLUMNS, ROW_COLUMNS_COMPACT } from './CourseRow'
import { IconExternal, IconPlus } from './icons'
import { MAX_CU_FORM_URL, loadStatus, type LoadTone } from '../load'

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
  /** Course id whose detail modal is open (inverts that row). */
  selectedId?: string | null
}

const TONE_TEXT: Record<LoadTone, string> = {
  normal: 'text-ink-2',
  caution: 'text-caution',
  problem: 'text-penn-red',
}
/**
 * A feeder panel: the term's name and CU readout, a cap note only when
 * the term is over one, then the breakers (courses) in the fixed column
 * ruling, then the add cell. Summers are judged separately.
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
  selectedId,
}: SemesterCardProps) {
  const summer = isSummerSem(semKey)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const firstSemester = semKey === 'fall-y1'
  const status = loadStatus(load, summer, firstSemester)

  function handleDragOver(e: DragEvent<HTMLElement>) {
    if (!dragging) return
    e.preventDefault()
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-course-row]'))
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

  function handleDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault()
    if (dragging && insertAt !== null) onMove(dragging.from, semKey, dragging.courseId, insertAt)
    setInsertAt(null)
    onDragChange(null)
  }

  const receiving = insertAt !== null && !!dragging

  return (
    <section
      aria-label={`${yearLabel} ${seasonLabel}`}
      className={[
        'print-block group/panel flex h-full flex-col transition-colors duration-100',
        summer ? 'border border-dashed border-rule-2' : 'panel',
        receiving ? 'bg-tint-blue' : '',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={() => setInsertAt(null)}
      onDrop={handleDrop}
    >
      <header className="px-3 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-cond text-[0.9375rem] leading-none font-semibold tracking-[0.04em] text-ink uppercase">
            {seasonLabel}
          </h3>
          <span className={['tag whitespace-nowrap', TONE_TEXT[status.tone]].join(' ')}>{load.toFixed(1)} CU</span>
        </div>
        {status.word && (
          <p className={['mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] leading-snug', TONE_TEXT[status.tone]].join(' ')} role="status">
            {status.word}
            {status.form && (
              <a
                href={MAX_CU_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-penn-blue hover:underline"
              >
                Max CU Increase form
                <IconExternal size={11} />
              </a>
            )}
          </p>
        )}
        <div className="mt-2 border-b border-rule" aria-hidden />
      </header>

      <div
        className={[
          'label grid border-b border-ink px-1 pb-1 !text-[0.625rem] !text-ink-3',
          summer ? `${ROW_COLUMNS_COMPACT} mt-2 gap-x-1.5 pl-5` : `${ROW_COLUMNS} gap-x-2 pl-6`,
        ].join(' ')}
        aria-hidden
      >
        <span>code</span>
        <span>course</span>
        {!summer && <span>counts</span>}
        <span className="text-right">CU</span>
      </div>

      <div className="flex-1">
        {courses.map((c, i) => {
          const id = c.originalCode ?? c.code
          return (
            <div key={`${c.placeholderCode ?? id}-${i}`}>
              {insertAt === i && dragging && <div className="h-[2px] bg-ink" aria-hidden />}
              <CourseRow
                course={c}
                color={colorOverrides?.[id]}
                compact={summer}
                selected={selectedId === id}
                dragging={dragging?.from === semKey && dragging.courseId === id}
                onOpen={(course) => onOpenCourse(course, semKey)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  onDragChange({ from: semKey, courseId: id })
                }}
                onDragEnd={() => {
                  setInsertAt(null)
                  onDragChange(null)
                }}
              />
            </div>
          )
        })}
        {insertAt === courses.length && dragging && <div className="h-[2px] bg-ink" aria-hidden />}
        {courses.length === 0 && !dragging && (
          <p className="px-5 py-3 text-[0.75rem] text-ink-3">Nothing planned this term.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddCourse(semKey)}
        className="no-print label m-2 flex items-center justify-center gap-1.5 border border-dashed border-rule-2 py-2 !text-ink-3 transition-colors duration-100 hover:border-ink hover:bg-sheet hover:!text-ink focus-visible:border-ink focus-visible:!text-ink"
      >
        <IconPlus size={12} />
        Add course
      </button>
    </section>
  )
}
