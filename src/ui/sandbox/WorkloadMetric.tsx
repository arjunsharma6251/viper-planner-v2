import type { WorkloadResult } from '../../ncc/types'

/**
 * The headline metric: NCC workload in-term. The single most important
 * number on the admin surface — a giant Fraunces numeral against the
 * fixed 14 baseline, with the policy/in-term split always visible beside
 * it, never merged.
 */
export function WorkloadMetric({ workload }: { workload: WorkloadResult }) {
  return (
    <div>
      <p className="smallcaps">In-term workload</p>
      <div className="flex items-baseline">
        <span className="tnum font-display text-[68px] leading-[0.95] font-semibold tracking-tight text-penn-blue">
          {workload.inTermTotalCU}
        </span>
        <span className="ml-2 font-display text-[18px] text-ink/35 italic">
          / {workload.baselineCU} CU
        </span>
      </div>
      <p
        className={[
          'mt-1.5 text-[12px] font-medium',
          workload.meetsGoal ? 'text-[#1e6b38]' : 'text-ink-soft',
        ].join(' ')}
      >
        −{workload.reductionCU} CU from baseline
        {workload.meetsGoal
          ? ' · meets the 4–6 CU goal ✓'
          : ` · goal is −${workload.goalReductionMin} to −${workload.goalReductionMax}`}
      </p>
      <dl className="mt-3 border-t border-dotted border-hairline pt-2">
        {(
          [
            ['Policy total', `${workload.policyTotalCU} CU`],
            ['Summer offload', `${workload.summerOffloadCU} CU`],
            ['Distribution net', `${workload.distNetCU} CU`],
            ['Foundations waived', `${workload.foundationsWaivedCount}`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline py-[3px]">
            <dt className="text-[12px] text-ink-soft">{label}</dt>
            <span className="leader" aria-hidden />
            <dd className="tnum font-mono text-[11px] text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
