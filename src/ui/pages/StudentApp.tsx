import { useEffect, useState } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { usePlanStore } from '../store/use-plan-store'
import { PlanSetup } from '../components/PlanSetup'
import { ScheduleGrid } from '../components/ScheduleGrid'
import { RequirementTracker } from '../components/RequirementTracker'
import { ReferencePanels } from '../components/ReferencePanels'
import { Legend } from '../components/Legend'
import { ProgressHeadline } from '../components/ProgressHeadline'
import { ShareLinkButton } from '../components/ShareLinkButton'
import { ExportMenu } from '../components/ExportMenu'
import { CourseDetailModal } from '../components/CourseDetailModal'
import { AddCourseModal } from '../components/AddCourseModal'
import { ToastProvider, useToast } from '../components/Toasts'
import { MajorSelects } from '../components/MajorSelects'
import { LoadSkyline } from '../components/LoadSkyline'
import { ChatPanel } from '../../llm/chat'
import { isAdminMode } from '../../utils/mode'

interface OpenCourseRef {
  courseId: string
  semKey: SemesterKey
}

type RenderExtras = (store: ReturnType<typeof usePlanStore>) => React.ReactNode

function StudentAppInner({ renderExtras }: { renderExtras?: RenderExtras }) {
  const store = usePlanStore()
  const { toast } = useToast()
  const [openRef, setOpenRef] = useState<OpenCourseRef | null>(null)
  const [addTo, setAddTo] = useState<SemesterKey | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  // Cmd/Ctrl-Z undoes the last action (Jakob's Law).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        if (store.undo()) toast('Undid last change')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, toast])

  const gradYear = store.config?.gradYear ?? null

  // Always render the LIVE augmented course (single source of truth) — a
  // captured object would go stale the moment a fulfillment tag toggles.
  const openCourse: { course: AugmentedCourse; semKey: SemesterKey } | null = (() => {
    if (!openRef || !store.augmented) return null
    const course = (store.augmented.semesters[openRef.semKey] ?? []).find(
      (c) => (c.originalCode ?? c.code) === openRef.courseId,
    )
    return course ? { course, semKey: openRef.semKey } : null
  })()

  function applyToast(mutation: Parameters<typeof store.apply>[0]) {
    const result = store.apply(mutation)
    if (result.ok) {
      toast(result.message, () => store.undo())
    } else {
      toast(result.message)
    }
    return result
  }


  return (
    <div className="min-h-screen font-sans">
      <div
        className={[
          'mx-auto w-full max-w-[122rem] px-[clamp(1.5rem,4vw,6rem)] pt-9 pb-14 transition-[padding] duration-200',
          chatOpen ? 'lg:pr-[28.5rem]' : '',
        ].join(' ')}
      >
        {/* ── Masthead ── */}
        <header className="mb-9">
          <div
            className="rise flex items-center gap-4"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <span className="h-px flex-1 bg-rule/70" aria-hidden />
            <p className="smallcaps text-center">
              University of Pennsylvania · Vagelos Integrated Program in Energy Research
            </p>
            <span className="h-px flex-1 bg-rule/70" aria-hidden />
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
              <h1 className="font-display text-[clamp(3rem,2.1rem+1.9vw,4.75rem)] leading-[1.02] font-semibold tracking-tight text-ink">
                Four-Year <span className="text-penn-blue italic">Planner</span>
                <span className="text-penn-red">.</span>
              </h1>
              {store.config && (
                <div className="no-print mt-2.5">
                  <MajorSelects
                    config={store.config}
                    onChange={(next) => {
                      if (
                        !window.confirm(
                          'Switching majors rebuilds your starting plan from the scheduler template — manual edits will be replaced. Continue?',
                        )
                      )
                        return
                      if (store.setup(next)) toast('Plan rebuilt for the new combination.')
                      else toast('Could not build a plan for that combination.')
                    }}
                  />
                </div>
              )}
            </div>
            {store.augmented && (
              <div
                className="rise no-print hidden items-end gap-3 pb-1 sm:flex"
                style={{ '--i': 2 } as React.CSSProperties}
              >
                <span className="smallcaps mb-0.5">Load</span>
                <LoadSkyline plan={store.augmented} gradYear={gradYear} />
              </div>
            )}
          </div>

          <div className="rise mt-5" style={{ '--i': 3 } as React.CSSProperties}>
            <hr className="double-rule draw-rule" />
            {store.augmented && (
              <div className="mt-3.5">
                <ProgressHeadline summary={store.augmented.summary} />
              </div>
            )}
          </div>
        </header>

        {!store.plan || !store.augmented ? (
          <PlanSetup
            onDone={(config) => {
              if (store.setup(config)) {
                toast('Starting plan built — it’s yours to edit now.')
              } else {
                toast('Could not build a plan for that combination.')
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_21rem]">
            <ScheduleGrid
              plan={store.augmented}
              gradYear={gradYear}
              colorOverrides={store.colorOverrides}
              onOpenCourse={(course, semKey) =>
                setOpenRef({ courseId: course.originalCode ?? course.code, semKey })
              }
              onAddCourse={setAddTo}
              onMove={(from, to, courseId, targetIndex) => {
                applyToast({ kind: 'move_course', from, to, courseId, targetIndex })
              }}
            />
            <div className="flex flex-col gap-6">
              <RequirementTracker summary={store.augmented.summary} />
              {renderExtras?.(store)}
              <ReferencePanels />
              <Legend />
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Reset to the major template? Your edits will be replaced by a fresh scheduler seed.',
                    )
                  ) {
                    store.resetToTemplate()
                    toast('Reset to template complete')
                  }
                }}
                className="no-print self-start px-1 text-[0.6875rem] tracking-wide text-ink/35 transition-colors hover:text-penn-red"
              >
                Reset to template
              </button>
            </div>
          </div>
        )}

        <footer className="mt-20">
          <hr className="double-rule" />
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.6875rem] text-ink/45">
              VIPER Planner is a student-built tool, not an official University of
              Pennsylvania application.
            </p>
            <div className="text-right">
              <p className="smallcaps !text-[0.5625rem]">University of Pennsylvania</p>
              <p className="mt-0.5 text-[0.625rem] text-ink/30">
                Developed by Arjun Sharma, VIPER '28
              </p>
            </div>
          </div>
        </footer>
      </div>

      {store.plan && (
        <div
          className={[
            'no-print animate-fade fixed top-5 z-30 flex items-center gap-1.5',
            'rounded-full border border-white/70 bg-paper/75 p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl',
            'transition-[right] duration-200',
            chatOpen ? 'right-[27.5rem]' : 'right-[clamp(1.5rem,3vw,4rem)]',
          ].join(' ')}
        >
          <ExportMenu
            onExportJson={store.exportJson}
            onExportCsv={store.exportCsv}
            onPrint={() => window.print()}
          />
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            aria-pressed={chatOpen}
            className="rounded-full px-4 py-2 text-[0.71875rem] font-semibold tracking-[0.08em] text-ink/70 uppercase transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
          >
            {chatOpen ? 'Close chat' : 'Chat'}
          </button>
          <ShareLinkButton getLink={store.shareLink} />
        </div>
      )}

      {chatOpen && (
        <aside
          className="no-print animate-fade fixed top-0 right-0 bottom-0 z-30 w-full border-l border-hairline bg-cream shadow-[var(--shadow-pop)] sm:w-[26rem]"
          aria-label="Plan chat"
        >
          <ChatPanel mode={isAdminMode() ? 'admin' : 'student'} ctx={store.toolContext} />
        </aside>
      )}

      {openCourse && (
        <CourseDetailModal
          course={openCourse.course}
          semKey={openCourse.semKey}
          gradYear={gradYear}
          color={store.colorOverrides[openCourse.course.originalCode ?? openCourse.course.code]}
          onClose={() => setOpenRef(null)}
          onToggleFulfillment={(courseId, tag, on) => {
            store.apply({ kind: 'tag_fulfillment', courseId, fulfillmentId: tag, on })
          }}
          onSwap={(slotId, newCode) => applyToast({ kind: 'swap_elective', slotId, newCode })}
          onRename={(courseId, newCode) =>
            applyToast({ kind: 'rename_course', courseId, newCode })
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
          onAdd={(code, title, cu) =>
            applyToast({ kind: 'add_course', semester: addTo, course: { code, title, cu } })
          }
        />
      )}
    </div>
  )
}

export function StudentApp({ renderExtras }: { renderExtras?: RenderExtras } = {}) {
  return (
    <ToastProvider>
      <StudentAppInner renderExtras={renderExtras} />
    </ToastProvider>
  )
}
