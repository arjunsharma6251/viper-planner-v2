import { useEffect, useRef, useState } from 'react'

export interface ExportMenuProps {
  onExportJson: () => void
  onExportCsv: () => void
  onPrint: () => void
}

/**
 * JSON / CSV / Print live behind a single "Export ▾" (Hick's Law — the two
 * primary actions, Share and Add, stay visible; everything else groups).
 */
export function ExportMenu({ onExportJson, onExportCsv, onPrint }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item =
    'block w-full rounded-sm px-3 py-1.5 text-left text-[0.8125rem] text-ink/85 hover:bg-[#fbf8f0]'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full px-4 py-2 text-[0.71875rem] font-semibold tracking-[0.08em] text-ink/70 uppercase transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
      >
        Export ▾
      </button>
      {open && (
        <div
          role="menu"
          className="animate-rise absolute top-full right-0 z-40 mt-1.5 w-40 rounded-md border border-hairline bg-paper p-1 shadow-[var(--shadow-pop)]"
        >
          <button type="button" role="menuitem" className={item} onClick={() => { onExportJson(); setOpen(false) }}>
            Download JSON
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onExportCsv(); setOpen(false) }}>
            Download CSV
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onPrint(); setOpen(false) }}>
            Print view
          </button>
        </div>
      )}
    </div>
  )
}
