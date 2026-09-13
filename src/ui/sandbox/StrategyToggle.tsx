import type { Strategy } from '../../ncc/types'

const ASK_CLS: Record<Strategy['ask'], string> = {
  confirmed: 'text-good',
  low: 'text-penn-blue',
  medium: 'text-caution',
  high: 'text-penn-red',
}

export interface StrategyToggleProps {
  strategy: Strategy
  on: boolean
  onToggle: () => void
}

/** One sandbox strategy row: a square breaker switch, the label, the ask level. */
export function StrategyToggle({ strategy, on, onToggle }: StrategyToggleProps) {
  return (
    <div className="flex items-center gap-3 border-b border-rule px-2 py-2 transition-colors duration-100 last:border-b-0 hover:bg-tint-blue">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={strategy.label}
        onClick={onToggle}
        className={[
          'relative h-[1.125rem] w-[2rem] shrink-0 border transition-colors duration-100',
          on ? 'border-penn-blue bg-penn-blue' : 'border-ink-3 bg-panel',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-[2px] h-[0.75rem] w-[0.75rem] transition-[left] duration-100 ease-out',
            on ? 'left-[1.0625rem] bg-sheet' : 'left-[2px] bg-ink-3',
          ].join(' ')}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-[0.8125rem] font-medium ${on ? 'text-ink' : 'text-ink-2'}`}>{strategy.label}</div>
        <div className="truncate text-[0.6875rem] text-ink-3">{strategy.desc}</div>
      </div>
      <span className={`label shrink-0 !text-[0.625rem] ${ASK_CLS[strategy.ask]}`}>
        {strategy.ask === 'confirmed' ? 'confirmed' : `${strategy.ask} ask`}
      </span>
    </div>
  )
}
