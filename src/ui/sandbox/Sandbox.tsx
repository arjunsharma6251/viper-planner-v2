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
 * The NCC sandbox — the policy-advocacy surface. A red-ruled document
 * region (the one place Penn red frames a panel): headline numeral on top,
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
      className="rise print-block rounded-md border border-hairline bg-paper px-5 py-4 shadow-[var(--shadow-card)]"
      style={{ '--i': 2 } as React.CSSProperties}
    >
      <p className="smallcaps mb-1 !text-penn-red">Admin · NCC sandbox</p>
      <hr className="double-rule mb-4 !border-penn-red/70" />
      <WorkloadMetric workload={workload} />

      <div className="mt-4 flex flex-col">
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

      <div className="mt-4">
        <p className="smallcaps mb-1.5">Foundations</p>
        <ul className="flex flex-col">
          {workload.foundations.map((f) => (
            <li key={f.id} className="flex items-baseline py-[3px]">
              <span
                className={`text-[12px] ${f.status === 'in-term' ? 'text-ink/85' : 'text-ink/45'}`}
              >
                {f.label}
                {f.waivedBy && (
                  <span className="ml-1 text-[10px] text-ink/35 italic">— {f.waivedBy}</span>
                )}
              </span>
              <span className="leader" aria-hidden />
              <span
                className={[
                  'tnum font-mono text-[10px] tracking-wide uppercase',
                  f.status === 'waived'
                    ? 'text-[#1e6b38]'
                    : f.status === 'summer'
                      ? 'text-[#9a6a00]'
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
        className="mt-3.5 text-[11px] tracking-wide text-ink/45 transition-colors hover:text-ink"
      >
        {advanced ? '▾ Hide advanced toggles' : '▸ Advanced: individual mods + distribution profile'}
      </button>

      {advanced && (
        <div className="animate-fade mt-3 flex flex-col gap-4 border-t border-hairline pt-3.5">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="smallcaps">Distribution</span>
            {(['SS', 'H'] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5 font-mono text-[11px]">
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
                  className="tnum w-14 rounded-sm border border-hairline bg-paper px-1.5 py-1"
                  aria-label={`${k} target CU`}
                />
              </label>
            ))}
            <span className="font-mono text-[11px] text-ink/40">
              N {distributionTargets.N} fixed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-0.5">
            {(Object.keys(MOD_DEFINITIONS) as ViperModKey[]).map((key) => {
              const def = MOD_DEFINITIONS[key]
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-sm px-1 py-1 text-[12px] hover:bg-[#fbf8f0]"
                  title={def.desc}
                >
                  <input
                    type="checkbox"
                    checked={!!mods[key]}
                    className="mt-0.5 accent-penn-blue"
                    onChange={() => onModsChange({ ...toRecord(mods), [key]: !mods[key] })}
                  />
                  <span className="text-ink/80">
                    {def.label}
                    {def.saves > 0 && (
                      <span className="tnum ml-1.5 font-mono text-[10px] text-ink/40">
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
