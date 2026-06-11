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
}

/**
 * Load classification (academic-year semesters only — summers are judged
 * differently and never get these labels).
 */
function loadTone(load: number, summer: boolean): { cls: string; word: string | null } {
  if (summer || load === 0) return { cls: 'text-ink/60', word: null }
  if (load > 7.5) return { cls: 'text-penn-red font-semibold', word: 'over hard cap' }
  if (load > 6.5) return { cls: 'text-penn-red', word: 'needs approval' }
  if (load > 5.5) return { cls: 'text-amber-600', word: 'overload' }
  return { cls: 'text-ink/60', word: null }
}

/**
 * A semester card: head (label + CU), body (course rows), foot (add button).
 * Self-contained without a border — background tone does the separation.
 * Drop targets light up during drag; an insertion indicator appears
 * immediately on drag-over.
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
}: SemesterCardProps) {
  const summer = isSummerSem(semKey)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const tone = loadTone(load, summer)
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
      className={[
        summer ? 'bg-cream' : 'bg-white/60',
        'rounded-xl p-5 transition-colors duration-150',
        dragging ? 'outline outline-1 outline-penn-blue/30' : '',
        insertAt !== null && dragging ? 'bg-penn-blue/5' : '',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={() => setInsertAt(null)}
      onDrop={handleDrop}
    >
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            {yearLabel}
          </div>
          <h3 className="text-sm font-semibold">{seasonLabel}</h3>
        </div>
        <div className={`font-mono text-xs ${tone.cls}`}>
          {load > 0 ? `${load} CU` : ''}
          {tone.word && <span className="ml-1">· {tone.word}</span>}
        </div>
      </header>

      <div className={crowded ? 'rounded-lg outline outline-1 outline-amber-400/60' : ''}>
        {courses.map((c, i) => (
          <div key={`${c.placeholderCode ?? c.originalCode ?? c.code}-${i}`} data-course-row>
            {insertAt === i && dragging && (
              <div className="my-0.5 h-0.5 rounded bg-penn-blue" aria-hidden />
            )}
            <CourseRow
              course={c}
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
          <div className="my-0.5 h-0.5 rounded bg-penn-blue" aria-hidden />
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddCourse(semKey)}
        className="mt-2 w-full rounded-md border border-dashed border-ink/20 py-1.5 text-xs text-ink/50 transition-colors duration-150 hover:border-penn-blue hover:text-penn-blue"
      >
        + Add a course
      </button>
    </section>
  )
}
