import type { AugmentedPlan } from '../../plan/types'
import { SEMESTER_KEYS, semesterLabel } from '../../data/semesters'

/**
 * The load skyline: eight bars, one per academic semester, height = CU
 * against the 7.5 hard cap. The plan's whole shape in one glance —
 * blue is fine, gold is overload, red needs approval.
 */
export function LoadSkyline({
  plan,
  gradYear,
}: {
  plan: AugmentedPlan
  gradYear: number | null
}) {
  const max = 7.5
  return (
    <div className="flex items-end gap-[5px]" role="img" aria-label="CU load per semester">
      {SEMESTER_KEYS.map((k) => {
        const load = plan.loads[k] ?? 0
        const label = semesterLabel(k, gradYear ?? undefined)
        const h = Math.max(Math.min(load / max, 1) * 100, 4)
        return (
          <div key={k} className="group flex h-9 w-[0.5625rem] items-end" title={`${label.season} — ${load} CU`}>
            <div
              className={[
                'w-full rounded-t-[2px] transition-all duration-300 ease-out group-hover:opacity-80',
                load > 6.5 ? 'bg-penn-red' : load > 5.5 ? 'bg-[#b8860b]' : 'bg-penn-blue/55',
              ].join(' ')}
              style={{ height: `${h}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}
