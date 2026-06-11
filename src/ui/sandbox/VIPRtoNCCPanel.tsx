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
    <section aria-label="VIPER to NCC translation" className="rounded-xl bg-ink/3 p-6">
      <h3 className="mb-1 text-sm font-medium">SEAS gen-ed coverage</h3>
      <p className="mb-3 font-mono text-xs text-ink/50">
        {result.satisfied} of {result.total} slots covered · {result.remaining} remaining
      </p>
      <ul className="flex flex-col gap-1 text-xs">
        {result.requirements.map((slot) => (
          <li key={slot.id} className="flex items-center justify-between gap-2 py-0.5">
            <span className={slot.satisfied ? 'text-ink/50' : ''}>{slot.label}</span>
            <span className={slot.satisfied ? 'font-mono text-green-700' : 'font-mono text-ink/40'}>
              {slot.satisfied ? `✓ ${slot.filledBy ?? 'covered'}` : 'open'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
