import { useMemo, useState } from 'react'
import { MAJORS, SAS_MAJORS, SEAS_MAJORS } from '../../data/majors'
import { AP_CREDITS, resolveAPCredit } from '../../data/ap-credits'
import type { PlanConfig } from '../store/use-plan-store'

export interface PlanSetupProps {
  onDone: (config: PlanConfig) => void
}

const GRAD_YEARS = [2027, 2028, 2029, 2030]

/**
 * Onboarding: "Class of?" → "Majors?" → done. Two screens, no wizard.
 * The scheduler seeds the starting plan the moment majors are picked.
 */
export function PlanSetup({ onDone }: PlanSetupProps) {
  const [step, setStep] = useState<'year' | 'majors'>('year')
  const [gradYear, setGradYear] = useState<number>(2028)
  const [sasMajorKey, setSasMajorKey] = useState('CHEM')
  const [seasMajorKey, setSeasMajorKey] = useState('CBE')
  const [sasConcKey, setSasConcKey] = useState<string | null>(null)
  const [seasConcKey, setSeasConcKey] = useState<string | null>(null)
  const [apCreditIds, setApCreditIds] = useState<string[]>(['ap-calc-bc'])

  const sasConcs = useMemo(() => Object.entries(MAJORS[sasMajorKey]?.concentrations ?? {}), [sasMajorKey])
  const seasConcs = useMemo(() => Object.entries(MAJORS[seasMajorKey]?.concentrations ?? {}), [seasMajorKey])

  function defaultConc(entries: [string, { default?: boolean }][]): string | null {
    const def = entries.find(([, c]) => c.default)
    return def?.[0] ?? entries[0]?.[0] ?? null
  }

  const selectCls =
    'w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm'

  if (step === 'year') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 text-center">
        <h2 className="font-display text-3xl font-semibold">Class of?</h2>
        <div className="flex gap-3">
          {GRAD_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setGradYear(y)
                setStep('majors')
              }}
              className={[
                'rounded-xl border px-6 py-4 font-mono text-lg transition-colors duration-150',
                y === gradYear
                  ? 'border-penn-blue bg-penn-blue text-white'
                  : 'border-hairline bg-white hover:border-penn-blue',
              ].join(' ')}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h2 className="mb-6 text-center font-display text-3xl font-semibold">Your majors</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">College (BA)</label>
          <select
            className={selectCls}
            value={sasMajorKey}
            onChange={(e) => {
              setSasMajorKey(e.target.value)
              setSasConcKey(null)
            }}
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
              className={`${selectCls} mt-2`}
              value={sasConcKey ?? defaultConc(sasConcs) ?? ''}
              onChange={(e) => setSasConcKey(e.target.value)}
            >
              {sasConcs.map(([k, c]) => (
                <option key={k} value={k}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Engineering (BSE)</label>
          <select
            className={selectCls}
            value={seasMajorKey}
            onChange={(e) => {
              setSeasMajorKey(e.target.value)
              setSeasConcKey(null)
            }}
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
              className={`${selectCls} mt-2`}
              value={seasConcKey ?? defaultConc(seasConcs) ?? ''}
              onChange={(e) => setSeasConcKey(e.target.value)}
            >
              {seasConcs.map(([k, c]) => (
                <option key={k} value={k}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <fieldset>
          <legend className="mb-1 text-xs font-medium text-ink/60">Incoming credit</legend>
          <div className="flex flex-col gap-1 rounded-md border border-hairline bg-white p-3">
            {AP_CREDITS.map((ap) => {
              const resolved = resolveAPCredit(ap, gradYear)
              const on = apCreditIds.includes(ap.id)
              return (
                <label key={ap.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    className="accent-penn-blue"
                    onChange={() =>
                      setApCreditIds((ids) =>
                        on ? ids.filter((i) => i !== ap.id) : [...ids, ap.id],
                      )
                    }
                  />
                  <span className="flex-1">{resolved.label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() =>
            onDone({
              sasMajorKey,
              sasConcKey: sasConcKey ?? defaultConc(sasConcs),
              seasMajorKey,
              seasConcKey: seasConcKey ?? defaultConc(seasConcs),
              apCreditIds,
              gradYear,
            })
          }
          className="mt-2 rounded-lg bg-penn-blue py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.01]"
        >
          Build my starting plan
        </button>
        <button
          type="button"
          onClick={() => setStep('year')}
          className="text-xs text-ink/50 hover:text-ink"
        >
          ← Class of {gradYear}
        </button>
      </div>
    </div>
  )
}
