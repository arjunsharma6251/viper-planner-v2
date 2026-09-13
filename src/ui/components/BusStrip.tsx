import type { AugmentedPlan, PlanSummary } from '../../plan/types'
import type { NccAudit } from '../../plan/ncc-audit'
import { SECTORS, FA_REQUIREMENTS } from '../../data/requirements'
import { SEMESTER_KEYS, semesterLabel } from '../../data/semesters'
import { useTrace, type Bus } from '../trace'
import { RATED, TRIP, loadStatus } from '../load'

export interface BusStripProps {
  plan: AugmentedPlan
  summary: PlanSummary
  ncc?: NccAudit
  gradYear: number | null
  view: 'grid' | 'focus'
  onView: (v: 'grid' | 'focus') => void
  /** Narrow layout (the chat drawer is open): buses on one row, figures on the next. */
  compact?: boolean
}

interface BusSpec {
  id: Bus
  name: string
  planned: number
  target: number
  unit: 'CU' | 'courses'
  met: boolean
  bar: string
  tint: string
}

/**
 * The three buses of the diagram, each with its meter and readout, then
 * the eight in-term loads and the view switch. Hovering a course lights
 * the buses it feeds.
 */
export function BusStrip({ plan, summary, ncc, gradYear, view, onView, compact }: BusStripProps) {
  const { lit } = useTrace()
  const buses: BusSpec[] = [
    {
      id: 'ba',
      name: 'BA · College',
      planned: summary.sasCU,
      target: 36,
      unit: 'CU',
      met: summary.sasCU >= 36,
      bar: 'bg-penn-blue',
      tint: 'bg-tint-blue',
    },
    {
      id: 'bse',
      name: 'BSE · Engineering',
      planned: summary.seasCU,
      target: 40,
      unit: 'CU',
      met: summary.seasCU >= 40,
      bar: 'bg-ink',
      tint: 'bg-ink/6',
    },
    {
      id: 'energy',
      name: 'Energy · VIPER',
      planned: Math.min(summary.energyCoursesCount, 3),
      target: 3,
      unit: 'courses',
      met: summary.meetsEnergyReq,
      bar: 'bg-energy',
      tint: 'bg-tint-energy',
    },
  ]

  const figures: Array<{ value: string; label: string; met: boolean }> = ncc
    ? [
        {
          value: `${ncc.plannedFoundations}/${ncc.foundations.length}`,
          label: 'foundations',
          met: ncc.plannedFoundations >= ncc.foundations.length,
        },
        {
          value: `${ncc.divisions.reduce((s, d) => s + Math.min(d.planned, d.target), 0)}/${ncc.divisions.reduce((s, d) => s + d.target, 0)}`,
          label: 'CU distribution',
          met: ncc.divisions.every((d) => d.planned >= d.target),
        },
      ]
    : [
        {
          value: `${summary.fulfilledSec.length}/${SECTORS.length}`,
          label: 'sectors',
          met: summary.unfulfilledSec.length === 0,
        },
        {
          value: `${summary.fulfilledFA.length}/${FA_REQUIREMENTS.length}`,
          label: 'approaches',
          met: summary.unfulfilledFA.length === 0,
        },
      ]

  return (
    <div className="border-y border-ink">
      <div
        className={[
          'grid grid-cols-1 sm:grid-cols-3',
          compact ? '' : 'lg:grid-cols-[repeat(3,minmax(11.5rem,1fr))_minmax(0,auto)_auto_auto]',
        ].join(' ')}
      >
        {buses.map((b) => {
          const on = lit.has(b.id)
          const pct = Math.min(b.planned / b.target, 1) * 100
          return (
            <div
              key={b.id}
              data-lit={on || undefined}
              className={[
                'relative border-b border-rule px-3 pt-2.5 pb-2.5 transition-colors duration-150 ease-out sm:border-b-0 sm:border-r',
                on ? b.tint : '',
              ].join(' ')}
            >
              <div className={`absolute inset-x-0 top-0 h-[3px] ${b.bar}`} aria-hidden />
              <div className="flex items-baseline justify-between gap-3">
                <span className="label whitespace-nowrap !text-ink">{b.name}</span>
                <span className="tag whitespace-nowrap text-ink">
                  {b.planned}
                  <span className="text-ink-3"> / {b.target}</span>
                  <span className="label ml-1 !text-[0.625rem] !text-ink-3">{b.unit}</span>
                  <span className="sr-only">{b.met ? ', satisfied' : ', not yet satisfied'}</span>
                </span>
              </div>
              <div className="meter mt-2" role="img" aria-label={`${b.planned} of ${b.target} ${b.unit}`}>
                <div className={`fill ${b.bar}`} style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
            </div>
          )
        })}

        <div
          className={[
            'flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-rule px-3 py-2 sm:col-span-2',
            compact ? '' : 'lg:col-span-1 lg:border-r lg:border-b-0',
          ].join(' ')}
        >
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="tag text-ink">{summary.totalCU}</span>
            <span className="label !text-[0.625rem] !text-ink-3">of 40 CU dual min</span>
          </div>
          {figures.map((f) => (
            <div key={f.label} className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="tag text-ink">{f.value}</span>
              <span className="label !text-[0.625rem] !text-ink-3">{f.label}</span>
            </div>
          ))}
        </div>

        <div className={['flex-col justify-center gap-1 border-r border-rule px-3 py-1.5', compact ? 'hidden' : 'hidden lg:flex'].join(' ')}>
          <span className="label !text-[0.625rem] !text-ink-3">In-term load</span>
          <ul className="flex items-end gap-[5px]" aria-label="CU load per academic semester">
            {SEMESTER_KEYS.map((k) => {
              const load = plan.loads[k] ?? 0
              const label = semesterLabel(k, gradYear ?? undefined)
              const h = Math.max(Math.min(load / TRIP, 1) * 100, 6)
              const first = k === 'fall-y1'
              const status = loadStatus(load, false, first)
              const cls = status.tone === 'problem' ? 'bg-penn-red' : status.tone === 'caution' ? 'bg-caution' : 'bg-penn-blue'
              return (
                <li key={k} className="flex flex-col items-center gap-1" title={`${label.season}: ${load} CU${status.word ? `, ${status.word}` : ''}`}>
                  <span className="relative flex h-5 w-[9px] items-end" aria-hidden>
                    <span className="absolute inset-x-0 border-t border-dashed border-ink-3" style={{ bottom: `${(RATED / TRIP) * 100}%` }} />
                    <span className={`w-full ${cls}`} style={{ height: `${h}%` }} />
                  </span>
                  <span className={['tag !text-[0.625rem]', status.tone === 'problem' ? 'text-penn-red' : status.tone === 'caution' ? 'text-caution' : 'text-ink-2'].join(' ')}>
                    {load}
                  </span>
                  <span className="sr-only">
                    {label.season}: {load} CU{status.word ? `, ${status.word}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={['no-print flex items-center justify-end px-3 py-2 sm:col-span-1', compact ? 'border-b border-rule sm:border-b-0' : ''].join(' ')}>
          <div className="seg" role="tablist" aria-label="Schedule view">
            {(['grid', 'focus'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => onView(v)}
              >
                {v}
                <span className="kbd ml-1.5" aria-hidden>
                  V
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
