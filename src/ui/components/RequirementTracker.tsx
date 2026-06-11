import { useState } from 'react'
import type { PlanSummary } from '../../plan/types'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'

interface TrackerRowProps {
  label: string
  done: number
  total: number
  /** Names of the missing items, shown when expanded. */
  missing: string[]
}

/**
 * One audit line: label, leader dots, count — like a table of contents.
 * Click expands into exactly which requirements are missing. The thin
 * progress rule beneath saturates as it fills; complete is solid Penn red.
 */
function TrackerRow({ label, done, total, missing }: TrackerRowProps) {
  const [open, setOpen] = useState(false)
  const complete = done >= total
  const pct = total === 0 ? 1 : done / total
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-baseline rounded-sm px-1 py-1.5 text-left transition-colors duration-150 hover:bg-[#fbf8f0]"
      >
        <span className="text-[0.8125rem] text-ink/85">{label}</span>
        <span className="leader" aria-hidden />
        <span
          className={[
            'tnum font-mono text-[0.75rem]',
            complete ? 'font-semibold text-penn-red' : pct > 0 ? 'text-ink/75' : 'text-ink/40',
          ].join(' ')}
        >
          {done}/{total}
        </span>
        <span
          className={`ml-2 w-3 text-center text-[0.625rem] ${complete ? 'text-[#1e6b38]' : 'text-ink/30'}`}
          aria-hidden
        >
          {complete ? '✓' : open ? '▾' : '▸'}
        </span>
        {complete && <span className="sr-only">satisfied</span>}
      </button>
      <div className="mx-1 h-[2px] overflow-hidden rounded bg-ink/8" aria-hidden>
        <div
          className={[
            'h-full rounded transition-[width] duration-300 ease-out',
            complete ? 'bg-penn-red' : 'bg-penn-red/35',
          ].join(' ')}
          style={{ width: `${Math.min(pct, 1) * 100}%` }}
        />
      </div>
      {open && !complete && (
        <ul className="mt-1.5 ml-1 list-none border-l border-rule/60 pl-3 text-xs text-ink-soft">
          {missing.map((m) => (
            <li key={m} className="py-0.5">
              {m} <span className="text-ink/35 italic">— not yet satisfied</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The Degree Audit panel — a single document region opened with a double
 * rule, set like an official audit summary.
 */
export function RequirementTracker({ summary }: { summary: PlanSummary }) {
  const faMissing = FA_REQUIREMENTS.filter((fa) => summary.unfulfilledFA.includes(fa.id)).map(
    (fa) => fa.label,
  )
  const secMissing = SECTORS.filter((s) => summary.unfulfilledSec.includes(s.id)).map(
    (s) => s.label,
  )
  const allGreen =
    summary.meetsDualMin &&
    summary.meetsEnergyReq &&
    summary.unfulfilledFA.length === 0 &&
    summary.unfulfilledSec.length === 0

  return (
    <aside
      className="rise print-block rounded-md border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      aria-label="Degree audit"
      style={{ '--i': 2 } as React.CSSProperties}
    >
      <p className="smallcaps mb-1">Degree audit</p>
      <hr className="double-rule mb-4" />
      <div className="flex flex-col gap-2.5">
        <TrackerRow
          label="Foundational Approaches"
          done={summary.fulfilledFA.length}
          total={FA_REQUIREMENTS.length}
          missing={faMissing}
        />
        <TrackerRow
          label="Sectors"
          done={summary.fulfilledSec.length}
          total={SECTORS.length}
          missing={secMissing}
        />
        <TrackerRow
          label="Energy courses"
          done={Math.min(summary.energyCoursesCount, 3)}
          total={3}
          missing={summary.meetsEnergyReq ? [] : ['VIPER-approved energy courses']}
        />
        <div className="mt-1 flex items-baseline px-1 text-[0.8125rem]">
          <span className="text-ink/85">Total CU</span>
          <span className="leader" aria-hidden />
          <span
            className={
              summary.meetsDualMin
                ? 'tnum font-mono text-[0.75rem] font-semibold text-penn-red'
                : 'tnum font-mono text-[0.75rem] text-ink/75'
            }
          >
            {summary.totalCU} / 40
          </span>
          <span
            className={`ml-2 w-3 text-center text-[0.625rem] ${summary.meetsDualMin ? 'text-[#1e6b38]' : 'text-ink/30'}`}
            aria-hidden
          >
            {summary.meetsDualMin ? '✓' : ''}
          </span>
        </div>
      </div>
      {allGreen && (
        <p className="animate-fade mt-4 rounded-sm border border-[#1e6b38]/25 bg-[#f2f7f0] px-3 py-2 text-[0.75rem] leading-relaxed text-[#1e5230]">
          ✓ Every tracked requirement is satisfied — this plan graduates on time.
        </p>
      )}
    </aside>
  )
}
