import { useMemo, useState } from 'react'
import { MAJORS, SAS_MAJORS, SEAS_MAJORS } from '../../data/majors'
import { AP_CREDITS, AP_CREDIT_GROUPS, resolveAPCredit } from '../../data/ap-credits'
import { defaultCurriculumMode, type CurriculumMode, type PlanConfig } from '../store/use-plan-store'
import { IconChevronRight } from './icons'

export interface PlanSetupProps {
  onDone: (config: PlanConfig) => void
  /** Prefill from the current config when re-entering setup. */
  initial?: PlanConfig | null
  /** Present when setup was opened from an existing plan — shows a way back. */
  onCancel?: () => void
}

const GRAD_YEARS = [2027, 2028, 2029, 2030]

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-ink py-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
      <div>
        <h2 className="font-cond text-[0.9375rem] leading-none font-semibold tracking-[0.04em] text-ink uppercase">
          {title}
        </h2>
        {hint && <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-2">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/**
 * Setup is one sheet, not a wizard: class, majors, curriculum, and incoming
 * credit are all visible with sensible defaults filled in, so a new student
 * can read the whole ask and build in one click.
 */
export function PlanSetup({ onDone, initial, onCancel }: PlanSetupProps) {
  const [gradYear, setGradYear] = useState<number>(initial?.gradYear ?? 2028)
  const [sasMajorKey, setSasMajorKey] = useState(initial?.sasMajorKey ?? 'CHEM')
  const [seasMajorKey, setSeasMajorKey] = useState(initial?.seasMajorKey ?? 'CBE')
  const [sasConcKey, setSasConcKey] = useState<string | null>(initial?.sasConcKey ?? null)
  const [seasConcKey, setSeasConcKey] = useState<string | null>(initial?.seasConcKey ?? null)
  const [apCreditIds, setApCreditIds] = useState<string[]>(initial?.apCreditIds ?? ['ap-calc-bc'])
  // Curriculum follows the graduating class unless the student overrides it.
  const [curriculumOverride, setCurriculumOverride] = useState<CurriculumMode | null>(
    initial?.curriculumMode ?? null,
  )
  const curriculumMode: CurriculumMode = curriculumOverride ?? defaultCurriculumMode(gradYear)

  const sasConcs = useMemo(() => Object.entries(MAJORS[sasMajorKey]?.concentrations ?? {}), [sasMajorKey])
  const seasConcs = useMemo(() => Object.entries(MAJORS[seasMajorKey]?.concentrations ?? {}), [seasMajorKey])

  function defaultConc(entries: [string, { default?: boolean }][]): string | null {
    const def = entries.find(([, c]) => c.default)
    return def?.[0] ?? entries[0]?.[0] ?? null
  }

  const sasName = MAJORS[sasMajorKey]?.fullName ?? sasMajorKey
  const seasName = MAJORS[seasMajorKey]?.fullName ?? seasMajorKey

  return (
    <div className="mx-auto w-full max-w-3xl pt-8 pb-16">
      <div className="mb-6">
        <h1 className="font-cond text-[2rem] leading-none font-bold tracking-[0.02em] text-ink uppercase sm:text-[2.5rem]">
          {initial ? 'Edit setup' : 'Build your starting plan'}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-2">
          Four answers seed a valid eight-semester plan for your dual degree. Everything below is
          filled in with the usual choices; change what differs for you, then build. The plan is
          yours to edit from then on.
        </p>
      </div>

      <Section title="Graduating class" hint="Sets the calendar and which College curriculum you are audited under.">
        <div className="seg w-full" role="radiogroup" aria-label="Graduating class">
          {GRAD_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              role="radio"
              aria-checked={y === gradYear}
              aria-pressed={y === gradYear}
              onClick={() => setGradYear(y)}
              className="flex flex-1 flex-col items-center gap-1 !py-3"
            >
              <span className="font-mono text-[1.125rem] font-semibold !tracking-normal">{y}</span>
              <span className="!text-[0.625rem] opacity-70">VIPER '{String(y).slice(2)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Majors" hint="One College major and one Engineering major. Concentrations where the major has them.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label mb-1.5 block !text-penn-blue" htmlFor="sas-major">
              BA · College of Arts &amp; Sciences
            </label>
            <select
              id="sas-major"
              className="field w-full"
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
                className="field mt-2 w-full"
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
            <label className="label mb-1.5 block" htmlFor="seas-major">
              BSE · School of Engineering
            </label>
            <select
              id="seas-major"
              className="field w-full"
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
                className="field mt-2 w-full"
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
        </div>
      </Section>

      <Section
        title="College curriculum"
        hint={
          defaultCurriculumMode(gradYear) === 'ncc'
            ? `The Class of ${gradYear} is audited under the New College Curriculum. Change this only if your advisor told you otherwise.`
            : `The Class of ${gradYear} is audited under the old core curriculum. Change this only if your advisor told you otherwise.`
        }
      >
        <div className="seg" role="radiogroup" aria-label="College curriculum">
          {(
            [
              ['ncc', 'New College Curriculum'],
              ['legacy', 'Old core · Sectors & FA'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={curriculumMode === mode}
              aria-pressed={curriculumMode === mode}
              onClick={() => setCurriculumOverride(mode)}
              className="!py-2.5"
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Incoming credit"
        hint="Exams and placements Penn Admissions counts. Credit-bearing ones remove the matching course from the seed."
      >
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {AP_CREDIT_GROUPS.map((group) => {
            const entries = AP_CREDITS.filter((ap) => group.kinds.includes(ap.kind))
            if (entries.length === 0) return null
            return (
              <fieldset key={group.label} className="min-w-0">
                <legend className="label mb-1 flex items-baseline gap-2 !text-[0.625rem] !text-ink-3">
                  {group.label}
                  {group.hint && <span className="!normal-case !tracking-normal !text-ink-3">{group.hint}</span>}
                </legend>
                <div className="border-t border-rule">
                  {entries.map((ap) => {
                    const resolved = resolveAPCredit(ap, gradYear)
                    const on = apCreditIds.includes(ap.id)
                    return (
                      <label
                        key={ap.id}
                        title={resolved.note}
                        className="flex cursor-pointer items-center gap-2.5 border-b border-rule px-1 py-1.5 text-[0.8125rem] transition-colors duration-100 hover:bg-tint-blue"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          className="box"
                          onChange={() =>
                            setApCreditIds((ids) => (on ? ids.filter((i) => i !== ap.id) : [...ids, ap.id]))
                          }
                        />
                        <span className={['flex-1', on ? 'text-ink' : 'text-ink-2'].join(' ')}>{resolved.label}</span>
                        {!resolved.credit && <span className="label !text-[0.625rem] !text-ink-3">no CU</span>}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-5">
        <p className="text-[0.8125rem] text-ink-2">
          <span className="font-medium text-ink">{sasName}</span> BA + <span className="font-medium text-ink">{seasName}</span>{' '}
          BSE · Class of {gradYear} · {curriculumMode === 'ncc' ? 'New College Curriculum' : 'Old core'}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-quiet">
              Cancel
            </button>
          )}
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
                ...(curriculumOverride ? { curriculumMode: curriculumOverride } : {}),
              })
            }
            className="btn btn-primary !px-5 !py-3"
          >
            {initial ? 'Rebuild starting plan' : 'Build my starting plan'}
            <IconChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
