import { useState, type ReactNode } from 'react'
import type { AugmentedCourse, AugmentedPlan, PlanSummary } from '../../plan/types'
import type { AuditCourseRef, NccAudit } from '../../plan/ncc-audit'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { VIPER_PROGRAM } from '../../data/viper-program'
import { useTrace, type Bus } from '../trace'
import { IconChevronDown, IconCircle, IconCircleCheck } from './icons'

const BUS_TINT: Record<Bus, string> = {
  ba: 'bg-tint-blue',
  bse: 'bg-ink/6',
  energy: 'bg-tint-energy',
}
const BUS_BAR: Record<Bus, string> = {
  ba: 'bg-penn-blue',
  bse: 'bg-ink',
  energy: 'bg-energy',
}
const BUS_TEXT: Record<Bus, string> = {
  ba: '!text-penn-blue',
  bse: '!text-ink',
  energy: '!text-energy-ink',
}

function isOpen(c: Pick<AugmentedCourse, 'isPlaceholder' | 'code'>): boolean {
  return !!c.isPlaceholder || c.code.startsWith('—')
}

function toRef(c: AugmentedCourse): AuditCourseRef {
  return { code: c.code, title: c.title, cu: c.cu || 0, open: isOpen(c) }
}

/** A colored group header: BA, BSE or Energy, in the bus palette. */
function GroupHead({ bus, children }: { bus: Bus; children: ReactNode }) {
  const { lit } = useTrace()
  return (
    <div
      className={[
        'relative mt-3 px-2 pt-2 pb-1 transition-colors duration-150 ease-out first:mt-0',
        lit.has(bus) ? BUS_TINT[bus] : '',
      ].join(' ')}
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] ${BUS_BAR[bus]}`} aria-hidden />
      <p className={`label !text-[0.6875rem] ${BUS_TEXT[bus]}`}>{children}</p>
    </div>
  )
}

function Tick({ done }: { done: boolean }) {
  return (
    <span className={['flex shrink-0 items-center', done ? 'text-good' : 'text-ink-3'].join(' ')} aria-hidden>
      {done ? <IconCircleCheck size={14} /> : <IconCircle size={14} />}
    </span>
  )
}

/** One checklist line: tick · label · what fills it. No expansion. */
function CheckRow({ label, done, by, bus = 'ba' }: { label: string; done: boolean; by: ReactNode; bus?: Bus }) {
  const { lit } = useTrace()
  return (
    <div
      className={[
        'grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2 px-2 py-1.5 text-[0.8125rem] transition-colors duration-150 ease-out',
        lit.has(bus) ? BUS_TINT[bus] : '',
      ].join(' ')}
    >
      <Tick done={done} />
      <span className={done ? 'text-ink' : 'text-ink-2'}>{label}</span>
      <span className="tag text-right whitespace-nowrap text-ink-2">{by}</span>
      <span className="sr-only">{done ? 'satisfied' : 'not yet satisfied'}</span>
    </div>
  )
}

/** A course list under an expanded row. */
function CourseList({ courses, empty }: { courses: AuditCourseRef[]; empty: string }) {
  if (courses.length === 0) return <p className="mx-2 mb-2 border-l border-rule-2 pl-3 text-[0.75rem] leading-relaxed text-ink-2">{empty}</p>
  return (
    <ul className="mx-2 mb-2 border-l border-rule-2 pl-3 text-[0.75rem] text-ink-2">
      {courses.map((c, i) => (
        <li key={`${c.code}-${i}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-2 py-0.5">
          {c.open ? (
            <span className="label !text-[0.625rem] !text-ink-3">open</span>
          ) : (
            <span className="tag text-ink">{c.code}</span>
          )}
          <span className="truncate">{c.title}</span>
          <span className="tag text-ink-3">{c.cu}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * A counted requirement: tick · label · n/target, with an always-visible
 * chevron that opens the list of courses counted toward it.
 */
function CountRow({
  label,
  done,
  total,
  unit,
  courses,
  empty,
  bus = 'ba',
}: {
  label: string
  done: number
  total: number
  unit: 'CU' | 'courses'
  courses: AuditCourseRef[]
  empty: string
  bus?: Bus
}) {
  const [open, setOpen] = useState(false)
  const { lit } = useTrace()
  const complete = done >= total
  return (
    <div className={['transition-colors duration-150 ease-out', lit.has(bus) ? BUS_TINT[bus] : ''].join(' ')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1rem_minmax(0,1fr)_auto_1rem] items-center gap-x-2 px-2 py-1.5 text-left text-[0.8125rem] transition-colors duration-100 hover:bg-tint-blue"
      >
        <Tick done={complete} />
        <span className={complete ? 'text-ink' : 'text-ink-2'}>{label}</span>
        <span className="tag text-right whitespace-nowrap text-ink-2">
          {done}/{total}
          <span className="label ml-0.5 !text-[0.625rem] !text-ink-3">{unit === 'CU' ? 'CU' : ''}</span>
        </span>
        <span className={['flex justify-end text-ink transition-transform duration-150', open ? 'rotate-180' : ''].join(' ')} aria-hidden>
          <IconChevronDown size={14} />
        </span>
        <span className="sr-only">{complete ? 'satisfied' : 'not yet satisfied'}</span>
      </button>
      {open && <CourseList courses={courses} empty={empty} />}
    </div>
  )
}

/**
 * The degree audit as a checklist: every requirement with a tick and the
 * course code that fills it, grouped under colored BA / BSE / Energy heads.
 */
export function RequirementTracker({
  plan,
  summary,
  ncc,
  curriculum = 'legacy',
}: {
  plan: AugmentedPlan
  summary: PlanSummary
  ncc?: NccAudit
  /** 'ncc' hides the old FA / Sector rows — the plan has no such slots. */
  curriculum?: 'legacy' | 'ncc'
}) {
  const legacy = curriculum === 'legacy'
  const courses = Object.values(plan.semesters).flat()
  const energyCourses = courses.filter((c) => c.isEnergy).map(toRef)
  const nccGreen =
    !!ncc &&
    ncc.foundations.every((f) => f.state !== 'missing') &&
    ncc.divisions.every((d) => d.planned >= d.target) &&
    ncc.seas.every((r) => r.planned >= r.target)
  const allGreen =
    summary.meetsDualMin &&
    summary.meetsEnergyReq &&
    (legacy ? summary.unfulfilledFA.length === 0 && summary.unfulfilledSec.length === 0 : nccGreen)
  const dualMin = VIPER_PROGRAM.minTotalCU

  return (
    <section className="panel print-block" aria-label="Degree audit">
      <h2 className="label border-b border-ink px-2 py-2 !text-ink">Degree audit</h2>
      <div className="pb-1.5">
        <GroupHead bus="ba">BA · College{ncc ? ' · New College Curriculum' : ' · Old core'}</GroupHead>
        {ncc && (
          <>
            {ncc.foundations.map((f) => (
              <CheckRow
                key={f.id}
                label={f.label}
                done={f.state !== 'missing'}
                by={
                  f.state === 'missing' ? (
                    <span className="label !text-[0.625rem] !text-ink-3">nothing planned</span>
                  ) : f.by?.startsWith('open slot') ? (
                    <span className="label !text-[0.625rem] !text-ink-3">open slot</span>
                  ) : (
                    f.by
                  )
                }
              />
            ))}
            {ncc.divisions.map((d) => (
              <CountRow
                key={d.id}
                label={d.label}
                done={d.planned}
                total={d.target}
                unit="CU"
                courses={d.courses}
                empty={`Nothing planned. Add an open ${d.label} slot from any term, or open a course and tick ${d.label} under Counts toward.`}
              />
            ))}
          </>
        )}
        {legacy && (
          <>
            {FA_REQUIREMENTS.map((fa) => {
              const hits = courses.filter((c) => (c.fa ?? c.fulfills?.fa ?? c.intent?.fa) === fa.id).map(toRef)
              return (
                <CountRow
                  key={fa.id}
                  label={fa.label}
                  done={summary.fulfilledFA.includes(fa.id) ? 1 : 0}
                  total={1}
                  unit="courses"
                  courses={hits}
                  empty="Nothing planned for this Foundational Approach."
                />
              )
            })}
            {SECTORS.map((sec) => {
              const hits = courses.filter((c) => (c.sec ?? c.fulfills?.sec ?? c.intent?.sec) === sec.id).map(toRef)
              return (
                <CountRow
                  key={sec.id}
                  label={sec.label}
                  done={summary.fulfilledSec.includes(sec.id) ? 1 : 0}
                  total={1}
                  unit="courses"
                  courses={hits}
                  empty="Nothing planned for this Sector."
                />
              )
            })}
          </>
        )}

        {ncc && (
          <>
            <GroupHead bus="bse">BSE · Engineering · general electives 7 CU</GroupHead>
            {ncc.seas.map((r) =>
              r.target === 1 ? (
                <CheckRow
                  key={r.id}
                  label={r.label}
                  done={r.planned >= r.target}
                  bus="bse"
                  by={
                    r.courses[0] ? (
                      r.courses[0].open ? (
                        <span className="label !text-[0.625rem] !text-ink-3">open slot</span>
                      ) : (
                        r.courses[0].code
                      )
                    ) : (
                      <span className="label !text-[0.625rem] !text-ink-3">nothing planned</span>
                    )
                  }
                />
              ) : (
                <CountRow
                  key={r.id}
                  label={r.label}
                  done={r.planned}
                  total={r.target}
                  unit="courses"
                  courses={r.courses}
                  empty={r.hint}
                  bus="bse"
                />
              ),
            )}
          </>
        )}

        <GroupHead bus="energy">VIPER · Energy</GroupHead>
        <CountRow
          label="Energy courses"
          done={Math.min(summary.energyCoursesCount, 3)}
          total={3}
          unit="courses"
          courses={energyCourses}
          empty="Catalog energy courses count automatically; for any other approved course, open it and tick VIPER energy course under Counts toward."
          bus="energy"
        />

        <div className="mt-1.5 grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2 border-t border-ink px-2 pt-2 text-[0.8125rem]">
          <Tick done={summary.meetsDualMin} />
          <span className="text-ink">Total CU · dual-degree minimum</span>
          <span className={['tag', summary.meetsDualMin ? 'text-ink' : 'text-ink-2'].join(' ')}>
            {summary.totalCU} / {dualMin}
          </span>
        </div>
        <p className="px-2 pt-1 text-[0.6875rem] text-ink-3">Incoming credit counts toward the {dualMin}.</p>
      </div>
      {allGreen && (
        <p className="m-2 flex items-start gap-2 border border-good bg-tint-good px-3 py-2 text-[0.75rem] leading-snug text-good">
          <span className="mt-[2px] shrink-0">
            <IconCircleCheck size={12} />
          </span>
          Every tracked requirement is planned. This plan graduates on time.
        </p>
      )}
    </section>
  )
}
