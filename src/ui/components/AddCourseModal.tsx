import { useMemo, useState } from 'react'
import type { SemesterKey } from '../../data/semesters'
import { semesterLabel } from '../../data/semesters'
import { COURSES } from '../../data/courses'
import type { CourseDraft, FoundationId } from '../../plan/types'
import { NCC_FOUNDATION_LABELS } from '../../plan/ncc-audit'
import { Modal } from './Modal'
import { IconOpenBreaker, IconSearch } from './icons'

export interface AddCourseModalProps {
  semKey: SemesterKey
  gradYear: number | null
  onClose: () => void
  onAdd: (draft: CourseDraft) => void
}

/**
 * Requirement slots a student can reserve a term for without naming the
 * course yet. Each becomes an open-slot row whose intent feeds the audit.
 */
interface SlotOption {
  id: string
  label: string
  draft: Omit<CourseDraft, 'code'>
}

const FOUNDATION_IDS: FoundationId[] = ['ncc-kite', 'ncc-key', 'ncc-fys', 'ncc-writ', 'ncc-pad', 'ncc-lang']

const SLOT_OPTIONS: ReadonlyArray<{ group: string; options: SlotOption[] }> = [
  {
    group: 'NCC Foundation',
    options: FOUNDATION_IDS.map((id) => ({
      id,
      label: NCC_FOUNDATION_LABELS[id],
      draft: {
        title: `${NCC_FOUNDATION_LABELS[id]} Foundation`,
        cu: 1,
        isPlaceholder: true,
        slotId: id,
        intent: { foundation: id },
      },
    })),
  },
  {
    group: 'NCC Distribution',
    options: [
      {
        id: 'dist-ss',
        label: 'Social Sciences',
        draft: { title: 'Social Sciences Distribution', cu: 1, isPlaceholder: true, intent: { distribution: 'SS' } },
      },
      {
        id: 'dist-h',
        label: 'Humanities',
        draft: { title: 'Humanities Distribution', cu: 1, isPlaceholder: true, intent: { distribution: 'H' } },
      },
    ],
  },
  {
    group: 'Other',
    options: [{ id: 'free', label: 'Free elective', draft: { title: 'Free Elective', cu: 1, isPlaceholder: true } }],
  },
]

/**
 * Add a course: the one place typing is the right interface. Search the
 * catalog first; fall back to a custom entry for codes we do not have; or
 * reserve an open slot to fill later. Never invent catalog data.
 */
export function AddCourseModal({ semKey, gradYear, onClose, onAdd }: AddCourseModalProps) {
  const [query, setQuery] = useState('')
  const [customCu, setCustomCu] = useState('1')
  const label = semesterLabel(semKey, gradYear ?? undefined)

  const matches = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (q.length < 2) return []
    return Object.entries(COURSES)
      .filter(([code, c]) => code.includes(q) || c.title.toUpperCase().includes(q))
      .slice(0, 8)
  }, [query])

  const exactKnown = query.trim().toUpperCase() in COURSES
  const customCode = query.trim().toUpperCase()
  const cuValue = Number.parseFloat(customCu)
  const customValid =
    /^[A-Z]{2,5} \d{4}$/.test(customCode) && Number.isFinite(cuValue) && cuValue > 0 && cuValue <= 2

  function addSlot(opt: SlotOption) {
    // The leading dash marks an open slot everywhere in the UI; the
    // mutation layer makes the code unique within the plan.
    onAdd({ code: `— ${opt.id}`, ...opt.draft })
    onClose()
  }

  return (
    <Modal
      title="Add a course"
      onClose={onClose}
      meta={
        <span className="tag text-ink-3">
          {label.year} · {label.season}
        </span>
      }
    >
      <label className="label mb-1.5 block" htmlFor="course-search">
        Search the catalog
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3">
          <IconSearch size={14} />
        </span>
        <input
          id="course-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Code or title, e.g. CHEM 2410"
          className="field w-full !pl-8"
          aria-label="Search courses"
        />
      </div>

      {matches.length > 0 && (
        <div className="mt-3 border-t border-ink">
          {matches.map(([code, c]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                onAdd({ code, title: c.title, cu: c.cu })
                onClose()
              }}
              className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-3 border-b border-rule px-1 py-2 text-left text-[0.8125rem] transition-colors duration-100 hover:bg-tint-blue"
            >
              <span className="tag text-ink">{code}</span>
              <span className="truncate text-ink">{c.title}</span>
              <span className="tag text-right text-ink-2">{c.cu}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && matches.length === 0 && (
        <div className="mt-3 border border-dashed border-rule-2 p-3">
          <p className="text-[0.8125rem] text-ink">
            <span className="tag">{customCode}</span> is not in the catalog. Add it as a custom course?
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <label className="label" htmlFor="custom-cu">
              CU
            </label>
            <input
              id="custom-cu"
              value={customCu}
              onChange={(e) => setCustomCu(e.target.value)}
              className="field w-16 font-mono !text-[0.75rem]"
            />
            <button
              type="button"
              disabled={!customValid || exactKnown}
              onClick={() => {
                onAdd({ code: customCode, title: customCode, cu: cuValue })
                onClose()
              }}
              className="btn btn-primary"
            >
              Add custom course
            </button>
          </div>
          {!customValid && (
            <p className="mt-2 text-[0.6875rem] text-ink-3">Use a real Penn course code format, like EESC 2300.</p>
          )}
        </div>
      )}

      {query.trim().length < 2 && (
        <div className="mt-5">
          <p className="label mb-1 flex items-center gap-1.5">
            <IconOpenBreaker size={14} />
            Or reserve an open slot to fill later
          </p>
          <p className="mb-2.5 text-[0.75rem] leading-snug text-ink-2">
            An open slot holds the requirement in this term and counts in the audit until you choose the course.
          </p>
          <div className="flex flex-col gap-2.5">
            {SLOT_OPTIONS.map((g) => (
              <div key={g.group} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2">
                <span className="label pt-2 !text-[0.625rem] !text-ink-3">{g.group}</span>
                <div className="flex flex-wrap gap-1.5">
                  {g.options.map((opt) => (
                    <button key={opt.id} type="button" onClick={() => addSlot(opt)} className="btn !py-1.5 !text-[0.6875rem]">
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
