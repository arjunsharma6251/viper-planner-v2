import { useEffect, useMemo, useRef, useState } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { usePlanStore } from '../store/use-plan-store'
import { PlanSetup } from '../components/PlanSetup'
import { ScheduleGrid } from '../components/ScheduleGrid'
import { FocusView } from '../components/FocusView'
import { RequirementTracker } from '../components/RequirementTracker'
import { ReferencePanels } from '../components/ReferencePanels'
import { ShareLinkButton } from '../components/ShareLinkButton'
import { ExportMenu } from '../components/ExportMenu'
import { CourseDetailModal } from '../components/CourseDetailModal'
import { AddCourseModal } from '../components/AddCourseModal'
import { ToastProvider } from '../components/Toasts'
import { useToast } from '../components/use-toast'
import { MajorSelects } from '../components/MajorSelects'
import { ChatPanel } from '../../llm/chat'
import { isAdminMode } from '../../utils/mode'
import { computeNccAudit } from '../../plan/ncc-audit'
import { computeAdvisorNotes } from '../../plan/advisor-notes'
import { AdvisorNotes } from '../components/AdvisorNotes'
import { curriculumModeOf } from '../store/use-plan-store'
import { TraceContext, type Bus } from '../trace'
import { IconAlert, IconChat, IconClose, IconUndo } from '../components/icons'

interface OpenCourseRef {
  courseId: string
  semKey: SemesterKey
}

type RenderExtras = (store: ReturnType<typeof usePlanStore>) => React.ReactNode

const MOD_KEY =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'Cmd' : 'Ctrl'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** A title-block cell: a labeled field in the sheet's header. */
function Cell({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={['flex min-w-0 flex-col justify-center gap-1 overflow-hidden border-l border-rule px-3', className].join(' ')}>
      <span className="label !text-[0.625rem] whitespace-nowrap !text-ink-3">{label}</span>
      <div className="min-w-0 text-[0.8125rem] leading-none whitespace-nowrap text-ink">{children}</div>
    </div>
  )
}

