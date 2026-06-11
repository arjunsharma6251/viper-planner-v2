import { useEffect, useState } from 'react'
import type { AugmentedCourse } from '../../plan/types'
import type { SemesterKey } from '../../data/semesters'
import { usePlanStore } from '../store/use-plan-store'
import { PlanSetup } from '../components/PlanSetup'
import { ScheduleGrid } from '../components/ScheduleGrid'
import { RequirementTracker } from '../components/RequirementTracker'
import { ProgressHeadline } from '../components/ProgressHeadline'
import { ShareLinkButton } from '../components/ShareLinkButton'
import { ExportMenu } from '../components/ExportMenu'
import { CourseDetailModal } from '../components/CourseDetailModal'
import { AddCourseModal } from '../components/AddCourseModal'
import { ToastProvider, useToast } from '../components/Toasts'
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
          'mx-auto max-w-[1400px] px-8 py-10 transition-[padding] duration-200',
          chatOpen ? 'lg:pr-[400px]' : '',
        ].join(' ')}
      >
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-penn-blue">
              VIPER Four-Year Planner
            </h1>
            {store.augmented && (
              <div className="mt-2">
                <ProgressHeadline summary={store.augmented.summary} />
              </div>
            )}
          </div>
          {store.plan && (
            <div className="flex items-center gap-3">
              <ExportMenu
                onExportJson={store.exportJson}
                onExportCsv={store.exportCsv}
                onPrint={() => window.print()}
              />
              <button
                type="button"
                onClick={() => setChatOpen((v) => !v)}
                aria-pressed={chatOpen}
                className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm text-ink/80 hover:border-ink/30"
              >
                {chatOpen ? 'Close chat' : 'Chat'}
              </button>
              <ShareLinkButton getLink={store.shareLink} />
            </div>
          )}
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
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
              <ScheduleGrid
                plan={store.augmented}
                gradYear={gradYear}
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
                  className="self-start text-xs text-ink/40 hover:text-penn-red"
                >
                  Reset to template
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-16 border-t border-hairline pt-6 text-xs text-ink/50">
          VIPER Planner is a student-built tool, not an official University of Pennsylvania
          application. · University of Pennsylvania
        </footer>
      </div>

      {chatOpen && (
        <aside
          className="fixed top-0 right-0 bottom-0 z-30 hidden w-[380px] border-l border-hairline bg-cream lg:block"
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
