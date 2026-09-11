import { useState, type ReactNode } from 'react'
import type { PlanSummary } from '../../plan/types'
import type { NccAudit } from '../../plan/ncc-audit'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'

interface TrackerRowProps {
  label: string
  done: number
  total: number
  /** Names of the missing items, shown when expanded. */
  missing: string[]
  /** Optional richer expansion — replaces the plain missing list. */
  detail?: ReactNode
  /** Format for the count (default "n/total"). */
  unit?: 'count' | 'cu'
}

/**
 * One audit line: label, leader dots, count — like a table of contents.
 * Click expands into exactly which requirements are missing. The thin
 * progress rule beneath saturates as it fills; complete is solid Penn red.
 */
function TrackerRow({ label, done, total, missing, detail, unit = 'count' }: TrackerRowProps) {
  const [open, setOpen] = useState(false)
  const complete = done >= total
  const pct = total === 0 ? 1 : done / total
  const expandable = !complete || !!detail
  return (
    <div>
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
        className="flex w-full items-baseline rounded-sm px-1 py-1.5 text-left transition-colors duration-150 hover:bg-[#fbf8f0]"
      >
        <span className="text-[0.8125rem] text-ink/85">{label}</span>
        <span className="leader" aria-hidden />
        <span
          className={[
            'tnum font-mono text-[0.75rem] whitespace-nowrap',
            complete ? 'font-semibold text-penn-red' : pct > 0 ? 'text-ink/75' : 'text-ink/40',
          ].join(' ')}
        >
          {done}/{total}
          {unit === 'cu' && <span className="ml-1 text-[0.5625rem] text-ink/40">CU</span>}
        </span>
        <span
          className={`ml-2 w-3 text-center text-[0.625rem] ${complete ? 'text-[#1e6b38]' : 'text-ink/30'}`}
          aria-hidden
        >
          {complete && !open ? '✓' : open ? '▾' : '▸'}
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
      {open &&
        (detail ?? (
          <ul className="mt-1.5 ml-1 list-none border-l border-rule/60 pl-3 text-xs text-ink-soft">
            {missing.map((m) => (
              <li key={m} className="py-0.5">
                {m} <span className="text-ink/35 italic">— not yet satisfied</span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

function GroupHead({ children }: { children: ReactNode }) {
  return (
    <p className="smallcaps mt-1 mb-0.5 px-1 !text-[0.5625rem] !text-ink/45">{children}</p>
  )
}

/**
 * The Degree Audit panel — a single document region opened with a double
 * rule, set like an official audit summary. Two curricula are tracked:
 * the New College Curriculum (what VIPER '28+ is actually audited against)
 * and the legacy FA / Sector system the seed plan is built around.
 */
export function RequirementTracker({
  summary,
  ncc,
  curriculum = 'legacy',
}: {
  summary: PlanSummary
  ncc?: NccAudit
  /** 'ncc' hides the old FA / Sector rows — the plan has no such slots. */
  curriculum?: 'legacy' | 'ncc'
}) {
  const legacy = curriculum === 'legacy'
  const faMissing = FA_REQUIREMENTS.filter((fa) => summary.unfulfilledFA.includes(fa.id)).map(
    (fa) => fa.label,
  )
  const secMissing = SECTORS.filter((s) => summary.unfulfilledSec.includes(s.id)).map(
    (s) => s.label,
  )
  const nccGreen =
    !!ncc &&
    ncc.foundations.every((f) => f.state !== 'missing') &&
    ncc.divisions.every((d) => d.planned >= d.target) &&
    ncc.seas.every((r) => r.planned >= r.target)
  const allGreen =
    summary.meetsDualMin &&
    summary.meetsEnergyReq &&
    (legacy ? summary.unfulfilledFA.length === 0 && summary.unfulfilledSec.length === 0 : nccGreen)

  return (
    <aside
      className="rise print-block rounded-lg border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      aria-label="Degree audit"
      style={{ '--i': 2 } as React.CSSProperties}
    >
      <p className="smallcaps mb-1">Degree audit</p>
      <hr className="double-rule mb-3" />
      <div className="flex flex-col gap-2.5">
        {ncc && (
          <>
            <GroupHead>New College Curriculum</GroupHead>
            <TrackerRow
              label="Foundations"
              done={ncc.plannedFoundations}
              total={ncc.foundations.length}
              missing={ncc.foundations.filter((f) => f.state === 'missing').map((f) => f.label)}
              detail={
                <div className="mt-1.5 ml-1 border-l border-rule/60 pl-3 text-xs">
                  <ul className="list-none">
                    {ncc.foundations.map((f) => (
                      <li key={f.id} className="flex items-baseline gap-2 py-0.5">
                        <span
                          className={f.state === 'missing' ? 'text-ink/85' : 'text-ink-soft'}
                        >
                          {f.label}
                        </span>
                        <span className="text-ink/40 italic">
                          {f.state === 'missing' && 'nothing planned'}
                          {f.state === 'planned' && `— ${f.by}`}
                          {f.state === 'approved-overlap' && `— ${f.by} (approved overlap)`}
                          {f.state === 'credit' && `— ${f.by}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink/45">
                    To plan one: open any semester's <span className="font-medium">Add course</span>{' '}
                    and choose an open slot, or open a course and tick it under{' '}
                    <span className="font-medium">Tags</span>. First-Year Seminar and Perspectives
                    and Difference also count toward the distribution once their course is tagged
                    with a division.
                  </p>
                </div>
              }
            />
            {ncc.divisions.map((d) => (
              <TrackerRow
                key={d.id}
                label={d.label}
                done={d.planned}
                total={d.target}
                unit="cu"
                missing={[`${round1(d.target - d.planned)} CU of ${d.label}`]}
                detail={
                  <p className="mt-1.5 ml-1 border-l border-rule/60 pl-3 text-xs leading-relaxed text-ink-soft">
                    {d.planned >= d.target
                      ? `${d.planned} CU planned toward ${d.label}.`
                      : `${round1(d.target - d.planned)} CU still to plan. Add an open ${d.label} slot from any semester, or tag a course under Tags → Distribution.`}{' '}
                    The 5 and 3 CU targets go to either division; Natural Sciences (12 CU) is
                    covered by your major.
                  </p>
                }
              />
            ))}
            <GroupHead>SEAS general electives · 7 CU</GroupHead>
            {ncc.seas.map((r) => (
              <TrackerRow
                key={r.id}
                label={r.label}
                done={r.planned}
                total={r.target}
                unit="cu"
                missing={[`${r.target - r.planned} CU`]}
                detail={
                  <p className="mt-1.5 ml-1 border-l border-rule/60 pl-3 text-xs leading-relaxed text-ink-soft">
                    {r.hint}
                  </p>
                }
              />
            ))}
            {legacy && (
              <GroupHead>Legacy curriculum · Foundational Approaches &amp; Sectors</GroupHead>
            )}
          </>
        )}
        {legacy && (
          <>
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
          </>
        )}
        {ncc && <GroupHead>VIPER</GroupHead>}
        <TrackerRow
          label="Energy courses"
          done={Math.min(summary.energyCoursesCount, 3)}
          total={3}
          missing={['VIPER-approved energy courses']}
          detail={
            <p className="mt-1.5 ml-1 border-l border-rule/60 pl-3 text-xs leading-relaxed text-ink-soft">
              {summary.meetsEnergyReq
                ? `${summary.energyCoursesCount} energy-designated courses planned.`
                : `${3 - Math.min(summary.energyCoursesCount, 3)} more needed. Catalog energy courses count automatically; for any other approved course, open it and tick VIPER energy course under Tags.`}
            </p>
          }
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
          ✓ Every tracked requirement is planned — this plan graduates on time.
        </p>
      )}
    </aside>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
