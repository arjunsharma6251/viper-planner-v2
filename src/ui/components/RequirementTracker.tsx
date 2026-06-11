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
 * One tracker row. Shows "5/7 satisfied" by default; click to expand into
 * which specific requirements are missing. Saturation grows with progress —
 * empty is dim, partial is muted, complete is solid Penn red.
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
        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/70"
      >
        <span className="flex-1 text-sm">{label}</span>
        <span
          className={[
            'font-mono text-xs',
            complete ? 'font-semibold text-penn-red' : pct > 0 ? 'text-ink/70' : 'text-ink/40',
          ].join(' ')}
        >
          {done}/{total}
        </span>
        <span className={complete ? 'text-green-700' : 'text-ink/30'} aria-hidden>
          {complete ? '✓' : '▾'}
        </span>
        {complete && <span className="sr-only">satisfied</span>}
      </button>
      <div className="ml-2 h-0.5 rounded bg-ink/10" aria-hidden>
        <div
          className={complete ? 'h-0.5 rounded bg-penn-red' : 'h-0.5 rounded bg-penn-red/40'}
          style={{ width: `${Math.min(pct, 1) * 100}%` }}
        />
      </div>
      {open && !complete && (
        <ul className="mt-1 ml-2 list-none text-xs text-ink/60">
          {missing.map((m) => (
            <li key={m} className="py-0.5">
              · {m} <span className="text-ink/40">— not yet satisfied</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The trackers panel — a single visual region with subtle background tone.
 * FA, Sectors, energy, dual-CU minimum.
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
    <aside className="rounded-xl bg-ink/3 p-5" aria-label="Requirement trackers">
      <h2 className="mb-3 font-display text-lg font-semibold">Requirements</h2>
      <div className="flex flex-col gap-2">
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
        <div className="mt-1 flex items-baseline justify-between px-2 text-sm">
          <span>Total CU</span>
          <span
            className={
              summary.meetsDualMin
                ? 'font-mono text-xs font-semibold text-penn-red'
                : 'font-mono text-xs text-ink/70'
            }
          >
            {summary.totalCU} / 40 {summary.meetsDualMin && '✓'}
          </span>
        </div>
      </div>
      {allGreen && (
        <p className="mt-4 animate-[fadeIn_400ms_ease-out] rounded-md bg-white px-3 py-2 text-sm text-green-800">
          ✓ Your plan satisfies every tracked requirement — you'll graduate on time.
        </p>
      )}
    </aside>
  )
}
