import type { Strategy } from '../../ncc/types'

const ASK_BADGE: Record<Strategy['ask'], string> = {
  confirmed: 'border-[#1e6b38]/30 text-[#1e6b38]',
  low: 'border-penn-blue/30 text-penn-blue',
  medium: 'border-[#9a6a00]/35 text-[#9a6a00]',
  high: 'border-penn-red/30 text-penn-red',
}

export interface StrategyToggleProps {
  strategy: Strategy
  on: boolean
  onToggle: () => void
}

/** One sandbox strategy row: switch, human-readable label, ask-level badge. */
export function StrategyToggle({ strategy, on, onToggle }: StrategyToggleProps) {
  return (
    <div className="flex items-center gap-3 border-b border-dotted border-hairline px-1 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-[#fbf8f0]">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={strategy.label}
        onClick={onToggle}
        className={[
          'relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors duration-200',
          on ? 'bg-penn-blue' : 'bg-ink/15',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-[2px] h-[14px] w-[14px] rounded-full bg-paper shadow-sm transition-[left] duration-200 ease-out',
            on ? 'left-[18px]' : 'left-[2px]',
          ].join(' ')}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium ${on ? 'text-ink' : 'text-ink/70'}`}>
          {strategy.label}
        </div>
        <div className="truncate text-[11px] text-ink/45">{strategy.desc}</div>
      </div>
      <span
        className={`smallcaps shrink-0 rounded-full border px-2 py-0.5 !text-[8px] ${ASK_BADGE[strategy.ask]}`}
      >
        {strategy.ask === 'confirmed' ? 'confirmed' : `${strategy.ask} ask`}
      </span>
    </div>
  )
}
