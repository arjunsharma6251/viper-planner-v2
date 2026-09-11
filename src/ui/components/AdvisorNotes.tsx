import { useState } from 'react'
import type { AdvisorNote, NoteSeverity } from '../../plan/advisor-notes'

const TONE: Record<NoteSeverity, { dot: string; label: string }> = {
  error: { dot: 'bg-penn-red', label: 'Needs a change' },
  warning: { dot: 'bg-[#b8860b]', label: 'Needs a form or a conversation' },
  info: { dot: 'bg-[#1e6b38]', label: 'All clear' },
}

/**
 * The constraint checks, phrased for the advising conversation. Collapsed
 * to a one-line count by default; expands into the full list, which also
 * prints so it can go on paper with the plan.
 */
export function AdvisorNotes({ notes }: { notes: AdvisorNote[] }) {
  const [open, setOpen] = useState(false)
  const errors = notes.filter((n) => n.severity === 'error').length
  const warnings = notes.filter((n) => n.severity === 'warning').length
  const summary =
    errors === 0 && warnings === 0
      ? 'Nothing to flag'
      : [errors > 0 && `${errors} to fix`, warnings > 0 && `${warnings} to discuss`]
          .filter(Boolean)
          .join(' · ')

  return (
    <aside
      className="rise print-block rounded-lg border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      aria-label="Advisor notes"
      style={{ '--i': 3 } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="no-print flex w-full items-baseline justify-between text-left"
      >
        <span className="smallcaps">Advisor notes</span>
        <span className="flex items-baseline gap-2">
          <span className="text-[0.6875rem] text-ink/50">{summary}</span>
          <span className="text-[0.625rem] text-ink/35" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </span>
      </button>
      <p className="smallcaps hidden print:block">Advisor notes</p>
      <hr className="double-rule mt-1 mb-3" />
      {!open && (
        <p className="no-print text-[0.75rem] leading-relaxed text-ink/55">
          {errors === 0 && warnings === 0
            ? 'Every semester is within policy and every tracked requirement is planned.'
            : 'What an advisor will ask about, in order of urgency. Open to read them; they print with the plan.'}
        </p>
      )}
      <ul className={['flex flex-col gap-2.5', open ? '' : 'hidden print:flex'].join(' ')}>
        {notes.map((n, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[0.75rem] leading-relaxed">
            <span
              aria-hidden
              className={`mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full ${TONE[n.severity].dot}`}
            />
            <span className="min-w-0">
              <span className="font-medium text-ink/85">{n.source}.</span>{' '}
              <span className="text-ink-soft">{n.text}</span>
              <span className="sr-only"> ({TONE[n.severity].label})</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
