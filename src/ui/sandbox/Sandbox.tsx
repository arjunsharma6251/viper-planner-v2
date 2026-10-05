import { useMemo, useState } from 'react'
import type { AugmentedPlan } from '../../plan/types'
import type { DistributionTargets } from '../../plan/serialize'
import { computeNCCWorkload } from '../../ncc/compute-workload'
import { MEMO_DISTRIBUTION_TARGETS, MEMO_VIPER_MODS, MOD_DEFINITIONS, normalizeViperMods } from '../../ncc/mods'
import { STRATEGIES, isStrategyOn, toggleStrategy } from '../../ncc/strategies'
import type { ViperModKey, ViperMods } from '../../ncc/types'
import { WorkloadMetric } from './WorkloadMetric'
import { StrategyToggle } from './StrategyToggle'
import { IconChevronDown, IconChevronRight } from '../components/icons'

export interface SandboxProps {
  plan: AugmentedPlan
  viperMods: Record<string, boolean>
  distributionTargets: DistributionTargets
  onModsChange: (mods: Record<string, boolean>) => void
  onTargetsChange: (targets: DistributionTargets) => void
}

const STATUS_LABEL = { waived: 'waived', summer: 'summer', 'in-term': 'in-term' } as const
const STATUS_CLS = { waived: 'text-good', summer: 'text-caution', 'in-term': 'text-ink' } as const

/** ViperMods is a closed interface; the store persists a plain record. */
function toRecord(mods: ViperMods): Record<string, boolean> {
  return Object.fromEntries(Object.entries(mods))
}

/**
 * The NCC sandbox: the policy-advocacy panel, ruled in Penn red so it never
 * reads as student truth. Workload meter on top, one breaker per strategy,
 * mod-level toggles and the distribution profile behind "advanced".
 */
export function Sandbox({ plan, viperMods, distributionTargets, onModsChange, onTargetsChange }: SandboxProps) {
  const [advanced, setAdvanced] = useState(false)
  const mods = useMemo(() => normalizeViperMods(viperMods), [viperMods])
  const workload = useMemo(
    () => computeNCCWorkload(plan, distributionTargets, mods),
    [plan, distributionTargets, mods],
  )

  return (
    <section aria-label="NCC sandbox" className="print-block border border-penn-red">
      <h2 className="label border-b border-penn-red px-2 py-2 !text-penn-red">Admin · NCC sandbox · proposals, not policy</h2>
      <div className="px-2 pt-3 pb-2">
        <WorkloadMetric workload={workload} />
      </div>

      {(['memo', 'experimental'] as const).map((group) => (
        <div key={group} className="border-t border-rule">
          <div className="flex items-center justify-between gap-2 px-2 pt-2 pb-1">
            <p className="label !text-[0.625rem] !text-ink-3">{group === 'memo' ? 'October 2026 memo' : 'Also modeled'}</p>
            {group === 'memo' && (
              <button
                type="button"
                onClick={() => {
                  onModsChange(toRecord(MEMO_VIPER_MODS))
                  onTargetsChange({ ...MEMO_DISTRIBUTION_TARGETS })
                }}
                className="btn btn-quiet !py-0.5 !text-[0.6875rem]"
              >
                Load memo
              </button>
            )}
          </div>
          {STRATEGIES.filter((s) => s.group === group).map((s) => (
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
      ))}

      <div className="border-t border-rule px-2 py-2">
        <p className="label mb-1 !text-[0.625rem] !text-ink-3">Foundations under this proposal</p>
        <ul className="flex flex-col">
          {workload.foundations.map((f) => (
            <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-b border-rule py-1 last:border-b-0">
              <span className={['truncate text-[0.75rem]', f.status === 'in-term' ? 'text-ink' : 'text-ink-2'].join(' ')}>
                {f.label}
                {f.waivedBy && <span className="ml-1 text-[0.625rem] text-ink-3">— {f.waivedBy}</span>}
              </span>
              <span className={`label !text-[0.625rem] ${STATUS_CLS[f.status]}`}>{STATUS_LABEL[f.status]}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        aria-expanded={advanced}
        className="flex w-full items-center justify-between border-t border-rule px-2 py-2 text-left text-[0.75rem] text-ink-2 transition-colors duration-100 hover:bg-tint-blue"
      >
        <span>Advanced: individual mods and distribution profile</span>
        <span className="text-ink-3" aria-hidden>
          {advanced ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </span>
      </button>

      {advanced && (
        <div className="fade flex flex-col gap-3 border-t border-rule px-2 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[0.75rem]">
            <span className="label">Distribution</span>
            {(['SS', 'H'] as const).map((k) => (
              <label key={k} className="tag flex items-center gap-1.5">
                {k}
                <input
                  type="number"
                  min={0}
                  max={k === 'SS' ? 5 : 3}
                  value={distributionTargets[k]}
                  onChange={(e) =>
                    onTargetsChange({ ...distributionTargets, [k]: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="field w-14 !py-1 font-mono !text-[0.6875rem]"
                  aria-label={`${k} target CU`}
                />
              </label>
            ))}
            <span className="tag text-ink-3">N {distributionTargets.N} fixed</span>
          </div>

          <div className="border-t border-rule">
            {(Object.keys(MOD_DEFINITIONS) as ViperModKey[]).map((key) => {
              const def = MOD_DEFINITIONS[key]
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2.5 border-b border-rule px-1 py-1.5 text-[0.75rem] transition-colors duration-100 last:border-b-0 hover:bg-tint-blue"
                  title={def.desc}
                >
                  <input
                    type="checkbox"
                    checked={!!mods[key]}
                    className="box mt-0.5"
                    onChange={() => onModsChange({ ...toRecord(mods), [key]: !mods[key] })}
                  />
                  <span className="text-ink">
                    {def.label}
                    {def.saves > 0 && <span className="tag ml-1.5 text-ink-3">−{def.saves} CU</span>}
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
