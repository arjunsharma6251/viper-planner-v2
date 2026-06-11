import { useEffect, useRef, type ReactNode } from 'react'

export interface ModalProps {
  title: string
  /** Small-caps line above the title (e.g. "Course detail"). */
  eyebrow?: string
  onClose: () => void
  children: ReactNode
}

/**
 * Modal primitive: closes on Escape and click-outside, traps focus while
 * open, restores focus on close. Never open a modal from within a modal —
 * second-level decisions are tabs or steps inside the first.
 */
export function Modal({ title, eyebrow, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
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
  }, [onClose])

  return (
    <div
      className="animate-fade fixed inset-0 z-40 flex items-center justify-center bg-[#16140f]/35 p-6 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hairline bg-paper p-6 shadow-[var(--shadow-pop)]"
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <p className="smallcaps mb-1">{eyebrow}</p>}
            <h2 className="font-display text-[22px] leading-tight font-semibold text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mt-1 rounded-sm px-2 py-0.5 text-xl text-ink/35 transition-colors hover:text-ink"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
