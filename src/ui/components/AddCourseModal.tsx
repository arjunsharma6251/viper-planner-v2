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
    <Modal title={`Add a course — ${label.season}`} onClose={onClose}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by code or title (e.g. CHEM 2410)"
        className="mb-3 w-full rounded-md border border-hairline px-3 py-2 text-sm"
        aria-label="Search courses"
      />

      {matches.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {matches.map(([code, c]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                onAdd(code, c.title, c.cu)
                onClose()
              }}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-cream"
            >
              <span className="w-24 shrink-0 font-mono text-xs text-penn-blue">{code}</span>
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <span className="font-mono text-xs text-ink/50">{c.cu}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && matches.length === 0 && (
        <div className="rounded-md bg-cream p-3">
          <p className="text-sm text-ink/70">
            Not in the catalog. Add <span className="font-mono text-xs">{customCode}</span> as a
            custom course?
          </p>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-ink/60" htmlFor="custom-cu">
              CU
            </label>
            <input
              id="custom-cu"
              value={customCu}
              onChange={(e) => setCustomCu(e.target.value)}
              className="w-16 rounded-md border border-hairline px-2 py-1 font-mono text-sm"
            />
            <button
              type="button"
              disabled={!customValid || exactKnown}
              onClick={() => {
                onAdd(customCode, customCode, cuValue)
                onClose()
              }}
              className="rounded-md bg-penn-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Add custom course
            </button>
          </div>
          {!customValid && (
            <p className="mt-1.5 text-xs text-ink/50">
              Use a real Penn course code format, like "EESC 2300".
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
