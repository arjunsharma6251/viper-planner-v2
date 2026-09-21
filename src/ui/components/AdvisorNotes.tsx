import type { AdvisorNote, NoteSeverity } from '../../plan/advisor-notes'
import { Disclosure } from './Disclosure'
import { IconAlert, IconCheck } from './icons'

const TONE: Record<NoteSeverity, { cls: string; label: string }> = {
  error: { cls: 'text-penn-red', label: 'Needs a change' },
  warning: { cls: 'text-caution', label: 'Needs a form or a conversation' },
  info: { cls: 'text-good', label: 'All clear' },
}

/**
 * What an advisor will ask about, folded into one dropdown of the audit
 * panel. The header carries the count; the list prints with the plan.
 */
export function AdvisorNotes({ notes }: { notes: AdvisorNote[] }) {
  const errors = notes.filter((n) => n.severity === 'error').length
  const warnings = notes.filter((n) => n.severity === 'warning').length
  const clear = errors === 0 && warnings === 0
  const summary = clear
    ? 'nothing to flag'
    : [errors > 0 && `${errors} to fix`, warnings > 0 && `${warnings} to discuss`].filter(Boolean).join(' · ')

  return (
    <Disclosure title="Advisor notes" summary={summary} tone={clear ? 'good' : errors > 0 ? 'problem' : 'caution'} printOpen>
      <ul className="flex flex-col">
        {notes.map((n, i) => (
          <li key={i} className="flex items-start gap-2 py-1.5 pr-2 pl-3 text-[0.75rem] leading-snug">
            <span className={`mt-[1px] shrink-0 ${TONE[n.severity].cls}`} aria-hidden>
              {n.severity === 'info' ? <IconCheck size={12} /> : <IconAlert size={12} />}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{n.source}.</span> <span className="text-ink-2">{n.text}</span>
              <span className="sr-only"> ({TONE[n.severity].label})</span>
            </span>
          </li>
        ))}
      </ul>
    </Disclosure>
  )
}
