import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './use-toast'

export interface Toast {
  id: number
  message: string
  /** Optional one-click undo (reversibility as default). */
  onUndo?: () => void
}

const AUTO_DISMISS_MS = 5000

/**
 * Bottom-right toasts, auto-dismiss after ~5s, persist while hovered
 * (Jakob's Law — match what students already know).
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
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      )
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
        className="no-print fixed right-6 bottom-6 z-50 flex flex-col gap-2"
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
            className="animate-rise flex items-center gap-3 rounded-md bg-ink px-4 py-2.5 text-[0.8125rem] text-[#f7f3ea] shadow-[var(--shadow-pop)]"
          >
            <span>{t.message}</span>
            {t.onUndo && (
              <button
                type="button"
                className="font-medium text-amber-300 hover:underline"
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
              className="text-white/60 hover:text-white"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
