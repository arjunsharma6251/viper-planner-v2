import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MAJORS, SAS_MAJORS, SEAS_MAJORS } from '../../data/majors'
import { AP_CREDITS, AP_CREDIT_GROUPS, resolveAPCredit } from '../../data/ap-credits'
import { defaultCurriculumMode, type CurriculumMode, type PlanConfig } from '../store/use-plan-store'
import { IconCheck, IconChevronLeft, IconChevronRight } from './icons'

export interface PlanSetupProps {
  onDone: (config: PlanConfig) => void
  /** Prefill from the current config when re-entering setup. */
  initial?: PlanConfig | null
  /** Present when setup was opened from an existing plan — shows a way back. */
  onCancel?: () => void
}

const GRAD_YEARS = [2027, 2028, 2029, 2030]

type Step = 'class' | 'sas' | 'seas' | 'credit' | 'review'
const STEPS: Step[] = ['class', 'sas', 'seas', 'credit', 'review']

function defaultConc(majorKey: string): string | null {
  const entries = Object.entries(MAJORS[majorKey]?.concentrations ?? {})
  const def = entries.find(([, c]) => c.default)
  return def?.[0] ?? entries[0]?.[0] ?? null
}

/** The question at the top of a step: one heading, one calm line under it. */
function Question({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-7">
      <h2 className="font-cond text-[1.75rem] leading-none font-bold tracking-[0.02em] text-ink uppercase sm:text-[2.125rem]">
        {title}
      </h2>
      <p className="mt-2.5 max-w-[48ch] text-[0.9375rem] leading-relaxed text-ink-2">{hint}</p>
    </div>
  )
}

/** A large selectable card. Selected cards invert to ink, like the seg control. */
function Choice({
  selected,
  onSelect,
  index,
  children,
  className = '',
}: {
  selected: boolean
  onSelect: () => void
  index: number
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      style={{ ['--i' as string]: index }}
      className={[
        'group/choice relative flex w-full items-center justify-between gap-3 border px-4 py-3.5 text-left transition-[background-color,border-color,color,transform] duration-150 ease-out',
        selected
          ? 'border-ink bg-ink text-sheet'
          : 'border-rule bg-panel text-ink hover:-translate-y-px hover:border-ink focus-visible:border-ink',
        className,
      ].join(' ')}
    >
      {children}
      <span
        className={['shrink-0 transition-opacity duration-150', selected ? 'opacity-100' : 'opacity-0 group-hover/choice:opacity-40'].join(' ')}
        aria-hidden
      >
        {selected ? <IconCheck size={14} /> : <IconChevronRight size={14} />}
      </span>
    </button>
  )
}

/**
 * Setup asks one question at a time. Five steps: class, College major,
 * Engineering major, incoming credit, review. Single-choice steps advance
 * on their own; every answer stays one click away in the trail on top,
 * and nothing is final until Build.
 */
