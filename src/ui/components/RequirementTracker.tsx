import { useState, type ReactNode } from 'react'
import type { AugmentedCourse, AugmentedPlan, PlanSummary } from '../../plan/types'
import type { AuditCourseRef, NccAudit, SeasElectiveAudit } from '../../plan/ncc-audit'
import type { MajorAudit, MajorAuditRow } from '../../plan/major-audit'
import type { OpenSlotRef } from '../../plan/open-slot'
import { semesterLabel } from '../../data/semesters'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { VIPER_PROGRAM } from '../../data/viper-program'
import { Disclosure } from './Disclosure'
import { faTag, secTag } from '../../plan/fulfillments'
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

/** One major requirement inside an opened group: tick · what · by, options under it. */
function MajorItem({ row }: { row: MajorAuditRow }) {
  const by = row.done ? (
    row.by === 'credit' ? <Quiet>incoming credit</Quiet> : row.by === row.label ? <Quiet>planned</Quiet> : row.by
  ) : row.openIn ? (
    <Quiet>to fill</Quiet>
  ) : (
    <Quiet>not in plan</Quiet>
  )
  return (
    <li className="py-1">
      <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2">
        <Tick done={row.done} />
        <span className={[row.kind === 'core' ? 'tag' : '', row.done ? 'text-ink' : 'text-ink-2'].join(' ')}>{row.label}</span>
        <span className="tag text-right whitespace-nowrap text-ink-2">{by}</span>
      </div>
      {row.options.length > 0 && (
        <p className="ml-6 text-[0.6875rem] leading-snug text-ink-3">
          {row.kind === 'core' ? 'or ' : 'options: '}
          {row.options.join(', ')}
        </p>
      )}
      <span className="sr-only">{row.done ? 'satisfied' : 'not yet satisfied'}</span>
    </li>
  )
}

/** "Core courses 22/24" or "Electives 4/11", opening to one line per requirement. */
function MajorGroup({ label, rows, hint }: { label: string; rows: MajorAuditRow[]; hint?: string }) {
  const [open, setOpen] = useState(false)
  if (rows.length === 0) return null
  const done = rows.filter((r) => r.done).length
  const complete = done === rows.length
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
          {done}/{rows.length}
        </span>
        <span className={['flex justify-end text-ink-3 transition-transform duration-150', open ? 'rotate-180 text-ink' : ''].join(' ')} aria-hidden>
          <IconChevronDown size={12} />
        </span>
        <span className="sr-only">{complete ? 'satisfied' : 'not yet satisfied'}</span>
      </button>
      <div className={open ? '' : 'hidden print:block'}>
        <ul className="mr-2 mb-2 ml-7 border-l border-rule-2 pl-3 text-[0.75rem]">
          {rows.map((r) => (
            <MajorItem key={`${r.kind}-${r.id}`} row={r} />
          ))}
        </ul>
        {hint && <p className="mr-2 mb-2 ml-7 pl-3 text-[0.6875rem] leading-snug text-ink-3">{hint}</p>}
      </div>
    </div>
  )
}

const NOT_IN_PLAN_HINT =
  'Not in plan means your plan has no line for it. Courses from your other degree may count toward some electives; confirm in Path@Penn.'

/** The major's own requirements inside a degree section. */
function MajorSection({ audit }: { audit: MajorAudit }) {
  const hasMissing = audit.electives.some((r) => !r.done && !r.openIn)
  return (
    <>
      <p className="label mt-2 border-t border-rule px-3 pt-2 pb-1 !text-[0.625rem] !text-ink-3">Major · {audit.title}</p>
      <MajorGroup label="Core courses" rows={audit.core} />
      <MajorGroup label="Electives" rows={audit.electives} hint={hasMissing ? NOT_IN_PLAN_HINT : undefined} />
    </>
  )
}

/**
 * Every open slot, in term order, each a jump to its course sheet (2026-11
 * beta feedback: students did not notice open slots). Lives inside the one
 * audit panel, above the degree sections.
 */
