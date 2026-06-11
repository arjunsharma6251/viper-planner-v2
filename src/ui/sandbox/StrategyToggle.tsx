import type { Strategy } from '../../ncc/types'

const ASK_BADGE: Record<Strategy['ask'], string> = {
  confirmed: 'bg-green-700/10 text-green-800',
  low: 'bg-penn-blue/10 text-penn-blue',
  medium: 'bg-amber-500/15 text-amber-700',
  high: 'bg-penn-red/10 text-penn-red',
}

export interface StrategyToggleProps {
  strategy: Strategy
  on: boolean
  onToggle: () => void
}

/** One sandbox strategy row: human-readable label, ask-level badge, switch. */
export function StrategyToggle({ strategy, on, onToggle }: StrategyToggleProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-white/70">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={strategy.label}
        onClick={onToggle}
        className={[
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150',
          on ? 'bg-penn-blue' : 'bg-ink/15',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] duration-150',
            on ? 'left-[18px]' : 'left-0.5',
          ].join(' ')}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{strategy.label}</div>
        <div className="truncate text-xs text-ink/50">{strategy.desc}</div>
      </div>
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${ASK_BADGE[strategy.ask]}`}
      >
        {strategy.ask === 'confirmed' ? 'confirmed' : `${strategy.ask} ask`}
      </span>
    </div>
  )
}
