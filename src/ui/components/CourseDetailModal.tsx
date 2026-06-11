import { useState } from 'react'
import type { AugmentedCourse, FulfillmentTag } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { ALL_SEMESTER_KEYS, semesterLabel } from '../../data/semesters'
import { pcrUrlFor } from '../../utils/pcr'
import { Modal } from './Modal'

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

type Tab = 'tags' | 'pick' | 'actions'

export interface CourseDetailModalProps {
  course: AugmentedCourse
  semKey: SemesterKey
  gradYear: number | null
  onClose: () => void
  onToggleFulfillment: (courseId: string, tag: FulfillmentTag, on: boolean) => void
  onSwap: (slotId: string, newCode: string) => void
  onRename: (courseId: string, newCode: string) => void
  onMoveTo: (to: SemesterKey) => void
  onDelete: () => void
}

/**
 * Course detail: ≤3 tabs (Tags, Pick course, Actions) — don't grow this.
 * The Actions tab's move-dropdown is the keyboard alternative to drag.
 */
export function CourseDetailModal({
  course,
  semKey,
  gradYear,
  onClose,
  onToggleFulfillment,
  onSwap,
  onRename,
  onMoveTo,
  onDelete,
}: CourseDetailModalProps) {
  const [tab, setTab] = useState<Tab>('tags')
  const [renameValue, setRenameValue] = useState(course.code)
  const courseId = course.originalCode ?? course.code
  const pcr = pcrUrlFor(course)
  const hasPool = !!course.slotId && (course.pool?.length ?? course.suggests?.length ?? 0) > 0
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
    <Modal title={`${course.code} — ${course.title}`} onClose={onClose}>
      <div className="mb-4 flex items-center gap-3 text-sm text-ink/60">
        <span className="font-mono text-xs">{course.cu} CU</span>
        {pcr && (
          <a
            href={pcr}
            target="_blank"
            rel="noopener noreferrer"
            className="text-penn-blue hover:underline"
          >
            Penn Course Review ↗
          </a>
        )}
      </div>
      {contextLine && <p className="mb-4 text-xs text-ink/50">{contextLine}</p>}

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
                'rounded-t-md px-3 py-1.5 text-sm capitalize',
                tab === t
                  ? 'border-b-2 border-penn-blue font-medium text-penn-blue'
                  : 'text-ink/50 hover:text-ink',
              ].join(' ')}
            >
              {t === 'pick' ? 'Pick course' : t}
            </button>
          )
        })}
      </div>

      {tab === 'tags' && (
        <div className="flex flex-col gap-1">
          {(Object.keys(FULFILLMENT_LABELS) as FulfillmentTag[]).map((tag) => {
            const on = course.userFulfills.includes(tag)
            return (
              <label
                key={tag}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-cream"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleFulfillment(courseId, tag, !on)}
                  className="accent-penn-blue"
                />
                {FULFILLMENT_LABELS[tag]}
              </label>
            )
          })}
        </div>
      )}

      {tab === 'pick' && hasPool && (
        <div className="flex flex-col gap-1">
          <p className="mb-1 text-xs text-ink/50">Pre-screened picks for this slot:</p>
          {pool.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (course.slotId) onSwap(course.slotId, code)
                onClose()
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-cream"
            >
              <span className="font-mono text-xs text-penn-blue">{code}</span>
              {code === course.code && <span className="text-xs text-green-700">current</span>}
            </button>
          ))}
        </div>
      )}

      {tab === 'actions' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="move-select">
              Move to semester
            </label>
            <select
              id="move-select"
              value={semKey}
              onChange={(e) => {
                onMoveTo(e.target.value as SemesterKey)
                onClose()
              }}
              className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="rename-input">
              Rename course ✎
            </label>
            <div className="flex gap-2">
              <input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="flex-1 rounded-md border border-hairline px-2 py-1.5 font-mono text-sm"
              />
              <button
                type="button"
                disabled={renameValue === course.code || !renameValue.trim()}
                onClick={() => {
                  onRename(courseId, renameValue.trim())
                  onClose()
                }}
                className="rounded-md border border-penn-blue px-3 py-1.5 text-sm text-penn-blue disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>

          <div className="border-t border-hairline pt-3">
            {course.fixed ? (
              <p className="text-xs text-ink/50">
                This course is a fixed VIPER requirement and can't be deleted.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onDelete()
                  onClose()
                }}
                className="rounded-md px-3 py-1.5 text-sm text-penn-red hover:bg-penn-red/5"
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
