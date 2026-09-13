import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './use-toast'
import { IconClose } from './icons'

export interface Toast {
  id: number
  message: string
  /** Optional one-click undo (reversibility as default). */
  onUndo?: () => void
}

const AUTO_DISMISS_MS = 5000

/**
 * Status lines, bottom-right, auto-dismiss after ~5s, persist while hovered.
 * On phones they sit above the term bar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const schedule = useCallback(
    (id: number) => {
      timers.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
    },
    [dismiss],
  )

  const toast = useCallback(
    (message: string, onUndo?: () => void) => {
      const id = nextId.current++
      setToasts((ts) => [...ts, { id, message, onUndo }])
      schedule(id)
    },
    [schedule],
  )

  const api = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="no-print fixed right-4 bottom-16 z-50 flex flex-col gap-2 lg:right-6 lg:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onMouseEnter={() => {
              const timer = timers.current.get(t.id)
              if (timer) clearTimeout(timer)
            }}
            onMouseLeave={() => schedule(t.id)}
            className="settle flex items-center gap-3 bg-ink px-3.5 py-2.5 text-[0.8125rem] text-sheet shadow-[var(--shadow-pop)]"
          >
            <span>{t.message}</span>
            {t.onUndo && (
              <button
                type="button"
                className="label !text-[0.625rem] !text-sheet underline underline-offset-4 hover:!text-energy"
                onClick={() => {
                  t.onUndo?.()
                  dismiss(t.id)
                }}
              >
                Undo
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className="-mr-1 text-sheet/70 hover:text-sheet"
              onClick={() => dismiss(t.id)}
            >
              <IconClose size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
