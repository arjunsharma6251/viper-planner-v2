/**
 * The legend: every mark the schedule uses, explained once. Color is never
 * the only signal elsewhere (tooltips/text carry the meaning), but the
 * legend makes the system learnable at a glance.
 */
export function Legend() {
  const row = 'flex items-center gap-2.5 py-1 text-[0.75rem] text-ink-soft'
  return (
    <aside
      className="rise print-block rounded-md border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      aria-label="Legend"
      style={{ '--i': 4 } as React.CSSProperties}
    >
      <p className="smallcaps mb-1">Legend</p>
      <hr className="double-rule mb-3" />
      <div className="flex flex-col">
        <div className={row}>
          <span className="w-9 shrink-0 text-[0.625rem] tracking-[0.15em] text-[#b8860b]">
            ★★
          </span>
          <span>Counts toward both degrees (BA + BSE overlap)</span>
        </div>
        <div className={row}>
          <span className="w-9 shrink-0 text-[0.625rem] tracking-[0.15em] text-penn-red">
            ★★
          </span>
          <span>Double-counts within one degree</span>
        </div>
        <div className={row}>
          <span className="w-9 shrink-0 text-center text-[0.625rem] text-ink/40">×3</span>
          <span>Three stars = triple-count; one job earns no stars</span>
        </div>
        <div className={row}>
          <span className="smallcaps w-9 shrink-0 text-center !text-[0.5rem]">moved</span>
          <span>Moved from its seeded semester</span>
        </div>
        <div className={row}>
          <span className="flex w-9 shrink-0 items-center" aria-hidden>
            <span className="h-[3px] w-full rounded-full bg-penn-blue/70" />
          </span>
          <span>Load meter — normal (≤ 5.5 CU)</span>
        </div>
        <div className={row}>
          <span className="flex w-9 shrink-0 items-center" aria-hidden>
            <span className="h-[3px] w-full rounded-full bg-[#b8860b]" />
          </span>
          <span>Dual overload (5.5–6.5 CU), allowed but tight</span>
        </div>
        <div className={row}>
          <span className="flex w-9 shrink-0 items-center" aria-hidden>
            <span className="h-[3px] w-full rounded-full bg-penn-red" />
          </span>
          <span>Needs approval (&gt; 6.5 CU); hard cap at 7.5</span>
        </div>
        <div className={row}>
          <span
            className="w-9 shrink-0 rounded-sm border border-dashed border-rule py-0.5"
            aria-hidden
          />
          <span>Summer term — policy CU, not in-term burden</span>
        </div>
        <div className={row}>
          <span className="flex w-9 shrink-0 justify-center" aria-hidden>
            <span className="h-4 w-[3px] rounded-full bg-[#0f6b66]" />
          </span>
          <span>Your cluster color (set in course detail)</span>
        </div>
      </div>
    </aside>
  )
}
