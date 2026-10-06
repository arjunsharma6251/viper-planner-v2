import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from './icons'

export interface ModalProps {
  title: string
  /** A line under the title: the object's readouts (CU, slot, PCR). */
  meta?: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

/**
 * Modal primitive: closes on Escape and click-outside, traps focus while
 * open, restores focus on close. Never open a modal from within a modal —
 * second-level decisions are tabs or steps inside the first.
 */
export function Modal({ title, meta, onClose, children, wide }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  // The latest close handler, read at event time: the effect below runs
  // once per mount, so a parent re-render never re-focuses anything.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close]), [href]')?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'))
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus()
    }
  }, [])

  return (
    <div
      className="fade fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'settle flex max-h-[92vh] w-full flex-col border border-ink bg-sheet shadow-[var(--shadow-pop)] sm:max-h-[85vh]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        ].join(' ')}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[1.3125rem] leading-tight font-semibold text-ink">
              {title}
            </h2>
            {meta && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-2">{meta}</div>}
          </div>
          <button
            type="button"
            data-close
            aria-label="Close"
            onClick={onClose}
            className="btn btn-quiet -mt-1 -mr-2 !px-2"
          >
            <IconClose />
            <span className="kbd" aria-hidden>
              esc
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