function StudentAppInner({ renderExtras }: { renderExtras?: RenderExtras }) {
  const store = usePlanStore()
  const { toast } = useToast()
  const [openRef, setOpenRef] = useState<OpenCourseRef | null>(null)
  const [addTo, setAddTo] = useState<SemesterKey | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'focus'>('grid')
  const [focusSem, setFocusSem] = useState<SemesterKey>('fall-y1')
  const [editingSetup, setEditingSetup] = useState(false)
  const [lit, setLitState] = useState<ReadonlySet<Bus>>(() => new Set())
  const shareRef = useRef<HTMLButtonElement>(null)

  const trace = useMemo(
    () => ({
      lit,
      setLit: (buses: Bus[] | null) => setLitState(new Set(buses ?? [])),
    }),
    [lit],
  )

  const modalOpen = !!openRef || !!addTo

  // Keyboard: ⌘Z undo; single keys when nothing is typing and no modal is up.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && chatOpen && !modalOpen) {
        setChatOpen(false)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isTyping(e.target)) return
        e.preventDefault()
        if (store.undo()) toast('Undid last change')
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || modalOpen || !store.plan) return
      const k = e.key.toLowerCase()
      if (k === 'c') {
        e.preventDefault()
        setChatOpen((v) => !v)
      } else if (k === 's') {
        e.preventDefault()
        shareRef.current?.click()
      } else if (k === 'v') {
        e.preventDefault()
        setView((v) => (v === 'grid' ? 'focus' : 'grid'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, toast, chatOpen, modalOpen])

  const gradYear = store.config?.gradYear ?? null
  const curriculum = store.config ? curriculumModeOf(store.config) : 'legacy'
  const nccAudit = store.augmented
    ? computeNccAudit(store.augmented, store.config?.apCreditIds ?? [], undefined, store.config?.seasMajorKey ?? null)
    : undefined
  const advisorNotes = store.augmented
    ? computeAdvisorNotes(store.augmented, nccAudit, curriculum, gradYear)
    : []
  // A plan saved before the curriculum switch (or built under the other
  // curriculum) is left alone until the student chooses to rebuild.
  const builtUnder = store.plan?.meta.curriculumMode ?? 'legacy'
  const [curriculumNoticeDismissed, setCurriculumNoticeDismissed] = useState(() => {
    try {
      return localStorage.getItem('viper-planner:curriculum-notice') === 'dismissed'
    } catch {
      return false
    }
  })
  const showCurriculumNotice =
    !!store.plan && !!store.config && builtUnder !== curriculum && !curriculumNoticeDismissed

  // Always render the LIVE augmented course (single source of truth).
  const openCourse: { course: AugmentedCourse; semKey: SemesterKey } | null = (() => {
    if (!openRef || !store.augmented) return null
    const course = (store.augmented.semesters[openRef.semKey] ?? []).find(
      (c) => (c.originalCode ?? c.code) === openRef.courseId,
    )
    return course ? { course, semKey: openRef.semKey } : null
  })()

  function applyToast(mutation: Parameters<typeof store.apply>[0]) {
    const result = store.apply(mutation)
    if (result.ok) toast(result.message, () => store.undo())
    else toast(result.message)
    return result
  }

  const planReady = !!store.plan && !!store.augmented && !editingSetup
  const admin = isAdminMode()

  return (
    <TraceContext.Provider value={trace}>
      <div className="min-h-screen font-sans print:min-h-0">
        {/* ── Title block ── */}
        <header className="no-print sticky top-0 z-30 border-b border-ink bg-sheet">
          <div
            className={[
              'mx-auto flex h-14 w-full max-w-[124rem] items-stretch pl-[clamp(1rem,3vw,3rem)] pr-[clamp(0.5rem,2vw,2.5rem)] transition-[padding] duration-200',
              chatOpen ? 'lg:pr-[27rem]' : '',
            ].join(' ')}
          >
            <div className="flex shrink-0 items-center pr-4">
              <h1 className="font-cond text-[1.0625rem] leading-none font-bold tracking-[0.06em] whitespace-nowrap text-ink uppercase">
                VIPER <span className="text-penn-blue">Four-Year Planner</span>
              </h1>
              {admin && <span className="label ml-2 border border-penn-red px-1.5 py-1 !text-[0.625rem] !text-penn-red">Admin</span>}
            </div>

            {store.config && planReady && (
              <>
                <Cell label="Student plan" className={chatOpen ? 'hidden' : 'hidden flex-1 lg:flex'}>
                  <MajorSelects
                    config={store.config}
                    onChange={(next) => {
                      if (
                        !window.confirm(
                          'Switching majors rebuilds your starting plan from the scheduler template. Manual edits will be replaced. Continue?',
                        )
                      )
                        return
                      if (store.setup(next)) toast('Plan rebuilt for the new combination.')
                      else toast('Could not build a plan for that combination.')
                    }}
                  />
                </Cell>
                <Cell label="Class of" className={chatOpen ? 'hidden' : 'hidden shrink-0 lg:flex'}>
                  <span className="tag">{gradYear}</span>
                </Cell>
                <Cell label="Curriculum" className={chatOpen ? 'hidden' : 'hidden shrink-0 2xl:flex'}>
                  {curriculum === 'ncc' ? 'New College Curriculum' : 'Old core'}
                </Cell>
                <div className={['items-center border-l border-rule px-2', chatOpen ? 'hidden' : 'hidden lg:flex'].join(' ')}>
                  <button type="button" onClick={() => setEditingSetup(true)} className="btn btn-quiet !py-2">
                    Edit setup
                  </button>
                </div>
              </>
            )}

            <div className="ml-auto flex shrink-0 items-center justify-end gap-1 border-l border-rule pl-2">
              {store.plan && planReady && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (store.undo()) toast('Undid last change')
                    }}
                    disabled={!store.canUndo}
                    aria-label="Undo last change"
                    className="btn btn-quiet !px-2.5"
                  >
                    <IconUndo size={14} />
                    <span className="kbd hidden sm:inline" aria-hidden>
                      {MOD_KEY} Z
                    </span>
                  </button>
                  <div className="seg hidden sm:flex" role="tablist" aria-label="Schedule view">
                    {(['grid', 'focus'] as const).map((v) => (
                      <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                        {v}
                        <span className="kbd ml-1.5" aria-hidden>
                          V
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <ExportMenu onExportJson={store.exportJson} onExportCsv={store.exportCsv} onPrint={() => window.print()} />
                  </div>
                  <div className="sm:hidden">
                    <ExportMenu compact onExportJson={store.exportJson} onExportCsv={store.exportCsv} onPrint={() => window.print()} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatOpen((v) => !v)}
                    aria-pressed={chatOpen}
                    aria-label="Plan assistant"
                    className={['btn btn-quiet', chatOpen ? '!bg-ink !text-sheet' : ''].join(' ')}
                  >
                    <IconChat size={14} />
                    <span className="hidden sm:inline">Chat</span>
                    <span className="kbd hidden sm:inline" aria-hidden>
                      C
                    </span>
                  </button>
                  <div className="hidden sm:block">
                    <ShareLinkButton ref={shareRef} getLink={store.shareLink} />
                  </div>
                  <div className="sm:hidden">
                    <ShareLinkButton compact getLink={store.shareLink} />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Print-only title block: the sheet as issued. */}
        {store.config && planReady && (
          <div className="hidden border-b-2 border-ink pb-2 print:block">
            <h1 className="font-cond text-[1.25rem] font-bold tracking-[0.06em] uppercase">VIPER Four-Year Planner</h1>
            <p className="text-[0.8125rem]">
              {store.config.sasMajorKey} BA + {store.config.seasMajorKey} BSE · Class of {gradYear} ·{' '}
              {curriculum === 'ncc' ? 'New College Curriculum' : 'Old core'}
            </p>
          </div>
        )}

        <div
          className={[
            'mx-auto w-full max-w-[124rem] px-[clamp(1rem,3vw,3rem)] pt-5 pb-24 transition-[padding] duration-200 lg:pb-14 print:pb-0',
            chatOpen ? 'lg:pr-[27rem]' : '',
          ].join(' ')}
        >
          {!planReady ? (
            <PlanSetup
              initial={store.config}
              onCancel={store.plan ? () => setEditingSetup(false) : undefined}
              onDone={(config) => {
                if (store.plan && !window.confirm('Build a fresh plan from this setup? Your current edits will be replaced.'))
                  return
                if (store.setup(config)) {
                  setEditingSetup(false)
                  toast('Starting plan built. It is yours to edit now.')
                } else {
                  toast('Could not build a plan for that combination.')
                }
              }}
            />
          ) : (
            <>
              {/* The right edge holds one thing at a time: the chat, or the
                  rail. With chat open the rail drops below the plan. */}
              <div className={['grid grid-cols-1 gap-8', chatOpen ? '' : 'lg:grid-cols-[minmax(0,1fr)_21rem]'].join(' ')}>
                <main className="min-w-0">
                  {view === 'grid' ? (
                    <ScheduleGrid
                      plan={store.augmented!}
                      gradYear={gradYear}
                      colorOverrides={store.colorOverrides}
                      selected={openRef}
                      onOpenCourse={(course, semKey) => setOpenRef({ courseId: course.originalCode ?? course.code, semKey })}
                      onAddCourse={setAddTo}
                      onMove={(from, to, courseId, targetIndex) => {
                        applyToast({ kind: 'move_course', from, to, courseId, targetIndex })
                      }}
                    />
                  ) : (
                    <FocusView
                      plan={store.augmented!}
                      gradYear={gradYear}
                      selected={focusSem}
                      onSelect={setFocusSem}
                      colorOverrides={store.colorOverrides}
                      selectedCourse={openRef}
                      onOpenCourse={(course, semKey) => setOpenRef({ courseId: course.originalCode ?? course.code, semKey })}
                      onAddCourse={setAddTo}
                      onMove={(from, to, courseId, targetIndex) => {
                        applyToast({ kind: 'move_course', from, to, courseId, targetIndex })
                      }}
                    />
                  )}
                </main>

                <aside
                  id="audit"
                  aria-label="Degree audit"
                  className={['scroll-mt-20 self-start', chatOpen ? 'w-full' : ''].join(' ')}
                >
                  {/* One panel. Three dropdowns for the degrees, one for the
                      advisor's notes, one for reference. Sections with gaps
                      open on their own; everything else stays folded. */}
                  <section className="panel print-block">
                    <h2 className="label border-b border-ink px-3 py-2 !text-ink">Degree audit</h2>
                    <RequirementTracker
                      plan={store.augmented!}
                      summary={store.augmented!.summary}
                      ncc={curriculum === 'ncc' ? nccAudit : undefined}
                      curriculum={curriculum}
                    />
                    {showCurriculumNotice && (
                      <div className="no-print border-b border-rule px-3 py-3 text-[0.75rem] leading-snug text-ink" role="status">
                        <p className="label mb-1.5 flex items-center gap-1.5 !text-caution">
                          <IconAlert size={12} /> Curriculum mismatch
                        </p>
                        <p>
                          This plan was built under the{' '}
                          {builtUnder === 'ncc' ? 'New College Curriculum' : 'old core curriculum'}, but the Class of{' '}
                          {gradYear} is audited under the {curriculum === 'ncc' ? 'New College Curriculum' : 'old core'}.
                          Rebuilding replaces your edits with a fresh starting plan.
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!store.config) return
                              if (!window.confirm('Rebuild the starting plan under the current curriculum? Your edits will be replaced.'))
                                return
                              if (store.setup({ ...store.config, curriculumMode: curriculum }))
                                toast('Plan rebuilt under the current curriculum.')
                            }}
                            className="btn btn-primary !py-2"
                          >
                            Rebuild plan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                localStorage.setItem('viper-planner:curriculum-notice', 'dismissed')
                              } catch {
                                /* storage unavailable — dismiss for this session only */
                              }
                              setCurriculumNoticeDismissed(true)
                            }}
                            className="btn btn-quiet !py-2"
                          >
                            Keep as is
                          </button>
                        </div>
                      </div>
                    )}
                    <AdvisorNotes notes={advisorNotes} />
                    <div className="no-print contents">
                      <ReferencePanels />
                    </div>
                  </section>
                  {renderExtras?.(store)}
                </aside>
              </div>
            </>
          )}

          <footer className="mt-16 border-t border-ink pt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[0.6875rem] text-ink-3">
              <p>VIPER Planner is a student-built tool, not an official University of Pennsylvania application.</p>
              <p className="label !text-[0.625rem] !text-ink-3">University of Pennsylvania · Developed by Arjun Sharma, VIPER '28</p>
            </div>
          </footer>
        </div>

        {/* ── Phone term bar ── */}
        {planReady && (
          <nav
            aria-label="Jump to"
            className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-ink bg-sheet lg:hidden"
          >
            {([1, 2, 3, 4] as const).map((y) => (
              <a
                key={y}
                href={`#year-${y}`}
                className="label flex flex-1 items-center justify-center border-r border-rule py-3 !text-ink"
              >
                Y{y}
              </a>
            ))}
            <a href="#audit" className="label flex flex-[1.4] items-center justify-center py-3 !text-penn-blue">
              Audit
            </a>
          </nav>
        )}

        {chatOpen && (
          <aside
            className="no-print fade fixed top-0 right-0 bottom-0 z-40 w-full border-l border-ink bg-sheet shadow-[var(--shadow-pop)] sm:w-[26rem] lg:top-14 lg:z-20 lg:shadow-none"
            aria-label="Plan chat"
          >
            <ChatPanel mode={admin ? 'admin' : 'student'} ctx={store.toolContext} onClose={() => setChatOpen(false)} />
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              className="btn btn-quiet absolute top-2 right-2 !px-2 lg:hidden"
            >
              <IconClose />
            </button>
          </aside>
        )}

        {openCourse && (
          <CourseDetailModal
            course={openCourse.course}
            semKey={openCourse.semKey}
            gradYear={gradYear}
            color={store.colorOverrides[openCourse.course.originalCode ?? openCourse.course.code]}
            seasMajorKey={store.config?.seasMajorKey ?? null}
            onClose={() => setOpenRef(null)}
            onToggleFulfillment={(courseId, tag, on) => {
              store.apply({ kind: 'tag_fulfillment', courseId, fulfillmentId: tag, on })
            }}
            onSwap={(slotId, newCode) => applyToast({ kind: 'swap_elective', slotId, newCode })}
            onRename={(courseId, newCode, newTitle) =>
              applyToast({ kind: 'rename_course', courseId, newCode, ...(newTitle ? { newTitle } : {}) })
            }
            onMoveTo={(to) => {
              applyToast({
                kind: 'move_course',
                from: openCourse.semKey,
                to,
                courseId: openCourse.course.originalCode ?? openCourse.course.code,
              })
            }}
            onDelete={() =>
              applyToast({
                kind: 'remove_course',
                semester: openCourse.semKey,
                courseId: openCourse.course.originalCode ?? openCourse.course.code,
              })
            }
            onSetColor={store.setCourseColor}
          />
        )}

        {addTo && (
          <AddCourseModal
            semKey={addTo}
            gradYear={gradYear}
            onClose={() => setAddTo(null)}
            onAdd={(draft) => applyToast({ kind: 'add_course', semester: addTo, course: draft })}
          />
        )}
      </div>
    </TraceContext.Provider>
  )
}

export function StudentApp({ renderExtras }: { renderExtras?: RenderExtras } = {}) {
  return (
    <ToastProvider>
      <StudentAppInner renderExtras={renderExtras} />
    </ToastProvider>
  )
}
