import type { WorkloadResult } from '../../ncc/types'

/**
 * The headline metric: NCC workload in-term. This is the single most
 * important number on the admin surface (display-xl, Von Restorff) — the
 * policy/in-term split stays visible beside it, never merged.
 */
export function WorkloadMetric({ workload }: { workload: WorkloadResult }) {
  return (
    <div className="flex items-end gap-8">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
          NCC workload · in-term
        </div>
        <div className="font-display text-6xl font-semibold text-penn-blue">
          {workload.inTermTotalCU}
          <span className="ml-2 text-xl font-normal text-ink/40">CU</span>
        </div>
      </div>
      <dl className="mb-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
        <dt className="text-ink/50">Policy total</dt>
        <dd className="text-right font-mono text-xs">{workload.policyTotalCU} CU</dd>
        <dt className="text-ink/50">Summer offload</dt>
        <dd className="text-right font-mono text-xs">{workload.summerOffloadCU} CU</dd>
        <dt className="text-ink/50">Baseline (fixed)</dt>
        <dd className="text-right font-mono text-xs">{workload.baselineCU} CU</dd>
        <dt className="text-ink/50">Reduction</dt>
        <dd
          className={[
            'text-right font-mono text-xs',
            workload.meetsGoal ? 'font-semibold text-green-700' : 'text-ink',
          ].join(' ')}
        >
          −{workload.reductionCU} CU{' '}
          {workload.meetsGoal
            ? '· meets goal'
            : `· goal −${workload.goalReductionMin} to −${workload.goalReductionMax}`}
        </dd>
      </dl>
    </div>
  )
}
