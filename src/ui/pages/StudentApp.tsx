import { useEffect, useState } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { usePlanStore } from '../store/use-plan-store'
import { PlanSetup } from '../components/PlanSetup'
import { ScheduleGrid } from '../components/ScheduleGrid'
import { RequirementTracker } from '../components/RequirementTracker'
import { ReferencePanels } from '../components/ReferencePanels'
import { ProgressHeadline } from '../components/ProgressHeadline'
import { ShareLinkButton } from '../components/ShareLinkButton'
import { ExportMenu } from '../components/ExportMenu'
import { CourseDetailModal } from '../components/CourseDetailModal'
import { AddCourseModal } from '../components/AddCourseModal'
import { ToastProvider, useToast } from '../components/Toasts'
import { ChatPanel } from '../../llm/chat'
import { isAdminMode } from '../../utils/mode'
import { MAJORS } from '../../data/majors'

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

  const sasName = store.config ? (MAJORS[store.config.sasMajorKey]?.fullName ?? '') : ''
  const seasName = store.config ? (MAJORS[store.config.seasMajorKey]?.fullName ?? '') : ''

  return (
    <div className="min-h-screen font-sans">
      <div
        className={[
          'mx-auto max-w-[1480px] px-8 pt-9 pb-12 transition-[padding] duration-200 sm:px-12',
          chatOpen ? 'lg:pr-[420px]' : '',
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

          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
              <h1 className="font-display text-[50px] leading-[1.02] font-semibold tracking-tight text-ink">
                Four-Year <span className="text-penn-blue italic">Planner</span>
                <span className="text-penn-red">.</span>
              </h1>
              {store.config && (
                <p className="mt-2 text-[13px] text-ink-soft">
                  {sasName} <span className="smallcaps mx-0.5 !text-[9px]">BA</span> +{' '}
                  {seasName} <span className="smallcaps mx-0.5 !text-[9px]">BSE</span> · Class
                  of {gradYear}
                </p>
              )}
            </div>
            {store.plan && (
              <div
                className="rise no-print flex items-center gap-2.5"
                style={{ '--i': 2 } as React.CSSProperties}
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
                  className="rounded-sm border border-hairline bg-paper px-4 py-2 text-[12px] font-medium tracking-[0.06em] text-ink/75 uppercase shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-rule hover:text-ink"
                >
                  {chatOpen ? 'Close chat' : 'Chat'}
                </button>
                <ShareLinkButton getLink={store.shareLink} />
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
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
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
                className="no-print self-start px-1 text-[11px] tracking-wide text-ink/35 transition-colors hover:text-penn-red"
              >
                Reset to template
              </button>
            </div>
          </div>
        )}

        <footer className="mt-20">
          <hr className="double-rule" />
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] text-ink/45">
              VIPER Planner is a student-built tool, not an official University of
              Pennsylvania application.
            </p>
            <p className="smallcaps !text-[9px]">University of Pennsylvania</p>
          </div>
        </footer>
      </div>

      {chatOpen && (
        <aside
          className="no-print animate-fade fixed top-0 right-0 bottom-0 z-30 hidden w-[400px] border-l border-hairline bg-cream shadow-[var(--shadow-pop)] lg:block"
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
