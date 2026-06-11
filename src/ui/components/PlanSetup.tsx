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
 * This is the first thing a student ever sees — it should feel like
 * opening a beautifully printed program booklet.
 */
export function PlanSetup({ onDone }: PlanSetupProps) {
  const [step, setStep] = useState<'year' | 'majors'>('year')
  const [gradYear, setGradYear] = useState<number>(2028)
  const [sasMajorKey, setSasMajorKey] = useState('CHEM')
  const [seasMajorKey, setSeasMajorKey] = useState('CBE')
  const [sasConcKey, setSasConcKey] = useState<string | null>(null)
  const [seasConcKey, setSeasConcKey] = useState<string | null>(null)
  const [apCreditIds, setApCreditIds] = useState<string[]>(['ap-calc-bc'])

  const sasConcs = useMemo(
    () => Object.entries(MAJORS[sasMajorKey]?.concentrations ?? {}),
    [sasMajorKey],
  )
  const seasConcs = useMemo(
    () => Object.entries(MAJORS[seasMajorKey]?.concentrations ?? {}),
    [seasMajorKey],
  )

  function defaultConc(entries: [string, { default?: boolean }][]): string | null {
    const def = entries.find(([, c]) => c.default)
    return def?.[0] ?? entries[0]?.[0] ?? null
  }

  const selectCls =
    'w-full rounded-sm border border-hairline bg-paper px-3 py-2.5 text-sm shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-rule focus:border-penn-blue'

  if (step === 'year') {
    return (
      <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center text-center">
        <p className="smallcaps rise" style={{ '--i': 0 } as React.CSSProperties}>
          Let's begin with the year you'll graduate
        </p>
        <h2
          className="rise mt-3 font-display text-[56px] leading-none font-semibold tracking-tight text-ink"
          style={{ '--i': 1 } as React.CSSProperties}
        >
          Class of<span className="text-penn-red">?</span>
        </h2>
        <div
          className="rise mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          {GRAD_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setGradYear(y)
                setStep('majors')
              }}
              className={[
                'group rounded-md border bg-paper px-7 py-5 shadow-[var(--shadow-card)]',
                'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-penn-blue hover:shadow-[var(--shadow-card-hover)]',
                y === gradYear ? 'border-rule' : 'border-hairline',
              ].join(' ')}
            >
              <span className="tnum font-display text-[26px] font-semibold text-penn-blue transition-colors group-hover:text-penn-blue">
                {y}
              </span>
              <span className="smallcaps mt-1 block !text-[8px] text-ink/35">
                VIPER '{String(y).slice(2)}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <p className="smallcaps rise text-center" style={{ '--i': 0 } as React.CSSProperties}>
        Class of {gradYear} · dual degree
      </p>
      <h2
        className="rise mt-2 mb-8 text-center font-display text-[40px] leading-tight font-semibold text-ink"
        style={{ '--i': 1 } as React.CSSProperties}
      >
        Your majors
      </h2>
      <div className="rise flex flex-col gap-5" style={{ '--i': 2 } as React.CSSProperties}>
        <div>
          <label className="smallcaps mb-1.5 block">College of Arts &amp; Sciences · BA</label>
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
          <label className="smallcaps mb-1.5 block">School of Engineering · BSE</label>
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
          <legend className="smallcaps mb-1.5">Incoming credit</legend>
          <div className="flex flex-col gap-1 rounded-sm border border-hairline bg-paper p-3.5 shadow-[var(--shadow-card)]">
            {AP_CREDITS.map((ap) => {
              const resolved = resolveAPCredit(ap, gradYear)
              const on = apCreditIds.includes(ap.id)
              return (
                <label
                  key={ap.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-0.5 text-[13px] hover:bg-[#fbf8f0]"
                >
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
          className="mt-2 rounded-sm bg-penn-blue py-3 text-[13px] font-semibold tracking-[0.08em] text-white uppercase shadow-[var(--shadow-card)] transition-all duration-200 hover:bg-penn-blue-soft hover:shadow-[var(--shadow-card-hover)]"
        >
          Build my starting plan
        </button>
        <button
          type="button"
          onClick={() => setStep('year')}
          className="text-center text-xs text-ink/45 hover:text-ink"
        >
          ← Class of {gradYear}
        </button>
      </div>
    </div>
  )
}
