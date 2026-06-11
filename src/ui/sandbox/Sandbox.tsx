import { useMemo, useState } from 'react'
import type { AugmentedPlan } from '../../plan/types'
import type { DistributionTargets } from '../../plan/serialize'
import { computeNCCWorkload } from '../../ncc/compute-workload'
import { MOD_DEFINITIONS, normalizeViperMods } from '../../ncc/mods'
import { STRATEGIES, isStrategyOn, toggleStrategy } from '../../ncc/strategies'
import type { ViperModKey, ViperMods } from '../../ncc/types'
import { WorkloadMetric } from './WorkloadMetric'
import { StrategyToggle } from './StrategyToggle'

export interface SandboxProps {
  plan: AugmentedPlan
  viperMods: Record<string, boolean>
  distributionTargets: DistributionTargets
  onModsChange: (mods: Record<string, boolean>) => void
  onTargetsChange: (targets: DistributionTargets) => void
}

const STATUS_LABEL = { waived: 'waived', summer: 'summer', 'in-term': 'in-term' } as const

/** ViperMods is a closed interface; the store persists a plain record. */
function toRecord(mods: ViperMods): Record<string, boolean> {
  return Object.fromEntries(Object.entries(mods))
}

/**
 * The NCC sandbox — the policy-advocacy surface. Headline metric on top,
 * one row per strategy, mod-level toggles and the distribution profile in
 * an "advanced" disclosure underneath.
 */
export function Sandbox({
  plan,
  viperMods,
  distributionTargets,
  onModsChange,
  onTargetsChange,
}: SandboxProps) {
  const [advanced, setAdvanced] = useState(false)
  const mods = useMemo(() => normalizeViperMods(viperMods), [viperMods])
  const workload = useMemo(
    () => computeNCCWorkload(plan, distributionTargets, mods),
    [plan, distributionTargets, mods],
  )

  return (
    <section
      aria-label="NCC sandbox"
      className="rounded-xl bg-ink/3 p-6"
    >
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-penn-red">
        Admin · NCC sandbox
      </div>
      <WorkloadMetric workload={workload} />

      <div className="mt-5 flex flex-col gap-0.5">
        {STRATEGIES.map((s) => (
          <StrategyToggle
            key={s.id}
            strategy={s}
            on={isStrategyOn(s, mods, distributionTargets)}
            onToggle={() => {
              const next = toggleStrategy(s, mods, distributionTargets)
              onModsChange(toRecord(next.mods))
              onTargetsChange(next.targets)
            }}
          />
        ))}
      </div>

      <div className="mt-4 border-t border-hairline pt-3">
        <h3 className="mb-1 text-sm font-medium">Foundations</h3>
        <ul className="grid grid-cols-2 gap-x-4 text-xs">
          {workload.foundations.map((f) => (
            <li key={f.id} className="flex justify-between py-0.5">
              <span className={f.status === 'in-term' ? '' : 'text-ink/40'}>
                {f.label}
                {f.waivedBy && <span className="text-ink/30"> — {f.waivedBy}</span>}
              </span>
              <span
                className={[
                  'font-mono',
                  f.status === 'waived'
                    ? 'text-green-700'
                    : f.status === 'summer'
                      ? 'text-amber-600'
                      : 'text-ink/70',
                ].join(' ')}
              >
                {STATUS_LABEL[f.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        aria-expanded={advanced}
        className="mt-3 text-xs text-ink/50 hover:text-ink"
      >
        {advanced ? '▾ Hide advanced toggles' : '▸ Advanced: individual mods + distribution profile'}
      </button>

      {advanced && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink/60">Distribution profile</span>
            {(['SS', 'H'] as const).map((k) => (
              <label key={k} className="flex items-center gap-1 font-mono text-xs">
                {k}
                <input
                  type="number"
                  min={0}
                  max={k === 'SS' ? 5 : 3}
                  value={distributionTargets[k]}
                  onChange={(e) =>
                    onTargetsChange({
                      ...distributionTargets,
                      [k]: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-14 rounded border border-hairline bg-white px-1.5 py-0.5"
                  aria-label={`${k} target CU`}
                />
              </label>
            ))}
            <span className="font-mono text-xs text-ink/40">N {distributionTargets.N} (fixed)</span>
          </div>

          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {(Object.keys(MOD_DEFINITIONS) as ViperModKey[]).map((key) => {
              const def = MOD_DEFINITIONS[key]
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 text-xs hover:bg-white/70"
                  title={def.desc}
                >
                  <input
                    type="checkbox"
                    checked={!!mods[key]}
                    className="mt-0.5 accent-penn-blue"
                    onChange={() => onModsChange({ ...toRecord(mods), [key]: !mods[key] })}
                  />
                  <span>
                    {def.label}
                    {def.saves > 0 && (
                      <span className="ml-1 font-mono text-[10px] text-ink/40">
                        −{def.saves} CU
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
