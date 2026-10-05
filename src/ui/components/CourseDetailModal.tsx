import { useState } from 'react'
import type { AugmentedCourse, FulfillmentTag } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { ALL_SEMESTER_KEYS, semesterLabel } from '../../data/semesters'
import { pcrUrlFor } from '../../utils/pcr'
import { Modal } from './Modal'
import { isOpenSlot } from '../../plan/open-slot'
import { alternativesFor } from '../../data/seas-catalog'
import { Ties } from './Ties'
import { IconCheck, IconExternal } from './icons'
import { FA_REQUIREMENTS, SECTORS } from '../../data/requirements'
import { faTag, secTag } from '../../plan/fulfillments'

type Group = { group: string; tags: ReadonlyArray<[FulfillmentTag, string]> }

const SEAS_GROUP: Group = {
  group: 'SEAS general electives · BSE',
  tags: [
    ['seas-ssh', 'SS/H elective'],
    ['seas-writ', 'Writing'],
    ['seas-ethics', 'Ethics'],
    ['seas-tbs', 'Technology in Business & Society (TBS)'],
  ],
}
const ENERGY_GROUP: Group = { group: 'VIPER · Energy', tags: [['viper-energy', 'VIPER energy course']] }

/** What a course can count toward, per College curriculum. */
const FULFILLMENT_GROUPS: Record<'ncc' | 'legacy', readonly Group[]> = {
  ncc: [
    {
      group: 'NCC Foundations · BA',
      tags: [
        ['ncc-kite', 'Kite Foundation'],
        ['ncc-key', 'Key Foundation'],
        ['ncc-fys', 'First-Year Seminar'],
        ['ncc-writ', 'Writing Foundation'],
        ['ncc-pad', 'Perspectives and Difference'],
        ['ncc-lang', 'Language Foundation'],
      ],
    },
    {
      group: 'NCC Distribution · BA',
      tags: [
        ['ncc-distrib-ss', 'Social Sciences'],
        ['ncc-distrib-h', 'Humanities'],
        ['ncc-distrib-n', 'Natural Sciences'],
      ],
    },
    SEAS_GROUP,
    ENERGY_GROUP,
  ],
  legacy: [
    { group: 'Foundational Approaches · BA', tags: FA_REQUIREMENTS.map((fa) => [faTag(fa.id), fa.label] as [FulfillmentTag, string]) },
    { group: 'Sectors · BA', tags: SECTORS.map((sec) => [secTag(sec.id), sec.label] as [FulfillmentTag, string]) },
    SEAS_GROUP,
    ENERGY_GROUP,
  ],
}

/** The cluster palette — six keys a student can mark a course with. */
const CLUSTER_COLORS = ['#011F5B', '#990000', '#1e7e34', '#b8860b', '#0f6b66', '#5b3a86']

export interface CourseDetailModalProps {
  course: AugmentedCourse
  semKey: SemesterKey
  gradYear: number | null
  color?: string
  /** Picks which catalog alternatives apply to core courses. */
  seasMajorKey?: string | null
  /** Which College requirements the "Counts toward" list offers. */
  curriculum?: 'ncc' | 'legacy'
  onClose: () => void
  onToggleFulfillment: (courseId: string, tag: FulfillmentTag, on: boolean) => void
  onSwap: (slotId: string, newCode: string) => void
  onRename: (courseId: string, newCode: string, newTitle?: string) => void
  onMoveTo: (to: SemesterKey) => void
  onDelete: () => void
  onSetColor: (courseId: string, color: string | null) => void
}

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="label mb-1.5 !text-[0.625rem] !text-ink-3">{children}</p>
}

/**
 * Course detail: one sheet, no tabs. Code and title are editable first,
 * then move / remove, then what the course counts toward, then any
 * catalog alternatives or pre-screened picks, then the cluster color.
 */
