import { useMemo, useState } from 'react'
import type { SemesterKey } from '../../data/semesters'
import { semesterLabel } from '../../data/semesters'
import { COURSES } from '../../data/courses'
import { Modal } from './Modal'

export interface AddCourseModalProps {
  semKey: SemesterKey
  gradYear: number | null
  onClose: () => void
  onAdd: (code: string, title: string, cu: number) => void
}

/**
 * Add a course — the one place typing is the right interface. Search the
 * catalog first (recognition over recall); fall back to a custom entry for
 * codes we don't have. Never invent catalog data for unknown codes.
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
                onAdd(code, c.title, c.cu)
                onClose()
              }}
              className="flex items-baseline gap-3 border-b border-dotted border-hairline px-1 py-2 text-left text-[13px] last:border-b-0 hover:bg-[#fbf8f0]"
            >
              <span className="w-[4.6rem] shrink-0 font-mono text-[11px] font-medium text-penn-blue">
                {code}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink/85">{c.title}</span>
              <span className="tnum font-mono text-[11px] text-ink-soft">{c.cu}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && matches.length === 0 && (
        <div className="rounded-sm border border-dashed border-rule bg-cream/50 p-3.5">
          <p className="text-[13px] text-ink/75">
            Not in the catalog. Add <span className="font-mono text-[12px]">{customCode}</span>{' '}
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
              className="w-16 rounded-sm border border-hairline bg-paper px-2 py-1.5 font-mono text-[12px]"
            />
            <button
              type="button"
              disabled={!customValid || exactKnown}
              onClick={() => {
                onAdd(customCode, customCode, cuValue)
                onClose()
              }}
              className="rounded-sm bg-penn-blue px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-penn-blue-soft disabled:opacity-40"
            >
              Add custom course
            </button>
          </div>
          {!customValid && (
            <p className="mt-2 text-[11px] text-ink/45 italic">
              Use a real Penn course code format, like "EESC 2300".
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
