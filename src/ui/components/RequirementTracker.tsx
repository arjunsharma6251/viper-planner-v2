import { useState, type ReactNode } from 'react'
import type { PlanSummary } from '../../plan/types'
import type { NccAudit } from '../../plan/ncc-audit'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { useTrace, type Bus } from '../trace'
import { IconCheck, IconChevronDown, IconChevronRight } from './icons'

interface TrackerRowProps {
  label: string
  done: number
  total: number
  /** Names of the missing items, shown when expanded. */
  missing: string[]
  /** Optional richer expansion — replaces the plain missing list. */
  detail?: ReactNode
  unit?: 'count' | 'cu'
  /** Which bus this requirement loads; the row lights when a course traces it. */
  bus?: Bus
}

const BUS_TINT: Record<Bus, string> = {
  ba: 'bg-tint-blue',
  bse: 'bg-ink/6',
  energy: 'bg-tint-energy',
}
const BUS_FILL: Record<Bus, string> = {
  ba: 'bg-penn-blue',
  bse: 'bg-ink',
  energy: 'bg-energy',
}

/**
 * One loading line: label, meter, readout. Click expands into exactly what
 * is still missing. Complete rows carry a check and the word "satisfied".
 */
function TrackerRow({ label, done, total, missing, detail, unit = 'count', bus = 'ba' }: TrackerRowProps) {
  const [open, setOpen] = useState(false)
  const { lit } = useTrace()
  const complete = done >= total
  const pct = total === 0 ? 1 : done / total
  const expandable = !complete || !!detail
  const on = lit.has(bus)
  return (
    <div className={['transition-colors duration-150 ease-out', on ? BUS_TINT[bus] : ''].join(' ')}>
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
        className="grid w-full grid-cols-[minmax(0,1fr)_3.5rem_3.25rem_1rem] items-center gap-x-2 px-2 py-2 text-left transition-colors duration-100 hover:bg-tint-blue"
      >
        <span className="truncate text-[0.8125rem] text-ink">{label}</span>
        <span className="meter !h-[5px]" aria-hidden>
          <span className={`fill ${BUS_FILL[bus]}`} style={{ transform: `scaleX(${Math.min(pct, 1)})` }} />
        </span>
        <span className={['tag text-right whitespace-nowrap', complete ? 'text-ink' : 'text-ink-2'].join(' ')}>
          {done}/{total}
          {unit === 'cu' && <span className="label ml-0.5 !text-[0.625rem] !text-ink-3">CU</span>}
        </span>
        <span className="flex justify-end text-ink-3" aria-hidden>
          {complete && !open ? (
            <span className="text-good">
              <IconCheck size={12} />
            </span>
          ) : expandable ? (
            open ? (
              <IconChevronDown size={12} />
            ) : (
              <IconChevronRight size={12} />
            )
          ) : null}
        </span>
        <span className="sr-only">{complete ? 'satisfied' : 'not yet satisfied'}</span>
      </button>
      {open &&
        (detail ?? (
          <ul className="mx-2 mb-2 border-l border-rule-2 pl-3 text-[0.75rem] text-ink-2">
            {missing.map((m) => (
              <li key={m} className="py-0.5">
                {m} <span className="text-ink-3">— not yet satisfied</span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

function GroupHead({ children }: { children: ReactNode }) {
  return <p className="label mt-3 mb-1 px-2 !text-[0.625rem] !text-ink-3 first:mt-0">{children}</p>
}

function Detail({ children }: { children: ReactNode }) {
  return <div className="mx-2 mb-2 border-l border-rule-2 pl-3 text-[0.75rem] leading-relaxed text-ink-2">{children}</div>
}

/**
 * Bus loading: the degree audit as meters. Two curricula are tracked: the
 * New College Curriculum (VIPER '28+) and the legacy FA / Sector system.
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
  const faMissing = FA_REQUIREMENTS.filter((fa) => summary.unfulfilledFA.includes(fa.id)).map((fa) => fa.label)
  const secMissing = SECTORS.filter((s) => summary.unfulfilledSec.includes(s.id)).map((s) => s.label)
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
    <section className="panel print-block" aria-label="Degree audit">
      <h2 className="label border-b border-ink px-2 py-2 !text-ink">Bus loading · degree audit</h2>
      <div className="py-1.5">
        {ncc && (
          <>
            <GroupHead>New College Curriculum · BA</GroupHead>
            <TrackerRow
              label="Foundations"
              done={ncc.plannedFoundations}
              total={ncc.foundations.length}
              missing={ncc.foundations.filter((f) => f.state === 'missing').map((f) => f.label)}
              bus="ba"
              detail={
                <Detail>
                  <ul>
                    {ncc.foundations.map((f) => (
                      <li key={f.id} className="flex items-baseline gap-2 py-0.5">
                        <span className={f.state === 'missing' ? 'text-ink' : 'text-ink-2'}>{f.label}</span>
                        <span className="text-ink-3">
                          {f.state === 'missing' && 'nothing planned'}
                          {f.state === 'planned' && `— ${f.by}`}
                          {f.state === 'approved-overlap' && `— ${f.by} (approved overlap)`}
                          {f.state === 'credit' && `— ${f.by}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[0.6875rem] text-ink-3">
                    To plan one: open any term's Add course and choose an open slot, or open a
                    course and tick it under Tags. First-Year Seminar and Perspectives and
                    Difference also count toward the distribution once tagged with a division.
                  </p>
                </Detail>
              }
            />
            {ncc.divisions.map((d) => (
              <TrackerRow
                key={d.id}
                label={d.label}
                done={d.planned}
                total={d.target}
                unit="cu"
                bus="ba"
                missing={[`${round1(d.target - d.planned)} CU of ${d.label}`]}
                detail={
                  <Detail>
                    {d.planned >= d.target
                      ? `${d.planned} CU planned toward ${d.label}.`
                      : `${round1(d.target - d.planned)} CU still to plan. Add an open ${d.label} slot from any term, or tag a course under Tags → Distribution.`}{' '}
                    The 5 and 3 CU targets go to either division; Natural Sciences (12 CU) is
                    covered by your major.
                  </Detail>
                }
              />
            ))}
            <GroupHead>SEAS general electives · 7 CU · BSE</GroupHead>
            {ncc.seas.map((r) => (
              <TrackerRow
                key={r.id}
                label={r.label}
                done={r.planned}
                total={r.target}
                unit="cu"
                bus="bse"
                missing={[`${r.target - r.planned} CU`]}
                detail={<Detail>{r.hint}</Detail>}
              />
            ))}
          </>
        )}
        {legacy && (
          <>
            <GroupHead>Old core · Foundational Approaches &amp; Sectors · BA</GroupHead>
            <TrackerRow
              label="Foundational Approaches"
              done={summary.fulfilledFA.length}
              total={FA_REQUIREMENTS.length}
              missing={faMissing}
              bus="ba"
            />
            <TrackerRow label="Sectors" done={summary.fulfilledSec.length} total={SECTORS.length} missing={secMissing} bus="ba" />
          </>
        )}
        <GroupHead>VIPER · Energy</GroupHead>
        <TrackerRow
          label="Energy courses"
          done={Math.min(summary.energyCoursesCount, 3)}
          total={3}
          bus="energy"
          missing={['VIPER-approved energy courses']}
          detail={
            <Detail>
              {summary.meetsEnergyReq
                ? `${summary.energyCoursesCount} energy-designated courses planned.`
                : `${3 - Math.min(summary.energyCoursesCount, 3)} more needed. Catalog energy courses count automatically; for any other approved course, open it and tick VIPER energy course under Tags.`}
            </Detail>
          }
        />
        <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-2 border-t border-ink px-2 pt-2 text-[0.8125rem]">
          <span className="text-ink">Total CU · dual minimum</span>
          <span className={['tag', summary.meetsDualMin ? 'text-ink' : 'text-ink-2'].join(' ')}>
            {summary.totalCU} / 40
          </span>
          <span className="flex justify-end text-good" aria-hidden>
            {summary.meetsDualMin && <IconCheck size={12} />}
          </span>
        </div>
      </div>
      {allGreen && (
        <p className="m-2 flex items-start gap-2 border border-good bg-tint-good px-3 py-2 text-[0.75rem] leading-snug text-good">
          <span className="mt-[2px] shrink-0">
            <IconCheck size={12} />
          </span>
          Every tracked requirement is planned. This plan graduates on time.
        </p>
      )}
    </section>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