export function CourseDetailModal({
  course,
  semKey,
  gradYear,
  color,
  seasMajorKey,
  curriculum = 'ncc',
  onClose,
  onToggleFulfillment,
  onSwap,
  onRename,
  onMoveTo,
  onDelete,
  onSetColor,
}: CourseDetailModalProps) {
  const alternatives = alternativesFor(seasMajorKey, course.originalCode ?? course.code)
  const pool = course.pool ?? course.suggests ?? []
  const open = isOpenSlot(course)
  const locked = course.category === 'viper' && course.fixed === true
  const courseId = course.originalCode ?? course.code
  const pcr = pcrUrlFor(course)
  const here = semesterLabel(semKey, gradYear ?? undefined)
  // Derived = what the course counts toward before the student's ticks.
  const derived = new Set<FulfillmentTag>([
    ...course.effectiveFulfills.filter((t) => !course.userFulfills.includes(t)),
    ...course.removedFulfills,
  ])

  const [codeValue, setCodeValue] = useState(open ? '' : course.code)
  const [titleValue, setTitleValue] = useState(open ? '' : course.title)
  const code = codeValue.trim()
  const title = titleValue.trim()
  const dirty = open ? code.length > 0 : (code.length > 0 && code !== course.code) || (title.length > 0 && title !== course.title)

  function save() {
    if (!dirty) return
    onRename(courseId, code || course.code, title || undefined)
    onClose()
  }

  const context = [
    course.slotLabel ?? course.label,
    course.fulfills?.fa && `FA: ${course.fulfills.fa}`,
    course.fulfills?.sec && `Sector ${course.fulfills.sec}`,
  ].filter(Boolean)

  const pickRow =
    'grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-1 py-2 text-left text-[0.8125rem] transition-colors duration-100 last:border-b-0 hover:bg-tint-blue'

  return (
    <Modal
      title={open ? course.title : `${course.code}  ${course.title}`}
      onClose={onClose}
      meta={
        <>
          <span className="tag text-ink">{course.cu} CU</span>
          <span className="tag text-ink-3">
            {here.year} · {here.season}
          </span>
          {!open && <Ties course={course} />}
          {context.map((c) => (
            <span key={String(c)} className="text-ink-3">
              {c}
            </span>
          ))}
          {pcr && (
            <a
              href={pcr}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-penn-blue hover:underline"
            >
              Penn Course Review
              <IconExternal size={12} />
            </a>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* ── Code + title ── */}
        {locked ? (
          <p className="text-[0.75rem] text-ink-3">This course is a fixed VIPER requirement. Its code and title cannot change.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <div>
                <label className="label mb-1.5 block" htmlFor="course-code">
                  Code
                </label>
                <input
                  id="course-code"
                  value={codeValue}
                  onChange={(e) => setCodeValue(e.target.value)}
                  placeholder={open ? 'e.g. COL 0100' : undefined}
                  className="field w-full font-mono !text-[0.75rem] uppercase"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label mb-1.5 block" htmlFor="course-title">
                  Title
                </label>
                <input
                  id="course-title"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  placeholder={open ? 'Optional — catalog title used if known' : undefined}
                  className="field w-full"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              {open && <span className="mr-auto text-[0.75rem] text-ink-3">Name the course to fill this slot.</span>}
              <button type="submit" disabled={!dirty} className="btn btn-primary !py-2">
                {open ? 'Fill slot' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {/* ── Move / remove ── */}
        <div className="flex flex-wrap items-end gap-3 border-t border-rule pt-4">
          <div className="min-w-0 flex-1">
            <label className="label mb-1.5 block" htmlFor="move-select">
              Move to term
            </label>
            <select
              id="move-select"
              value={semKey}
              onChange={(e) => {
                onMoveTo(e.target.value as SemesterKey)
                onClose()
              }}
              className="field w-full"
            >
              {ALL_SEMESTER_KEYS.map((k) => {
                const l = semesterLabel(k, gradYear ?? undefined)
                return (
                  <option key={k} value={k}>
                    {l.year} — {l.season}
                  </option>
                )
              })}
            </select>
          </div>
          {course.fixed ? (
            <p className="pb-2 text-[0.75rem] text-ink-3">Fixed requirement, cannot be removed.</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                onDelete()
                onClose()
              }}
              className="btn btn-danger"
            >
              Remove from plan
            </button>
          )}
        </div>

        {/* ── Counts toward ── */}
        <div className="border-t border-rule pt-4">
          <Heading>Counts toward</Heading>
          <p className="-mt-0.5 mb-2.5 text-[0.75rem] leading-snug text-ink-3">
            Pre-checked from the catalog and this course&apos;s slot. Untick to override, or tick anything else it counts for.
          </p>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FULFILLMENT_GROUPS[curriculum].map((g) => (
              <div key={g.group}>
                <p className="mb-1 text-[0.6875rem] text-ink-3">{g.group}</p>
                <div className="border-t border-rule">
                  {g.tags.map(([tag, label]) => {
                    const on = course.effectiveFulfills.includes(tag)
                    const auto = derived.has(tag)
                    return (
                      <label
                        key={tag}
                        className="flex cursor-pointer items-center gap-2.5 border-b border-rule px-1 py-1.5 text-[0.8125rem] transition-colors duration-100 hover:bg-tint-blue"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onToggleFulfillment(courseId, tag, !on)}
                          className="box"
                        />
                        <span className={['flex-1', on ? 'text-ink' : 'text-ink-2'].join(' ')}>{label}</span>
                        {auto && (
                          <span
                            className={['label !text-[0.5625rem]', on ? '!text-ink-3' : '!text-caution'].join(' ')}
                            title={on ? 'From the catalog or slot' : 'From the catalog or slot — overridden off'}
                          >
                            {on ? 'auto' : 'overridden'}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Alternatives / picks ── */}
        {alternatives.length > 0 && (
          <div className="border-t border-rule pt-4">
            <Heading>Accepted in place of {course.originalCode ?? course.code}</Heading>
            <div className="border-t border-rule">
              {alternatives.map((alt) => (
                <button
                  key={alt}
                  type="button"
                  onClick={() => {
                    onRename(courseId, alt)
                    onClose()
                  }}
                  className={pickRow}
                >
                  <span className="tag text-ink">{alt}</span>
                  <span className="text-ink-2">SEAS catalog alternative</span>
                  {alt === course.code ? (
                    <span className="label flex items-center gap-1 !text-[0.625rem] !text-good">
                      <IconCheck size={10} /> current
                    </span>
                  ) : (
                    <span className="label !text-[0.625rem] !text-penn-blue">swap</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {course.slotId && pool.length > 0 && (
          <div className="border-t border-rule pt-4">
            <Heading>Pre-screened picks for this slot</Heading>
            <div className="border-t border-rule">
              {pool.map((pick) => (
                <button
                  key={pick}
                  type="button"
                  onClick={() => {
                    if (course.slotId) onSwap(course.slotId, pick)
                    onClose()
                  }}
                  className={pickRow}
                >
                  <span className="tag text-ink">{pick}</span>
                  <span className="text-ink-2">Fills this slot</span>
                  {pick === course.code ? (
                    <span className="label flex items-center gap-1 !text-[0.625rem] !text-good">
                      <IconCheck size={10} /> current
                    </span>
                  ) : (
                    <span className="label !text-[0.625rem] !text-penn-blue">choose</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Cluster color ── */}
        <div className="flex items-center gap-3 border-t border-rule pt-4">
          <span className="label">Color</span>
          <div className="flex items-center gap-2">
            {CLUSTER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set color ${c}`}
                aria-pressed={color === c}
                onClick={() => onSetColor(courseId, color === c ? null : c)}
                className={[
                  'h-5 w-5 border transition-transform duration-100 hover:scale-110',
                  color === c ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-sheet' : 'border-transparent',
                ].join(' ')}
                style={{ backgroundColor: c }}
              />
            ))}
            {color && (
              <button type="button" onClick={() => onSetColor(courseId, null)} className="btn btn-quiet !py-1">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
