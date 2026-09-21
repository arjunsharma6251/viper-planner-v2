import { useState, type ReactNode } from 'react'
import type { AugmentedCourse, AugmentedPlan, PlanSummary } from '../../plan/types'
import type { AuditCourseRef, NccAudit } from '../../plan/ncc-audit'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { VIPER_PROGRAM } from '../../data/viper-program'
import { Disclosure } from './Disclosure'
import { IconChevronDown, IconCircle, IconCircleCheck } from './icons'

function isOpen(c: Pick<AugmentedCourse, 'isPlaceholder' | 'code'>): boolean {
  return !!c.isPlaceholder || c.code.startsWith('—')
}

function toRef(c: AugmentedCourse): AuditCourseRef {
  return { code: c.code, title: c.title, cu: c.cu || 0, open: isOpen(c) }
}

function Tick({ done }: { done: boolean }) {
  return (
    <span className={['flex shrink-0 items-center', done ? 'text-good' : 'text-ink-3'].join(' ')} aria-hidden>
      {done ? <IconCircleCheck size={14} /> : <IconCircle size={14} />}
    </span>
  )
}

/** One checklist line: tick · label · what fills it. */
function CheckRow({ label, done, by }: { label: string; done: boolean; by: ReactNode }) {
  return (
    <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2 py-1.5 pr-2 pl-3 text-[0.8125rem]">
      <Tick done={done} />
      <span className={done ? 'text-ink' : 'text-ink-2'}>{label}</span>
      <span className="tag text-right whitespace-nowrap text-ink-2">{by}</span>
      <span className="sr-only">{done ? 'satisfied' : 'not yet satisfied'}</span>
    </div>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <span className="label !text-[0.625rem] !text-ink-3">{children}</span>
}

/** The courses counted toward a row, shown when the row is opened. */
function CourseList({ courses, empty }: { courses: AuditCourseRef[]; empty: string }) {
  if (courses.length === 0)
    return <p className="mr-2 mb-2 ml-7 border-l border-rule-2 pl-3 text-[0.75rem] leading-relaxed text-ink-2">{empty}</p>
  return (
    <ul className="mr-2 mb-2 ml-7 border-l border-rule-2 pl-3 text-[0.75rem] text-ink-2">
      {courses.map((c, i) => (
        <li key={`${c.code}-${i}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-2 py-0.5">
          {c.open ? <Quiet>open</Quiet> : <span className="tag text-ink">{c.code}</span>}
          <span className="truncate">{c.title}</span>
          <span className="tag text-ink-3">{c.cu}</span>
        </li>
      ))}
    </ul>
  )
}

/** A counted requirement: tick · label · n/target, opening to its course list. */
function CountRow({
  label,
  done,
  total,
  unit,
  courses,
  empty,
}: {
  label: string
  done: number
  total: number
  unit: 'CU' | 'courses'
  courses: AuditCourseRef[]
  empty: string
}) {
  const [open, setOpen] = useState(false)
  const complete = done >= total
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1rem_minmax(0,1fr)_auto_1rem] items-center gap-x-2 py-1.5 pr-2 pl-3 text-left text-[0.8125rem] transition-colors duration-100 hover:bg-tint-blue"
      >
        <Tick done={complete} />
        <span className={complete ? 'text-ink' : 'text-ink-2'}>{label}</span>
        <span className="tag text-right whitespace-nowrap text-ink-2">
          {done}/{total}
          {unit === 'CU' && <Quiet> CU</Quiet>}
        </span>
        <span className={['flex justify-end text-ink-3 transition-transform duration-150', open ? 'rotate-180 text-ink' : ''].join(' ')} aria-hidden>
          <IconChevronDown size={12} />
        </span>
        <span className="sr-only">{complete ? 'satisfied' : 'not yet satisfied'}</span>
      </button>
      {open && <CourseList courses={courses} empty={empty} />}
    </div>
  )
}

function fillLabel(by: string | null | undefined, fallback = 'nothing planned'): ReactNode {
  if (!by) return <Quiet>{fallback}</Quiet>
  if (by.startsWith('open slot')) return <Quiet>open slot</Quiet>
  return by
}

/**
 * The degree audit as three dropdowns, BA · BSE · Energy, each headed by
 * how much is left. A section with gaps opens by itself; a complete one
 * stays folded with its check. Every row is a tick and the course code.
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
  const dualMin = VIPER_PROGRAM.minTotalCU

  // ---- BA readout ----
  let baLeft = 0
  let baTotal = 0
  if (ncc) {
    baTotal += ncc.foundations.length
    baLeft += ncc.foundations.filter((f) => f.state === 'missing').length
    for (const d of ncc.divisions) {
      baTotal += 1
      if (d.planned < d.target) baLeft += 1
    }
  } else {
    baTotal = FA_REQUIREMENTS.length + SECTORS.length
    baLeft = summary.unfulfilledFA.length + summary.unfulfilledSec.length
  }
  const bseLeft = ncc ? ncc.seas.filter((r) => r.planned < r.target).length : 0
  const bseTotal = ncc ? ncc.seas.length : 0
  const energyLeft = Math.max(0, 3 - summary.energyCoursesCount)
  const allGreen = summary.meetsDualMin && baLeft === 0 && bseLeft === 0 && energyLeft === 0

  const readout = (left: number, total: number) =>
    left === 0 ? (total > 0 ? 'complete' : '') : `${left} to plan`
  const toneOf = (left: number): 'good' | 'caution' => (left === 0 ? 'good' : 'caution')

  return (
    <>
      <Disclosure
        title="BA · College"
        summary={readout(baLeft, baTotal)}
        tone={toneOf(baLeft)}
        accent="bg-penn-blue"
        defaultOpen={baLeft > 0}
        printOpen
      >
        {ncc && (
          <>
            {ncc.foundations.map((f) => (
              <CheckRow key={f.id} label={f.label} done={f.state !== 'missing'} by={fillLabel(f.by)} />
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
            {FA_REQUIREMENTS.map((fa) => (
              <CountRow
                key={fa.id}
                label={fa.label}
                done={summary.fulfilledFA.includes(fa.id) ? 1 : 0}
                total={1}
                unit="courses"
                courses={courses.filter((c) => (c.fa ?? c.fulfills?.fa ?? c.intent?.fa) === fa.id).map(toRef)}
                empty="Nothing planned for this Foundational Approach."
              />
            ))}
            {SECTORS.map((sec) => (
              <CountRow
                key={sec.id}
                label={sec.label}
                done={summary.fulfilledSec.includes(sec.id) ? 1 : 0}
                total={1}
                unit="courses"
                courses={courses.filter((c) => (c.sec ?? c.fulfills?.sec ?? c.intent?.sec) === sec.id).map(toRef)}
                empty="Nothing planned for this Sector."
              />
            ))}
          </>
        )}
      </Disclosure>

      {ncc && (
        <Disclosure
          title="BSE · Engineering"
          summary={readout(bseLeft, bseTotal)}
          tone={toneOf(bseLeft)}
          accent="bg-ink"
          defaultOpen={bseLeft > 0}
          printOpen
        >
          {ncc.seas.map((r) =>
            r.target === 1 ? (
              <CheckRow
                key={r.id}
                label={r.label}
                done={r.planned >= r.target}
                by={r.courses[0] ? (r.courses[0].open ? <Quiet>open slot</Quiet> : r.courses[0].code) : <Quiet>nothing planned</Quiet>}
              />
            ) : (
              <CountRow key={r.id} label={r.label} done={r.planned} total={r.target} unit="courses" courses={r.courses} empty={r.hint} />
            ),
          )}
        </Disclosure>
      )}

      <Disclosure
        title="VIPER · Energy"
        summary={readout(energyLeft, 3)}
        tone={toneOf(energyLeft)}
        accent="bg-energy"
        defaultOpen={energyLeft > 0}
        printOpen
      >
        <CountRow
          label="Energy courses"
          done={Math.min(summary.energyCoursesCount, 3)}
          total={3}
          unit="courses"
          courses={energyCourses}
          empty="Catalog energy courses count automatically; for any other approved course, open it and tick VIPER energy course under Counts toward."
        />
      </Disclosure>

      <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-rule py-2.5 pr-2 pl-3 text-[0.8125rem]">
        <Tick done={summary.meetsDualMin} />
        <span className="text-ink">
          Total CU <Quiet>· {dualMin} minimum, incoming credit counts</Quiet>
        </span>
        <span className={['tag', summary.meetsDualMin ? 'text-ink' : 'text-ink-2'].join(' ')}>
          {summary.totalCU} / {dualMin}
        </span>
      </div>

      {allGreen && (
        <p className="m-2 flex items-start gap-2 border border-good bg-tint-good px-3 py-2 text-[0.75rem] leading-snug text-good">
          <span className="mt-[2px] shrink-0">
            <IconCircleCheck size={12} />
          </span>
          Every tracked requirement is planned. This plan graduates on time.
        </p>
      )}
    </>
  )
}
