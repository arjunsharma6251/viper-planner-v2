import { useState } from 'react'
import type { AdvisorNote, NoteSeverity } from '../../plan/advisor-notes'
import { IconAlert, IconCheck, IconChevronDown, IconChevronRight } from './icons'

const TONE: Record<NoteSeverity, { cls: string; label: string }> = {
  error: { cls: 'text-penn-red', label: 'Needs a change' },
  warning: { cls: 'text-caution', label: 'Needs a form or a conversation' },
  info: { cls: 'text-good', label: 'All clear' },
}

/**
 * Alarms: the constraint checks, phrased for the advising conversation.
 * Collapsed to a count by default; the full list prints with the plan.
 */
export function AdvisorNotes({ notes }: { notes: AdvisorNote[] }) {
  const [open, setOpen] = useState(false)
  const errors = notes.filter((n) => n.severity === 'error').length
  const warnings = notes.filter((n) => n.severity === 'warning').length
  const clear = errors === 0 && warnings === 0
  const summary = clear
    ? 'Nothing to flag'
    : [errors > 0 && `${errors} to fix`, warnings > 0 && `${warnings} to discuss`].filter(Boolean).join(' · ')

  return (
    <section className="panel print-block" aria-label="Advisor notes">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="no-print flex w-full items-center justify-between gap-2 border-b border-ink px-2 py-2 text-left transition-colors duration-100 hover:bg-tint-blue"
      >
        <span className="label !text-ink">Alarms · advisor notes</span>
        <span className="flex items-center gap-2">
          <span className={['tag', clear ? 'text-good' : errors > 0 ? 'text-penn-red' : 'text-caution'].join(' ')}>
            {summary}
          </span>
          <span className="text-ink-3" aria-hidden>
            {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
          </span>
        </span>
      </button>
      <h2 className="label hidden border-b border-ink px-2 py-2 !text-ink print:block">Advisor notes</h2>
      {!open && (
        <p className="no-print px-2 py-2 text-[0.75rem] leading-snug text-ink-2">
          {clear
            ? 'Every semester is within policy and every tracked requirement is planned.'
            : 'What an advisor will ask about, in order of urgency. Open to read them; they print with the plan.'}
        </p>
      )}
      <ul className={['flex flex-col', open ? '' : 'hidden print:flex'].join(' ')}>
        {notes.map((n, i) => (
          <li key={i} className="flex items-start gap-2 border-b border-rule px-2 py-2 text-[0.75rem] leading-snug last:border-b-0">
            <span className={`mt-[1px] shrink-0 ${TONE[n.severity].cls}`} aria-hidden>
              {n.severity === 'info' ? <IconCheck size={12} /> : <IconAlert size={12} />}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{n.source}.</span>{' '}
              <span className="text-ink-2">{n.text}</span>
              <span className="sr-only"> ({TONE[n.severity].label})</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
