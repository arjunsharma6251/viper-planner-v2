import { useState } from 'react'
import type { AugmentedCourse, FulfillmentTag } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { ALL_SEMESTER_KEYS, semesterLabel } from '../../data/semesters'
import { pcrUrlFor } from '../../utils/pcr'
import { Modal } from './Modal'
import { isOpenSlot } from '../../plan/open-slot'

const FULFILLMENT_LABELS: Record<FulfillmentTag, string> = {
  'ncc-kite': 'Kite Foundation',
  'ncc-key': 'Key Foundation',
  'ncc-fys': 'First-Year Seminar',
  'ncc-writ': 'Writing Foundation',
  'ncc-pad': 'Power & Difference',
  'ncc-lang': 'Language Foundation',
  'ncc-distrib-ss': 'Distribution: Social Sciences',
  'ncc-distrib-h': 'Distribution: Humanities',
  'ncc-distrib-n': 'Distribution: Natural Sciences',
  'seas-ssh': 'SEAS SS/H elective',
  'seas-writ': 'SEAS Writing',
  'seas-ethics': 'SEAS Ethics',
}

/** The cluster palette — muted, paper-compatible tones. */
const CLUSTER_COLORS = ['#011F5B', '#990000', '#1e6b38', '#b8860b', '#0f6b66', '#5b3a86']

type Tab = 'tags' | 'pick' | 'actions'

export interface CourseDetailModalProps {
  course: AugmentedCourse
  semKey: SemesterKey
  gradYear: number | null
  color?: string
  onClose: () => void
  onToggleFulfillment: (courseId: string, tag: FulfillmentTag, on: boolean) => void
  onSwap: (slotId: string, newCode: string) => void
  onRename: (courseId: string, newCode: string) => void
  onMoveTo: (to: SemesterKey) => void
  onDelete: () => void
  onSetColor: (courseId: string, color: string | null) => void
}

/**
 * Course detail: ≤3 tabs (Tags, Pick course, Actions) — don't grow this.
 * The Actions tab's move-dropdown is the keyboard alternative to drag.
 */
