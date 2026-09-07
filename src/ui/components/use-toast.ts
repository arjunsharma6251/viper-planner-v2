import { createContext, useContext } from 'react'

export interface ToastApi {
  toast: (message: string, onUndo?: () => void) => void
}

/** Provided by <ToastProvider> (Toasts.tsx); consumed via useToast(). */
export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
