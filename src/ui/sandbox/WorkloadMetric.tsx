import type { WorkloadResult } from '../../ncc/types'

/**
 * In-term NCC workload against the fixed 14 CU baseline, as a bus meter:
 * the number the policy meeting is about, with the policy/in-term split
 * always visible beside it, never merged.
 */
export function WorkloadMetric({ workload }: { workload: WorkloadResult }) {
  const pct = Math.min(workload.inTermTotalCU / workload.baselineCU, 1) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label !text-ink">In-term NCC workload</span>
        <span className="tag text-ink">
          {workload.inTermTotalCU}
          <span className="text-ink-3"> / {workload.baselineCU} CU</span>
        </span>
      </div>
      <div className="meter mt-2" role="img" aria-label={`${workload.inTermTotalCU} of ${workload.baselineCU} CU baseline`}>
        <div className="fill bg-penn-red" style={{ transform: `scaleX(${pct / 100})` }} />
        <span
          className="tick"
          style={{ left: `${((workload.baselineCU - workload.goalReductionMax) / workload.baselineCU) * 100}%` }}
          aria-hidden
        />
        <span
          className="tick"
          style={{ left: `${((workload.baselineCU - workload.goalReductionMin) / workload.baselineCU) * 100}%` }}
          aria-hidden
        />
      </div>
      <p className={['mt-2 text-[0.75rem] font-medium', workload.meetsGoal ? 'text-good' : 'text-ink-2'].join(' ')}>
        −{workload.reductionCU} CU from baseline
        {workload.meetsGoal
          ? ' · meets the 4–6 CU goal'
          : ` · goal is −${workload.goalReductionMin} to −${workload.goalReductionMax}`}
      </p>
      <dl className="mt-2 border-t border-rule">
        {(
          [
            ['Policy total', `${workload.policyTotalCU} CU`],
            ['Summer offload', `${workload.summerOffloadCU} CU`],
            ['Distribution net', `${workload.distNetCU} CU`],
            ['Foundations waived', `${workload.foundationsWaivedCount}`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2 border-b border-rule py-1 last:border-b-0">
            <dt className="text-[0.75rem] text-ink-2">{label}</dt>
            <dd className="tag text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
