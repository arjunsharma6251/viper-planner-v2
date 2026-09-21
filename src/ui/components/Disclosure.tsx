import { useState, type ReactNode } from 'react'
import { IconChevronDown } from './icons'

export interface DisclosureProps {
  title: ReactNode
  /** A short readout printed at the right of the header: a count, a status. */
  summary?: ReactNode
  /** Tone of the summary text. */
  tone?: 'good' | 'caution' | 'problem' | 'quiet'
  /** A colored bar on the header's left edge (bus identity). */
  accent?: string
  defaultOpen?: boolean
  /** Print the body even when collapsed on screen. */
  printOpen?: boolean
  children: ReactNode
}

const TONE: Record<NonNullable<DisclosureProps['tone']>, string> = {
  good: 'text-good',
  caution: 'text-caution',
  problem: 'text-penn-red',
  quiet: 'text-ink-3',
}

/**
 * One dropdown, the same everywhere: a full-width header with the title,
 * a readout, and a boxed chevron that reads as a button and turns when
 * open. The body is ruled off with a hairline on the left.
 */
export function Disclosure({ title, summary, tone = 'quiet', accent, defaultOpen = false, printOpen, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-rule last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative flex w-full items-center gap-3 py-2.5 pr-2 pl-3 text-left transition-colors duration-100 hover:bg-tint-blue"
      >
        {accent && <span className={`absolute top-2 bottom-2 left-0 w-[3px] ${accent}`} aria-hidden />}
        <span className="label min-w-0 flex-1 !text-ink">{title}</span>
        {summary && <span className={['tag whitespace-nowrap', TONE[tone]].join(' ')}>{summary}</span>}
        <span
          className={[
            'flex h-6 w-6 shrink-0 items-center justify-center border border-rule-2 text-ink transition-[transform,border-color] duration-150',
            open ? 'rotate-180 border-ink' : '',
          ].join(' ')}
          aria-hidden
        >
          <IconChevronDown size={12} />
        </span>
      </button>
      <div className={['pb-2', open ? 'fade' : printOpen ? 'hidden print:block' : 'hidden'].join(' ')}>{children}</div>
    </div>
  )
}
