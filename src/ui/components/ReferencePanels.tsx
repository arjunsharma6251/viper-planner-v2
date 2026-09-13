import { useState, type ReactNode } from 'react'
import { VIPER_PROGRAM } from '../../data/viper-program'
import { COMMON_DOUBLE_COUNTS } from '../../data/common-double-counts'
import { pcrUrlFor } from '../../utils/pcr'
import { IconChevronDown, IconChevronRight } from './icons'

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-rule last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2 py-2 text-left transition-colors duration-100 hover:bg-tint-blue"
      >
        <span className="text-[0.8125rem] font-medium text-ink">{title}</span>
        <span className="text-ink-3" aria-hidden>
          {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </span>
      </button>
      {open && <div className="fade px-2 pb-3">{children}</div>}
    </div>
  )
}

const mono = 'tag text-ink'

/**
 * Reference: the program rules and the common double-counts list, the two
 * things students otherwise ask their advisor. Read-only, one click away.
 */
export function ReferencePanels() {
  return (
    <section className="panel print-block" aria-label="Reference">
      <h2 className="label border-b border-ink px-2 py-2 !text-ink">Reference</h2>

      <Disclosure title="VIPER program rules">
        <ul className="flex flex-col gap-1.5 text-[0.75rem] leading-relaxed text-ink-2">
          <li>
            Dual-degree minimum: <span className={mono}>{VIPER_PROGRAM.minTotalCU} CU</span> total (BA 36 + BSE 40
            with overlap).
          </li>
          <li>
            Energy electives: <span className={mono}>{VIPER_PROGRAM.minEnergyCourses}</span> VIPER-approved courses.
          </li>
          <li>Summer research: Year 1 is mandatory; Year 2 is typical; Year 3 happens for some students.</li>
          <li>
            Thermodynamics requirement, one of:{' '}
            <span className={mono}>{VIPER_PROGRAM.thermoOptions.join(', ')}</span>
          </li>
          <li>
            Fixed program courses:{' '}
            <span className={mono}>VIPR 1200, VIPR 1210, VIPR 1300×{VIPER_PROGRAM.minSummerResearch}+</span>
          </li>
        </ul>
      </Disclosure>

      <Disclosure title="New College Curriculum">
        <ul className="flex flex-col gap-1.5 text-[0.75rem] leading-relaxed text-ink-2">
          <li>
            <span className="text-ink">Foundations:</span> Kite, Key, First-Year Seminar, Perspectives and
            Difference, Language (0–2 CU), Critical Writing. 1 CU each except Language.
          </li>
          <li>
            <span className="text-ink">Distribution 12 + 5 + 3:</span> the 12 is your major's division (Natural
            Sciences) and is covered by major work. The 5 and 3 go to Social Sciences and Humanities in either
            order.
          </li>
          <li>First-Year Seminar and Perspectives and Difference may also count within the distribution.</li>
          <li>
            <span className="text-ink">Approved VIPER overlap:</span> VIPR 1200 / 1210 count as the First-Year
            Seminar. Any other waiver or double-count needs approval. Ask before you plan on it.
          </li>
          <li>
            <span className="text-ink">SEAS general electives, 7 CU:</span> Writing seminar, Engineering ethics
            (VIPR 1200 / 1210), and 5 SS / H / TBS courses split by engineering major.
          </li>
          <li>
            BA total <span className={mono}>36+ CU</span>, with 11–13+ CU of electives for majors, minors and
            exploration.
          </li>
        </ul>
      </Disclosure>

      <Disclosure title="Common double-counts">
        <p className="mb-2 text-[0.6875rem] text-ink-3">
          Courses VIPER students routinely double-count. Check PCR before committing.
        </p>
        <ul className="flex flex-col">
          {COMMON_DOUBLE_COUNTS.map((dc) => {
            const url = pcrUrlFor({ code: dc.code })
            return (
              <li key={dc.code} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 border-b border-rule py-1.5 last:border-b-0">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="tag text-penn-blue hover:underline">
                    {dc.code}
                  </a>
                ) : (
                  <span className="tag text-ink">{dc.code}</span>
                )}
                <span className="text-[0.6875rem] leading-relaxed text-ink-2">{dc.fulfills.join(' · ')}</span>
              </li>
            )
          })}
        </ul>
      </Disclosure>
    </section>
  )
}
