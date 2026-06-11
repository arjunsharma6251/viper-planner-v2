import { useState, type ReactNode } from 'react'
import { VIPER_PROGRAM } from '../../data/viper-program'
import { COMMON_DOUBLE_COUNTS } from '../../data/common-double-counts'
import { pcrUrlFor } from '../../utils/pcr'

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-1 py-2.5 text-left transition-colors duration-150 hover:bg-[#fbf8f0]"
      >
        <span className="text-[13px] font-medium text-ink/85">{title}</span>
        <span className="text-[10px] text-ink/35" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="animate-fade px-1 pb-3">{children}</div>}
    </div>
  )
}

/**
 * Reference panels: the program rules and the common double-counts list —
 * the two things students otherwise ask their advisor. Read-only, quiet,
 * one click away (progressive disclosure).
 */
export function ReferencePanels() {
  return (
    <aside
      className="rise print-block rounded-md border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      aria-label="Reference"
      style={{ '--i': 3 } as React.CSSProperties}
    >
      <p className="smallcaps mb-1">Reference</p>
      <hr className="double-rule mb-2" />

      <Disclosure title="VIPER program rules">
        <ul className="flex flex-col gap-1.5 text-[12px] leading-relaxed text-ink-soft">
          <li>
            Dual-degree minimum:{' '}
            <span className="tnum font-mono text-[11px] text-ink">
              {VIPER_PROGRAM.minTotalCU} CU
            </span>{' '}
            total (BA 36 + BSE 40 with overlap).
          </li>
          <li>
            Energy electives:{' '}
            <span className="tnum font-mono text-[11px] text-ink">
              {VIPER_PROGRAM.minEnergyCourses}
            </span>{' '}
            VIPER-approved courses.
          </li>
          <li>
            Summer research: Year 1 is mandatory; Year 2 is typical; Year 3 happens for
            some students.
          </li>
          <li>
            Thermodynamics requirement — one of:{' '}
            <span className="font-mono text-[11px] text-ink">
              {VIPER_PROGRAM.thermoOptions.join(', ')}
            </span>
          </li>
          <li>
            Fixed program courses:{' '}
            <span className="font-mono text-[11px] text-ink">
              VIPR 1200, VIPR 1210, VIPR 1300×{VIPER_PROGRAM.minSummerResearch}+
            </span>
          </li>
        </ul>
      </Disclosure>

      <Disclosure title="Common double-counts">
        <p className="mb-2 text-[11px] text-ink/45 italic">
          Courses VIPER students routinely double-count. Click through to PCR before
          committing.
        </p>
        <ul className="flex flex-col">
          {COMMON_DOUBLE_COUNTS.map((dc) => {
            const url = pcrUrlFor({ code: dc.code })
            return (
              <li
                key={dc.code}
                className="flex items-baseline gap-2 border-b border-dotted border-hairline py-1.5 last:border-b-0"
              >
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-[4.6rem] shrink-0 font-mono text-[11px] font-medium text-penn-blue hover:underline"
                  >
                    {dc.code}
                  </a>
                ) : (
                  <span className="w-[4.6rem] shrink-0 font-mono text-[11px] text-ink">
                    {dc.code}
                  </span>
                )}
                <span className="text-[11px] leading-relaxed text-ink-soft">
                  {dc.fulfills.join(' · ')}
                </span>
              </li>
            )
          })}
        </ul>
      </Disclosure>
    </aside>
  )
}
