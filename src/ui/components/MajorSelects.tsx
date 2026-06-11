import { MAJORS, SAS_MAJORS, SEAS_MAJORS } from '../../data/majors'
import type { PlanConfig } from '../store/use-plan-store'

export interface MajorSelectsProps {
  config: PlanConfig
  /** Re-seeds the plan; caller confirms with the user first. */
  onChange: (next: PlanConfig) => void
}

function defaultConcKey(majorKey: string): string | null {
  const concs = Object.entries(MAJORS[majorKey]?.concentrations ?? {})
  const def = concs.find(([, c]) => c.default)
  return def?.[0] ?? concs[0]?.[0] ?? null
}

// Reads as typeset text until engaged: no underline at rest, a quiet chevron,
// dotted rule surfacing on hover/focus.
const ghostSelect =
  'cursor-pointer appearance-none rounded-sm border-b border-dotted border-transparent bg-transparent py-0.5 pr-4 font-medium text-penn-blue transition-colors duration-150 hover:border-penn-blue/60 focus:border-penn-blue ' +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23011F5B' fill-opacity='0.35'/%3E%3C/svg%3E\")] bg-right bg-no-repeat"

/**
 * Inline ghost dropdowns in the masthead byline — change either degree (or
 * its concentration) independently. Reads as typeset text until hovered.
 */
export function MajorSelects({ config, onChange }: MajorSelectsProps) {
  const sasConcs = Object.entries(MAJORS[config.sasMajorKey]?.concentrations ?? {})
  const seasConcs = Object.entries(MAJORS[config.seasMajorKey]?.concentrations ?? {})

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.875rem] text-ink-soft">
      <select
        aria-label="BA major"
        className={ghostSelect}
        value={config.sasMajorKey}
        onChange={(e) =>
          onChange({
            ...config,
            sasMajorKey: e.target.value,
            sasConcKey: defaultConcKey(e.target.value),
          })
        }
      >
        {Object.keys(SAS_MAJORS).map((k) => (
          <option key={k} value={k}>
            {MAJORS[k]?.fullName ?? k}
          </option>
        ))}
      </select>
      <span className="smallcaps !text-[0.5625rem]">BA</span>
      {sasConcs.length > 1 && (
        <select
          aria-label="BA concentration"
          className={`${ghostSelect} !text-ink-soft`}
          value={config.sasConcKey ?? defaultConcKey(config.sasMajorKey) ?? ''}
          onChange={(e) => onChange({ ...config, sasConcKey: e.target.value })}
        >
          {sasConcs.map(([k, c]) => (
            <option key={k} value={k}>
              {c.label}
            </option>
          ))}
        </select>
      )}
      <span className="text-ink/40">+</span>
      <select
        aria-label="BSE major"
        className={ghostSelect}
        value={config.seasMajorKey}
        onChange={(e) =>
          onChange({
            ...config,
            seasMajorKey: e.target.value,
            seasConcKey: defaultConcKey(e.target.value),
          })
        }
      >
        {Object.keys(SEAS_MAJORS).map((k) => (
          <option key={k} value={k}>
            {MAJORS[k]?.fullName ?? k}
          </option>
        ))}
      </select>
      <span className="smallcaps !text-[0.5625rem]">BSE</span>
      {seasConcs.length > 1 && (
        <select
          aria-label="BSE concentration"
          className={`${ghostSelect} !text-ink-soft`}
          value={config.seasConcKey ?? defaultConcKey(config.seasMajorKey) ?? ''}
          onChange={(e) => onChange({ ...config, seasConcKey: e.target.value })}
        >
          {seasConcs.map(([k, c]) => (
            <option key={k} value={k}>
              {c.label}
            </option>
          ))}
        </select>
      )}
      <span className="text-ink/40">· Class of {config.gradYear}</span>
    </span>
  )
}