function OpenSlotList({ slots, gradYear, onJump }: { slots: OpenSlotRef[]; gradYear: number | null; onJump: (slot: OpenSlotRef) => void }) {
  const [open, setOpen] = useState(true)
  if (slots.length === 0) return null
  return (
    <div className="border-b border-rule">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-2 py-2.5 pr-2 pl-3 text-left transition-colors duration-100 hover:bg-tint-blue"
      >
        <span className="label !text-ink">Open slots to fill</span>
        <span className="tag text-caution">{slots.length}</span>
        <span className={['flex justify-end text-ink-3 transition-transform duration-150', open ? 'rotate-180 text-ink' : ''].join(' ')} aria-hidden>
          <IconChevronDown size={12} />
        </span>
      </button>
      {open && (
        <ul className="no-print mr-2 mb-2 ml-3 text-[0.75rem]">
          {slots.map((s) => {
            const where = semesterLabel(s.semKey, gradYear ?? undefined)
            return (
              <li key={`${s.semKey}-${s.code}`}>
                <button
                  type="button"
                  onClick={() => onJump(s)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-b border-rule px-1 py-1.5 text-left transition-colors duration-100 last:border-b-0 hover:bg-tint-blue"
                >
                  <span className="truncate text-ink">{s.label}</span>
                  <span className="tag whitespace-nowrap text-ink-3">{where.short}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
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
  seas,
  curriculum = 'legacy',
  majors,
  openSlots = [],
  gradYear = null,
  onJumpToSlot,
}: {
  plan: AugmentedPlan
  summary: PlanSummary
  ncc?: NccAudit
  /** SEAS general electives — the BSE half, under either College curriculum. */
  seas?: SeasElectiveAudit[]
  /** 'ncc' hides the old FA / Sector rows — the plan has no such slots. */
  curriculum?: 'legacy' | 'ncc'
  /** The BA and BSE majors' own core courses and elective slots. */
  majors?: { sas: MajorAudit | null; seas: MajorAudit | null }
  /** Open slots in the plan, listed first with a jump to each. */
  openSlots?: OpenSlotRef[]
  gradYear?: number | null
  onJumpToSlot?: (slot: OpenSlotRef) => void
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
  if (majors?.sas) {
    baTotal += majors.sas.core.length + majors.sas.electives.length
    baLeft += majors.sas.left
  }
  const bseRows = seas ?? ncc?.seas ?? []
  let bseLeft = bseRows.filter((r) => r.planned < r.target).length
  let bseTotal = bseRows.length
  if (majors?.seas) {
    bseTotal += majors.seas.core.length + majors.seas.electives.length
    bseLeft += majors.seas.left
  }
  const energyLeft = Math.max(0, 3 - summary.energyCoursesCount)
  const allGreen = summary.meetsDualMin && baLeft === 0 && bseLeft === 0 && energyLeft === 0

  const readout = (left: number, total: number) =>
    left === 0 ? (total > 0 ? 'complete' : '') : `${left} to plan`
  const toneOf = (left: number): 'good' | 'caution' => (left === 0 ? 'good' : 'caution')

  return (
    <>
      {onJumpToSlot && <OpenSlotList slots={openSlots} gradYear={gradYear} onJump={onJumpToSlot} />}
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
                courses={courses.filter((c) => c.effectiveFulfills.includes(faTag(fa.id))).map(toRef)}
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
                courses={courses.filter((c) => c.effectiveFulfills.includes(secTag(sec.id))).map(toRef)}
                empty="Nothing planned for this Sector."
              />
            ))}
          </>
        )}
        {majors?.sas && <MajorSection audit={majors.sas} />}
      </Disclosure>

      {bseTotal > 0 && (
        <Disclosure
          title="BSE · Engineering"
          summary={readout(bseLeft, bseTotal)}
          tone={toneOf(bseLeft)}
          accent="bg-ink"
          defaultOpen={bseLeft > 0}
          printOpen
        >
          {bseRows.map((r) =>
            r.target === 1 ? (
              <CheckRow
                key={r.id}
                label={r.label}
                done={r.planned >= r.target}
                by={
                  r.courses[0]?.open ? (
                    <Quiet>open slot</Quiet>
                  ) : r.by && !r.by.startsWith('open slot') ? (
                    r.by
                  ) : r.courses[0] ? (
                    r.courses[0].code
                  ) : (
                    <Quiet>nothing planned</Quiet>
                  )
                }
              />
            ) : (
              <CountRow key={r.id} label={r.label} done={r.planned} total={r.target} unit="courses" courses={r.courses} empty={r.hint} />
            ),
          )}
          {majors?.seas && <MajorSection audit={majors.seas} />}
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

      {/* Scope note (2026-11 beta feedback): the audit never claims graduation.
          It says what it checks and sends the student to Path@Penn. */}
      <p
        className={[
          'm-2 flex items-start gap-2 px-3 py-2 text-[0.75rem] leading-snug',
          allGreen ? 'border border-good bg-tint-good text-good' : 'text-ink-2',
        ].join(' ')}
      >
        {allGreen && (
          <span className="mt-[2px] shrink-0">
            <IconCircleCheck size={12} />
          </span>
        )}
        <span>
          {allGreen ? 'Everything this audit checks is planned. ' : ''}
          It checks {legacy ? 'the old-core Foundational Approaches and Sectors' : 'the College Foundations and distribution'}, SEAS
          general electives, your majors&apos; core courses and elective slots, the three energy courses and total CU. It does not
          check course offerings, grades, petitions or every substitution your department may accept. Confirm your degree in
          Path@Penn.
        </span>
      </p>
    </>
  )
}