export function PlanSetup({ onDone, initial, onCancel }: PlanSetupProps) {
  const [gradYear, setGradYear] = useState<number | null>(initial?.gradYear ?? null)
  const [sasMajorKey, setSasMajorKey] = useState<string | null>(initial?.sasMajorKey ?? null)
  const [seasMajorKey, setSeasMajorKey] = useState<string | null>(initial?.seasMajorKey ?? null)
  const [sasConcKey, setSasConcKey] = useState<string | null>(initial?.sasConcKey ?? null)
  const [seasConcKey, setSeasConcKey] = useState<string | null>(initial?.seasConcKey ?? null)
  const [apCreditIds, setApCreditIds] = useState<string[]>(initial?.apCreditIds ?? [])
  const [curriculumOverride, setCurriculumOverride] = useState<CurriculumMode | null>(initial?.curriculumMode ?? null)

  // Editing an existing plan starts at the review, where every step is a
  // click away; a first-time student starts at the first question.
  const [step, setStep] = useState<Step>(initial ? 'review' : 'class')
  const [dir, setDir] = useState<'forward' | 'back'>('forward')
  const [pending, setPending] = useState(false)

  const stepIndex = STEPS.indexOf(step)
  const curriculumMode: CurriculumMode = curriculumOverride ?? defaultCurriculumMode(gradYear ?? 2028)

  const sasConcs = useMemo(() => Object.entries(MAJORS[sasMajorKey ?? '']?.concentrations ?? {}), [sasMajorKey])
  const seasConcs = useMemo(() => Object.entries(MAJORS[seasMajorKey ?? '']?.concentrations ?? {}), [seasMajorKey])

  function go(next: Step) {
    setDir(STEPS.indexOf(next) > stepIndex ? 'forward' : 'back')
    setPending(false)
    setStep(next)
  }
  /** Mark the choice, let it register, then move on. */
  function advanceAfter(next: Step) {
    setPending(true)
    window.setTimeout(() => go(next), 260)
  }

  const canContinue: Record<Step, boolean> = {
    class: gradYear !== null,
    sas: sasMajorKey !== null,
    seas: seasMajorKey !== null,
    credit: true,
    review: gradYear !== null && sasMajorKey !== null && seasMajorKey !== null,
  }
  const nextStep = STEPS[stepIndex + 1]

  function build() {
    if (!gradYear || !sasMajorKey || !seasMajorKey) return
    onDone({
      sasMajorKey,
      sasConcKey: sasConcKey ?? defaultConc(sasMajorKey),
      seasMajorKey,
      seasConcKey: seasConcKey ?? defaultConc(seasMajorKey),
      apCreditIds,
      gradYear,
      ...(curriculumOverride ? { curriculumMode: curriculumOverride } : {}),
    })
  }

  // Enter continues when the step has an answer; nothing else is captured.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'INPUT')) return
      if (!canContinue[step]) return
      e.preventDefault()
      if (step === 'review') build()
      else if (nextStep) go(nextStep)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const sasName = sasMajorKey ? (MAJORS[sasMajorKey]?.fullName ?? sasMajorKey) : null
  const seasName = seasMajorKey ? (MAJORS[seasMajorKey]?.fullName ?? seasMajorKey) : null

  const trail: Array<{ step: Step; label: string; value: string | null }> = [
    { step: 'class', label: 'Class', value: gradYear ? `Class of ${gradYear}` : null },
    { step: 'sas', label: 'BA', value: sasName },
    { step: 'seas', label: 'BSE', value: seasName },
    {
      step: 'credit',
      label: 'Credit',
      value: stepIndex > STEPS.indexOf('credit') ? (apCreditIds.length ? `${apCreditIds.length} incoming` : 'None') : null,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col pt-6 pb-16 sm:pt-10">
      {/* ── Progress ── */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between">
          <h1 className="label !text-ink">{initial ? 'Edit setup' : 'Build your starting plan'}</h1>
          <span className="tag text-ink-3">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>
        <ol className="mt-2.5 flex gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="h-[3px] flex-1 overflow-hidden bg-rule">
              <span
                className="block h-full origin-left bg-penn-blue transition-transform duration-[420ms] ease-[var(--ease-out-expo)]"
                style={{ transform: `scaleX(${i <= stepIndex ? 1 : 0})` }}
              />
            </li>
          ))}
        </ol>
        {trail.some((t) => t.value) && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Your answers">
            {trail.map((t) =>
              t.value ? (
                <button
                  key={t.step}
                  type="button"
                  onClick={() => go(t.step)}
                  aria-current={t.step === step ? 'step' : undefined}
                  className={[
                    'fade inline-flex items-center gap-1.5 border px-2 py-1 text-[0.75rem] transition-colors duration-100',
                    t.step === step ? 'border-ink text-ink' : 'border-rule text-ink-2 hover:border-ink hover:text-ink',
                  ].join(' ')}
                >
                  <span className="label !text-[0.5625rem] !text-ink-3">{t.label}</span>
                  {t.value}
                </button>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* ── The question ── */}
      <div key={step} className={dir === 'forward' ? 'rise' : 'sink'}>
        {step === 'class' && (
          <>
            <Question title="Which class are you?" hint="Your graduating year sets the calendar for the four years ahead." />
            <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Graduating class">
              {GRAD_YEARS.map((y, i) => (
                <Choice
                  key={y}
                  index={i}
                  selected={y === gradYear}
                  onSelect={() => {
                    setGradYear(y)
                    if (!pending) advanceAfter('sas')
                  }}
                  className="!justify-center !px-2 !py-5"
                >
                  <span className="font-mono text-[1.375rem] font-semibold">{y}</span>
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === 'sas' && (
          <>
            <Question title="Your College major" hint="The BA half of your dual degree. Pick one; concentrations come next if the major has them." />
            <div className="stagger flex flex-col gap-2.5" role="radiogroup" aria-label="BA major">
              {Object.keys(SAS_MAJORS).map((k, i) => (
                <Choice
                  key={k}
                  index={i}
                  selected={k === sasMajorKey}
                  onSelect={() => {
                    const changed = k !== sasMajorKey
                    setSasMajorKey(k)
                    if (changed) setSasConcKey(null)
                    const concs = Object.keys(MAJORS[k]?.concentrations ?? {})
                    if (concs.length <= 1 && !pending) advanceAfter('seas')
                  }}
                >
                  <span className="flex items-baseline gap-3">
                    <span className="tag w-12 opacity-70">{k}</span>
                    <span className="text-[0.9375rem] font-medium">{MAJORS[k]?.fullName ?? k}</span>
                  </span>
                </Choice>
              ))}
            </div>
            {sasMajorKey && sasConcs.length > 1 && (
              <div className="rise mt-6 border-t border-rule pt-5">
                <p className="label mb-2.5">Concentration</p>
                <div className="stagger flex flex-col gap-2" role="radiogroup" aria-label="BA concentration">
                  {sasConcs.map(([k, c], i) => (
                    <Choice
                      key={k}
                      index={i}
                      selected={(sasConcKey ?? defaultConc(sasMajorKey)) === k}
                      onSelect={() => setSasConcKey(k)}
                      className="!py-2.5"
                    >
                      <span className="text-[0.875rem]">{c.label}</span>
                    </Choice>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 'seas' && (
          <>
            <Question title="Your Engineering major" hint="The BSE half. Same idea: pick one, then a concentration if there is one." />
            <div className="stagger flex flex-col gap-2.5" role="radiogroup" aria-label="BSE major">
              {Object.keys(SEAS_MAJORS).map((k, i) => (
                <Choice
                  key={k}
                  index={i}
                  selected={k === seasMajorKey}
                  onSelect={() => {
                    const changed = k !== seasMajorKey
                    setSeasMajorKey(k)
                    if (changed) setSeasConcKey(null)
                    const concs = Object.keys(MAJORS[k]?.concentrations ?? {})
                    if (concs.length <= 1 && !pending) advanceAfter('credit')
                  }}
                >
                  <span className="flex items-baseline gap-3">
                    <span className="tag w-12 opacity-70">{k}</span>
                    <span className="text-[0.9375rem] font-medium">{MAJORS[k]?.fullName ?? k}</span>
                  </span>
                </Choice>
              ))}
            </div>
            {seasMajorKey && seasConcs.length > 1 && (
              <div className="rise mt-6 border-t border-rule pt-5">
                <p className="label mb-2.5">Concentration</p>
                <div className="stagger flex flex-col gap-2" role="radiogroup" aria-label="BSE concentration">
                  {seasConcs.map(([k, c], i) => (
                    <Choice
                      key={k}
                      index={i}
                      selected={(seasConcKey ?? defaultConc(seasMajorKey)) === k}
                      onSelect={() => setSeasConcKey(k)}
                      className="!py-2.5"
                    >
                      <span className="text-[0.875rem]">{c.label}</span>
                    </Choice>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 'credit' && (
          <>
            <Question title="Any credit coming in?" hint="Tick what applies. Not sure? Skip it — you can add credit later from Edit setup." />
            <div className="stagger grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {AP_CREDIT_GROUPS.map((group, gi) => {
                const entries = AP_CREDITS.filter((ap) => group.kinds.includes(ap.kind))
                if (entries.length === 0) return null
                return (
                  <fieldset key={group.label} className="min-w-0" style={{ ['--i' as string]: gi }}>
                    <legend className="label mb-1 !text-[0.625rem] !text-ink-3">{group.label}</legend>
                    <div className="border-t border-rule">
                      {entries.map((ap) => {
                        const resolved = resolveAPCredit(ap, gradYear)
                        const on = apCreditIds.includes(ap.id)
                        return (
                          <label
                            key={ap.id}
                            title={resolved.note}
                            className="flex cursor-pointer items-center gap-2.5 border-b border-rule px-1 py-2 text-[0.8125rem] transition-colors duration-100 hover:bg-tint-blue"
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
                    {group.kinds.includes('waiver') && (
                      <p className="mt-2 text-[0.6875rem] leading-snug text-ink-3">
                        Language not waived? Plan its 0–2 CU in the planner: Add course → Language Foundation.
                      </p>
                    )}
                  </fieldset>
                )
              })}
            </div>
          </>
        )}

        {step === 'review' && gradYear && sasMajorKey && seasMajorKey && (
          <>
            <Question
              title="Ready to build"
              hint="Your starting plan is seeded from these four answers. Everything in it is yours to move, swap, or remove afterwards."
            />
            <dl className="stagger flex flex-col">
              {(
                [
                  ['class', 'Class of', String(gradYear)],
                  ['sas', 'BA · College', `${sasName}${sasConcs.length > 1 ? ` · ${MAJORS[sasMajorKey]?.concentrations?.[sasConcKey ?? defaultConc(sasMajorKey) ?? '']?.label ?? ''}` : ''}`],
                  ['seas', 'BSE · Engineering', `${seasName}${seasConcs.length > 1 ? ` · ${MAJORS[seasMajorKey]?.concentrations?.[seasConcKey ?? defaultConc(seasMajorKey) ?? '']?.label ?? ''}` : ''}`],
                  [
                    'credit',
                    'Incoming credit',
                    apCreditIds.length
                      ? apCreditIds.map((id) => AP_CREDITS.find((a) => a.id === id)?.label ?? id).join(' · ')
                      : 'None',
                  ],
                ] as Array<[Step, string, string]>
              ).map(([s, label, value], i) => (
                <div
                  key={s}
                  style={{ ['--i' as string]: i }}
                  className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-rule py-3 first:border-t"
                >
                  <dt className="label !text-[0.625rem] !text-ink-3">{label}</dt>
                  <dd className="text-[0.9375rem] leading-snug text-ink">{value}</dd>
                  <button type="button" onClick={() => go(s)} className="btn btn-quiet !py-1 !text-[0.75rem]">
                    Change
                  </button>
                </div>
              ))}
              <div style={{ ['--i' as string]: 4 }} className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-rule py-3">
                <dt className="label !text-[0.625rem] !text-ink-3">Audited under</dt>
                <dd className="text-[0.9375rem] leading-snug text-ink">
                  {curriculumMode === 'ncc' ? 'New College Curriculum' : 'Old core · Sectors & FA'}
                  {!curriculumOverride && <span className="ml-2 text-[0.75rem] text-ink-3">default for the Class of {gradYear}</span>}
                </dd>
                <button
                  type="button"
                  onClick={() => setCurriculumOverride(curriculumMode === 'ncc' ? 'legacy' : 'ncc')}
                  className="btn btn-quiet !py-1 !text-[0.75rem]"
                >
                  Switch
                </button>
              </div>
            </dl>
          </>
        )}
      </div>

      {/* ── Footer controls ── */}
      <div className="mt-9 flex items-center justify-between gap-3 border-t border-rule pt-4">
        <div className="flex items-center gap-2">
          {stepIndex > 0 ? (
            <button type="button" onClick={() => go(STEPS[stepIndex - 1]!)} className="btn btn-quiet">
              <IconChevronLeft size={12} />
              Back
            </button>
          ) : onCancel ? (
            <button type="button" onClick={onCancel} className="btn btn-quiet">
              Cancel
            </button>
          ) : null}
          {onCancel && stepIndex > 0 && (
            <button type="button" onClick={onCancel} className="btn btn-quiet !text-ink-3">
              Cancel
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {step !== 'review' && canContinue[step] && (
            <span className="kbd hidden sm:inline" aria-hidden>
              Enter
            </span>
          )}
          {step === 'credit' && apCreditIds.length === 0 && (
            <button type="button" onClick={() => go('review')} className="btn btn-quiet">
              Skip
            </button>
          )}
          {step === 'review' ? (
            <button type="button" onClick={build} disabled={!canContinue.review} className="btn btn-primary !px-5 !py-3">
              {initial ? 'Rebuild starting plan' : 'Build my starting plan'}
              <IconChevronRight size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => nextStep && go(nextStep)}
              disabled={!canContinue[step]}
              className="btn btn-primary"
            >
              Continue
              <IconChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
