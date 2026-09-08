import { useMemo, useState } from 'react'
import type { SemesterKey } from '../../data/semesters'
import { semesterLabel } from '../../data/semesters'
import { COURSES } from '../../data/courses'
import type { CourseDraft, FoundationId } from '../../plan/types'
import { NCC_FOUNDATION_LABELS } from '../../plan/ncc-audit'
import { Modal } from './Modal'

export interface AddCourseModalProps {
  semKey: SemesterKey
  gradYear: number | null
  onClose: () => void
  onAdd: (draft: CourseDraft) => void
}

/**
 * Requirement slots a student can reserve a term for without naming the
 * course yet — the "edits that aren't a standard course". Each becomes an
 * open-slot row (dotted "open" tag) whose intent feeds the degree audit.
 */
interface SlotOption {
  id: string
  label: string
  draft: Omit<CourseDraft, 'code'>
}

const FOUNDATION_IDS: FoundationId[] = [
  'ncc-kite',
  'ncc-key',
  'ncc-fys',
  'ncc-writ',
  'ncc-pad',
  'ncc-lang',
]

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
        draft: {
          title: 'Social Sciences Distribution',
          cu: 1,
          isPlaceholder: true,
          intent: { distribution: 'SS' },
        },
      },
      {
        id: 'dist-h',
        label: 'Humanities',
        draft: {
          title: 'Humanities Distribution',
          cu: 1,
          isPlaceholder: true,
          intent: { distribution: 'H' },
        },
      },
    ],
  },
  {
    group: 'Other',
    options: [
      {
        id: 'free',
        label: 'Free elective',
        draft: { title: 'Free Elective', cu: 1, isPlaceholder: true },
      },
    ],
  },
]

/**
 * Add a course — the one place typing is the right interface. Search the
 * catalog first (recognition over recall); fall back to a custom entry for
 * codes we don't have; or reserve an open requirement slot to fill later.
 * Never invent catalog data for unknown codes.
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
    <Modal eyebrow={`${label.year} · ${label.season}`} title="Add a course" onClose={onClose}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by code or title (e.g. CHEM 2410)"
        className="mb-3 w-full rounded-sm border border-hairline bg-paper px-3 py-2.5 text-sm placeholder:text-ink/30"
        aria-label="Search courses"
      />

      {matches.length > 0 && (
        <div className="flex flex-col">
          {matches.map(([code, c]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                onAdd({ code, title: c.title, cu: c.cu })
                onClose()
              }}
              className="flex items-baseline gap-3 border-b border-dotted border-hairline px-1 py-2 text-left text-[0.8125rem] last:border-b-0 hover:bg-[#fbf8f0]"
            >
              <span className="w-[4.6rem] shrink-0 font-mono text-[0.6875rem] font-medium text-penn-blue">
                {code}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink/85">{c.title}</span>
              <span className="tnum font-mono text-[0.6875rem] text-ink-soft">{c.cu}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && matches.length === 0 && (
        <div className="rounded-sm border border-dashed border-rule bg-cream/50 p-3.5">
          <p className="text-[0.8125rem] text-ink/75">
            Not in the catalog. Add <span className="font-mono text-[0.75rem]">{customCode}</span>{' '}
            as a custom course?
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <label className="smallcaps" htmlFor="custom-cu">
              CU
            </label>
            <input
              id="custom-cu"
              value={customCu}
              onChange={(e) => setCustomCu(e.target.value)}
              className="w-16 rounded-sm border border-hairline bg-paper px-2 py-1.5 font-mono text-[0.75rem]"
            />
            <button
              type="button"
              disabled={!customValid || exactKnown}
              onClick={() => {
                onAdd({ code: customCode, title: customCode, cu: cuValue })
                onClose()
              }}
              className="rounded-sm bg-penn-blue px-3.5 py-1.5 text-[0.75rem] font-medium text-white transition-colors hover:bg-penn-blue-soft disabled:opacity-40"
            >
              Add custom course
            </button>
          </div>
          {!customValid && (
            <p className="mt-2 text-[0.6875rem] text-ink/45 italic">
              Use a real Penn course code format, like "EESC 2300".
            </p>
          )}
        </div>
      )}

      {/* ── Open requirement slots — only while the search is idle ── */}
      {query.trim().length < 2 && (
        <div className="mt-1">
          <p className="smallcaps mb-1 !text-[0.5625rem] !text-ink/45">
            Or reserve an open slot to fill later
          </p>
          <div className="flex flex-col gap-2">
            {SLOT_OPTIONS.map((g) => (
              <div key={g.group} className="flex flex-wrap items-baseline gap-1.5">
                <span className="mr-1 w-[7.5rem] shrink-0 text-[0.6875rem] text-ink/45">
                  {g.group}
                </span>
                {g.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => addSlot(opt)}
                    className="rounded-full border border-dotted border-rule px-2.5 py-1 text-[0.71875rem] text-ink/75 transition-colors duration-150 hover:border-penn-blue hover:bg-penn-blue/4 hover:text-penn-blue"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
