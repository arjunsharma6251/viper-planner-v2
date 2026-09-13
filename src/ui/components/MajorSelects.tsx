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

// A title-block field: reads as lettering until engaged, then shows its
// underline. field-sizing-content keeps it as wide as the chosen option.
const ghost =
  'field-sizing-content max-w-full cursor-pointer appearance-none border-b border-dotted border-transparent bg-transparent py-0.5 pr-4 text-[0.8125rem] font-medium text-ink transition-colors duration-100 hover:border-ink focus:border-penn-blue focus:outline-none ' +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%236e6e68'/%3E%3C/svg%3E\")] bg-right bg-no-repeat"

/**
 * The student's degrees as title-block fields: change either major (or its
 * concentration) in place. Each degree is a non-breaking unit.
 */
export function MajorSelects({ config, onChange }: MajorSelectsProps) {
  const sasConcs = Object.entries(MAJORS[config.sasMajorKey]?.concentrations ?? {})
  const seasConcs = Object.entries(MAJORS[config.seasMajorKey]?.concentrations ?? {})

  return (
    <span className="inline-flex flex-nowrap items-baseline gap-x-3 whitespace-nowrap">
      <span className="inline-flex items-baseline gap-x-1.5 whitespace-nowrap">
        <span className="label !text-[0.625rem] !text-penn-blue">BA</span>
        <select
          aria-label="BA major"
          title={MAJORS[config.sasMajorKey]?.fullName}
          className={ghost}
          value={config.sasMajorKey}
          onChange={(e) =>
            onChange({ ...config, sasMajorKey: e.target.value, sasConcKey: defaultConcKey(e.target.value) })
          }
        >
          {Object.keys(SAS_MAJORS).map((k) => (
            <option key={k} value={k}>
              {MAJORS[k]?.fullName ?? k}
            </option>
          ))}
        </select>
        {sasConcs.length > 1 && (
          <select
            aria-label="BA concentration"
            className={`${ghost} hidden !font-normal !text-ink-2 2xl:inline-block`}
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
      </span>
      <span className="inline-flex items-baseline gap-x-1.5 whitespace-nowrap">
        <span className="label !text-[0.625rem]">BSE</span>
        <select
          aria-label="BSE major"
          title={MAJORS[config.seasMajorKey]?.fullName}
          className={ghost}
          value={config.seasMajorKey}
          onChange={(e) =>
            onChange({ ...config, seasMajorKey: e.target.value, seasConcKey: defaultConcKey(e.target.value) })
          }
        >
          {Object.keys(SEAS_MAJORS).map((k) => (
            <option key={k} value={k}>
              {MAJORS[k]?.fullName ?? k}
            </option>
          ))}
        </select>
        {seasConcs.length > 1 && (
          <select
            aria-label="BSE concentration"
            className={`${ghost} hidden !font-normal !text-ink-2 2xl:inline-block`}
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
      </span>
    </span>
  )
}
