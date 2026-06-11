import { useMemo } from 'react'
import type { AugmentedPlan } from '../../plan/types'
import { computeSEASGenElectives } from '../../ncc/compute-seas-gen'
import { normalizeViperMods } from '../../ncc/mods'

export interface VIPRtoNCCPanelProps {
  plan: AugmentedPlan
  viperMods: Record<string, boolean>
}

/**
 * VIPER-to-NCC translation: how the College/VIPER work maps onto the seven
 * SEAS gen-ed slots. Per Michelle: SEAS requirements stay untouched,
 * overlaps allowed — this panel shows that the SEAS side is already covered.
 */
export function VIPRtoNCCPanel({ plan, viperMods }: VIPRtoNCCPanelProps) {
  const result = useMemo(
    () => computeSEASGenElectives(plan, normalizeViperMods(viperMods)),
    [plan, viperMods],
  )

  return (
    <aside
      className="rise print-block rounded-lg border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      aria-label="VIPER to NCC translation"
      style={{ '--i': 3 } as React.CSSProperties}
    >
      <p className="smallcaps mb-1">SEAS gen-ed coverage</p>
      <hr className="double-rule mb-3" />
      <p className="tnum mb-2.5 font-mono text-[0.6875rem] text-ink-soft">
        {result.satisfied} of {result.total} slots covered · {result.remaining} remaining
      </p>
      <ul className="flex flex-col">
        {result.requirements.map((slot) => (
          <li key={slot.id} className="flex items-baseline py-[3px]">
            <span className={`text-[0.75rem] ${slot.satisfied ? 'text-ink/45' : 'text-ink/85'}`}>
              {slot.label}
            </span>
            <span className="leader" aria-hidden />
            <span
              className={
                slot.satisfied
                  ? 'font-mono text-[0.625rem] text-[#1e6b38]'
                  : 'font-mono text-[0.625rem] tracking-wide text-ink/40 uppercase'
              }
            >
              {slot.satisfied ? `✓ ${slot.filledBy ?? 'covered'}` : 'open'}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
