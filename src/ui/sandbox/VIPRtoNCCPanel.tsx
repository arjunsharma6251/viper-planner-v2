import { useMemo } from 'react'
import type { AugmentedPlan } from '../../plan/types'
import { computeSEASGenElectives } from '../../ncc/compute-seas-gen'
import { normalizeViperMods } from '../../ncc/mods'
import { IconCheck } from '../components/icons'

export interface VIPRtoNCCPanelProps {
  plan: AugmentedPlan
  viperMods: Record<string, boolean>
}

/**
 * VIPER-to-NCC translation: how the College/VIPER work maps onto the seven
 * SEAS gen-ed slots. SEAS requirements stay untouched, overlaps allowed.
 */
export function VIPRtoNCCPanel({ plan, viperMods }: VIPRtoNCCPanelProps) {
  const result = useMemo(() => computeSEASGenElectives(plan, normalizeViperMods(viperMods)), [plan, viperMods])

  return (
    <section className="panel print-block" aria-label="VIPER to NCC translation">
      <h2 className="label flex items-baseline justify-between border-b border-ink px-2 py-2 !text-ink">
        SEAS gen-ed coverage
        <span className="tag !normal-case !tracking-normal text-ink-2">
          {result.satisfied}/{result.total} · {result.remaining} open
        </span>
      </h2>
      <ul className="flex flex-col px-2 py-1">
        {result.requirements.map((slot) => (
          <li key={slot.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-b border-rule py-1.5 last:border-b-0">
            <span className={['truncate text-[0.75rem]', slot.satisfied ? 'text-ink-2' : 'text-ink'].join(' ')}>{slot.label}</span>
            {slot.satisfied ? (
              <span className="tag flex items-center gap-1 !text-[0.625rem] text-good">
                <IconCheck size={10} /> {slot.filledBy ?? 'covered'}
              </span>
            ) : (
              <span className="label !text-[0.625rem] !text-ink-3">open</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
