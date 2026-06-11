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
    'block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-cream'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm text-ink/80 hover:border-ink/30"
      >
        Export ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-1 w-40 rounded-lg bg-white p-1 shadow-xl ring-1 ring-hairline"
        >
          <button type="button" role="menuitem" className={item} onClick={() => { onExportJson(); setOpen(false) }}>
            JSON
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onExportCsv(); setOpen(false) }}>
            CSV
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onPrint(); setOpen(false) }}>
            Print
          </button>
        </div>
      )}
    </div>
  )
}
