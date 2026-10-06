import { MAJORS, SAS_MAJORS, SEAS_MAJORS } from '../../data/majors'
import type { PlanConfig } from '../store/use-plan-store'

export interface DegreeSelectProps {
  config: PlanConfig
  degree: 'sas' | 'seas'
  /** Re-seeds the plan; caller confirms with the user first. */
  onChange: (next: PlanConfig) => void
}

function defaultConcKey(majorKey: string): string | null {
  const concs = Object.entries(MAJORS[majorKey]?.concentrations ?? {})
  const def = concs.find(([, c]) => c.default)
  return def?.[0] ?? concs[0]?.[0] ?? null
}

/**
 * Lettering with a native select laid invisibly over it: the words are set
 * in the sheet's type and wrap like any text, while the select still opens
 * on click and keyboard. A dotted underline shows it can be changed.
 */
function GhostSelect({
  label,
  text,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string
  text: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <span
      className={[
        'relative inline border-b border-dotted border-rule-2 transition-colors duration-100 hover:border-ink focus-within:border-penn-blue',
        className,
      ].join(' ')}
    >
      {text}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map(([k, name]) => (
          <option key={k} value={k}>
            {name}
          </option>
        ))}
      </select>
    </span>
  )
}

/**
 * One degree — the major, then its concentration when it has more than
 * one — each changeable in place. Full names, never cropped: the title
 * block gives them room and lets them wrap.
 */
export function DegreeSelect({ config, degree, onChange }: DegreeSelectProps) {
  const sas = degree === 'sas'
  const majorKey = sas ? config.sasMajorKey : config.seasMajorKey
  const majors = Object.keys(sas ? SAS_MAJORS : SEAS_MAJORS)
  const concs = Object.entries(MAJORS[majorKey]?.concentrations ?? {})
  const concKey = (sas ? config.sasConcKey : config.seasConcKey) ?? defaultConcKey(majorKey) ?? ''
  const concLabel = MAJORS[majorKey]?.concentrations?.[concKey]?.label
  const tag = sas ? 'BA' : 'BSE'

  return (
    <span>
      <GhostSelect
        label={`${tag} major`}
        text={MAJORS[majorKey]?.fullName ?? majorKey}
        value={majorKey}
        options={majors.map((k) => [k, MAJORS[k]?.fullName ?? k])}
        onChange={(k) =>
          onChange(
            sas
              ? { ...config, sasMajorKey: k, sasConcKey: defaultConcKey(k) }
              : { ...config, seasMajorKey: k, seasConcKey: defaultConcKey(k) },
          )
        }
        className="font-medium text-ink"
      />
      {concs.length > 1 && concLabel && (
        <>
          <span className="mx-1.5 text-ink-3" aria-hidden>
            ·
          </span>
          <GhostSelect
            label={`${tag} concentration`}
            text={concLabel}
            value={concKey}
            options={concs.map(([k, c]) => [k, c.label])}
            onChange={(k) => onChange(sas ? { ...config, sasConcKey: k } : { ...config, seasConcKey: k })}
            className="text-ink-2"
          />
        </>
      )}
    </span>
  )
}
