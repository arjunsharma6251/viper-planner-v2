import { CAP, FIRST_SEMESTER_CAP, FORM_THRESHOLD } from '../load'
import { IconBolt, IconLock, IconOpenBreaker } from './icons'

/**
 * Every mark the sheet uses, explained once. Rendered inside the
 * Reference dropdown; color is never the only signal elsewhere.
 */
export function LegendContent() {
  const row = 'grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 py-1.5 text-[0.75rem] text-ink-2'
  return (
    <div>
          <p className="label !text-[0.625rem] !text-ink-3">Counts</p>
          <div className={row}>
            <span className="tag text-center text-penn-blue">×2</span>
            <span>Double-counts: satisfies two requirements</span>
          </div>
          <div className={row}>
            <span className="tag text-center text-penn-red">×3</span>
            <span>Triple-counts: three or more requirements</span>
          </div>
          <div className={row}>
            <span className="flex justify-center text-energy">
              <IconBolt size={13} />
            </span>
            <span>VIPER energy-designated course</span>
          </div>
          <p className="label mt-3 !text-[0.625rem] !text-ink-3">Courses</p>
          <div className={row}>
            <span className="flex justify-center text-ink-3">
              <IconOpenBreaker size={14} />
            </span>
            <span>Open slot: a requirement reserved, course not chosen yet</span>
          </div>
          <div className={row}>
            <span className="flex justify-center text-ink-3">
              <IconLock size={12} />
            </span>
            <span>Fixed VIPER requirement, cannot be removed</span>
          </div>
          <div className={row}>
            <span className="label !text-[0.625rem] !text-ink-3">moved</span>
            <span>Moved from its seeded term</span>
          </div>
          <p className="label mt-3 !text-[0.625rem] !text-ink-3">Course load</p>
          <div className={row}>
            <span className="tag text-center text-penn-red">{FIRST_SEMESTER_CAP}</span>
            <span>First-semester cap. Later terms are capped at {CAP} CU.</span>
          </div>
          <div className={row}>
            <span className="tag text-center text-penn-red">{FORM_THRESHOLD}+</span>
            <span>Needs a Max CU Increase request on Path@Penn.</span>
          </div>
          <div className={row}>
            <span className="h-4 border border-dashed border-rule-2" aria-hidden />
            <span>Summer term: counts toward the degree, not toward the term cap</span>
          </div>
          <div className={row}>
            <span className="flex justify-center" aria-hidden>
              <span className="h-4 w-[3px] bg-[#0f6b66]" />
            </span>
            <span>Your cluster color, set in course detail</span>
          </div>
    </div>
  )
}
