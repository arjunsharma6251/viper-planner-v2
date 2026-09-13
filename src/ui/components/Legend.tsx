import { useState } from 'react'
import { IconChevronDown, IconChevronRight, IconLock, IconOpenBreaker } from './icons'

function Terminals({ ba, bse, energy, tie }: { ba?: boolean; bse?: boolean; energy?: boolean; tie?: boolean }) {
  const cells = [
    [ba, 'var(--color-penn-blue)'],
    [bse, 'var(--color-ink)'],
    [energy, 'var(--color-energy)'],
  ] as const
  return (
    <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
      {tie && <rect x="5" y="4" width="12" height="2" fill="var(--color-penn-blue)" />}
      {cells.map(([on, color], i) => {
        const cx = 5 + i * 12
        return on ? (
          <rect key={i} x={cx - 3.5} y="1.5" width="7" height="7" fill={color} />
        ) : (
          <rect key={i} x={cx - 3} y="2" width="6" height="6" fill="none" stroke="var(--color-rule-2)" />
        )
      })}
    </svg>
  )
}

/**
 * Every mark the sheet uses, explained once. Collapsed by default; a
 * lookup, not a dashboard. Color is never the only signal elsewhere.
 */
export function Legend() {
  const [open, setOpen] = useState(false)
  const row = 'grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 py-1.5 text-[0.75rem] text-ink-2'
  return (
    <section className="panel print-block" aria-label="Legend">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={[
          'flex w-full items-center justify-between px-2 py-2 text-left transition-colors duration-100 hover:bg-tint-blue',
          open ? 'border-b border-ink' : '',
        ].join(' ')}
      >
        <span className="label !text-ink">Legend</span>
        <span className="text-ink-3" aria-hidden>
          {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </span>
      </button>
      {open && (
        <div className="fade px-2 py-1">
          <p className="label mt-1 !text-[0.625rem] !text-ink-3">Ties</p>
          <div className={row}>
            <Terminals ba />
            <span>Feeds the BA (College) bus</span>
          </div>
          <div className={row}>
            <Terminals bse />
            <span>Feeds the BSE (Engineering) bus</span>
          </div>
          <div className={row}>
            <Terminals ba bse tie />
            <span>Counts toward both degrees (overlap)</span>
          </div>
          <div className={row}>
            <Terminals energy />
            <span>VIPER energy-designated course</span>
          </div>
          <div className={row}>
            <span className="tag text-penn-red">×2</span>
            <span>Double-counts within one degree</span>
          </div>
          <p className="label mt-3 !text-[0.625rem] !text-ink-3">Breakers</p>
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
          <p className="label mt-3 !text-[0.625rem] !text-ink-3">Load meters · rated 5.5 · overload 6.5 · trip 7.5</p>
          <div className={row}>
            <span className="meter !h-[5px]" aria-hidden>
              <span className="fill bg-penn-blue" style={{ transform: 'scaleX(0.6)' }} />
            </span>
            <span>Normal load (up to 5.5 CU)</span>
          </div>
          <div className={row}>
            <span className="meter !h-[5px]" aria-hidden>
              <span className="fill bg-caution" style={{ transform: 'scaleX(0.8)' }} />
            </span>
            <span>Overload (5.5–6.5 CU), allowed but tight</span>
          </div>
          <div className={row}>
            <span className="meter !h-[5px]" aria-hidden>
              <span className="fill bg-penn-red" style={{ transform: 'scaleX(0.95)' }} />
            </span>
            <span>Needs approval above 6.5 CU; hard cap at 7.5. First semester trips at 5.5.</span>
          </div>
          <div className={row}>
            <span className="h-4 border border-dashed border-rule-2" aria-hidden />
            <span>Summer term: policy CU, not in-term load</span>
          </div>
          <div className={row}>
            <span className="flex justify-center" aria-hidden>
              <span className="h-4 w-[3px] bg-[#0f6b66]" />
            </span>
            <span>Your cluster color, set in course detail</span>
          </div>
        </div>
      )}
    </section>
  )
}