export function CourseDetailModal({
  course,
  semKey,
  gradYear,
  color,
  onClose,
  onToggleFulfillment,
  onSwap,
  onRename,
  onMoveTo,
  onDelete,
  onSetColor,
}: CourseDetailModalProps) {
  const hasPool = !!course.slotId && (course.pool?.length ?? course.suggests?.length ?? 0) > 0
  const open = isOpenSlot(course)
  // An open slot's one job is to get filled — land on the picker when
  // there is one, otherwise on Actions (where a code can be typed in).
  const [tab, setTab] = useState<Tab>(open ? (hasPool ? 'pick' : 'actions') : 'tags')
  const [renameValue, setRenameValue] = useState(course.code)
  const courseId = course.originalCode ?? course.code
  const pcr = pcrUrlFor(course)
  const pool = course.pool ?? course.suggests ?? []

  const contextLine = [
    course.slotLabel ?? course.label,
    course.fulfills?.fa && `FA: ${course.fulfills.fa}`,
    course.fulfills?.sec && `Sector ${course.fulfills.sec}`,
    course.isEnergy && 'VIPER Energy',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Modal
      eyebrow={`${open ? 'Open slot' : 'Course detail'} · ${course.cu} CU`}
      title={open ? course.title : `${course.code} — ${course.title}`}
      onClose={onClose}
    >
      <div className="mb-4 flex items-center gap-4 text-[0.75rem]">
        {pcr && (
          <a
            href={pcr}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-penn-blue hover:underline"
          >
            Penn Course Review ↗
          </a>
        )}
        {contextLine && <span className="truncate text-ink/45">{contextLine}</span>}
      </div>

      <div role="tablist" className="mb-4 flex gap-1 border-b border-hairline">
        {(['tags', 'pick', 'actions'] as const).map((t) => {
          if (t === 'pick' && !hasPool) return null
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={[
                'smallcaps -mb-px px-3 py-2 !text-[0.625rem] transition-colors duration-150',
                tab === t
                  ? 'border-b-2 border-penn-blue !text-penn-blue'
                  : 'border-b-2 border-transparent hover:!text-ink',
              ].join(' ')}
            >
              {t === 'pick' ? 'Pick course' : t}
            </button>
          )
        })}
      </div>

      {tab === 'tags' && (
        <div className="flex flex-col">
          {(Object.keys(FULFILLMENT_LABELS) as FulfillmentTag[]).map((tag) => {
            const on = course.userFulfills.includes(tag)
            return (
              <label
                key={tag}
                className="flex cursor-pointer items-center gap-2.5 border-b border-dotted border-hairline px-1 py-1.5 text-[0.8125rem] last:border-b-0 hover:bg-[#fbf8f0]"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleFulfillment(courseId, tag, !on)}
                  className="accent-penn-blue"
                />
                <span className={on ? 'text-ink' : 'text-ink/70'}>{FULFILLMENT_LABELS[tag]}</span>
              </label>
            )
          })}
        </div>
      )}

      {tab === 'pick' && hasPool && (
        <div className="flex flex-col">
          <p className="smallcaps mb-2">Pre-screened picks for this slot</p>
          {pool.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (course.slotId) onSwap(course.slotId, code)
                onClose()
              }}
              className="flex items-center gap-3 border-b border-dotted border-hairline px-1 py-2 text-left text-[0.8125rem] last:border-b-0 hover:bg-[#fbf8f0]"
            >
              <span className="w-[4.6rem] font-mono text-[0.6875rem] font-medium text-penn-blue">
                {code}
              </span>
              {code === course.code && (
                <span className="smallcaps !text-[0.5rem] !text-[#1e6b38]">current</span>
              )}
            </button>
          ))}
        </div>
      )}

      {tab === 'actions' && (
        <div className="flex flex-col gap-5">
          <div>
            <label className="smallcaps mb-1.5 block" htmlFor="move-select">
              Move to semester
            </label>
            <select
              id="move-select"
              value={semKey}
              onChange={(e) => {
                onMoveTo(e.target.value as SemesterKey)
                onClose()
              }}
              className="w-full rounded-sm border border-hairline bg-paper px-2.5 py-2 text-[0.8125rem]"
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

          <div>
            <p className="smallcaps mb-1.5">Cluster color</p>
            <div className="flex items-center gap-2">
              {CLUSTER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Set color ${c}`}
                  aria-pressed={color === c}
                  onClick={() => onSetColor(courseId, color === c ? null : c)}
                  className={[
                    'h-6 w-6 rounded-full transition-transform duration-150 hover:scale-110',
                    color === c ? 'ring-2 ring-ink/60 ring-offset-2 ring-offset-paper' : '',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                />
              ))}
              {color && (
                <button
                  type="button"
                  onClick={() => onSetColor(courseId, null)}
                  className="ml-1 text-[0.6875rem] text-ink/45 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="smallcaps mb-1.5 block" htmlFor="rename-input">
              Rename course ✎
            </label>
            <div className="flex gap-2">
              <input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="flex-1 rounded-sm border border-hairline bg-paper px-2.5 py-2 font-mono text-[0.75rem]"
              />
              <button
                type="button"
                disabled={renameValue === course.code || !renameValue.trim()}
                onClick={() => {
                  onRename(courseId, renameValue.trim())
                  onClose()
                }}
                className="rounded-sm border border-penn-blue px-3 py-2 text-[0.75rem] font-medium text-penn-blue transition-colors hover:bg-penn-blue/5 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>

          <div className="border-t border-hairline pt-4">
            {course.fixed ? (
              <p className="text-xs text-ink/45 italic">
                This course is a fixed VIPER requirement and can't be deleted.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onDelete()
                  onClose()
                }}
                className="rounded-sm px-3 py-1.5 text-[0.75rem] font-medium text-penn-red transition-colors hover:bg-penn-red/5"
              >
                Remove from plan
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
