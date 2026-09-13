import { useEffect, useRef, useState } from 'react'
import { IconChevronDown, IconDownload, IconPrint } from './icons'

export interface ExportMenuProps {
  onExportJson: () => void
  onExportCsv: () => void
  onPrint: () => void
  compact?: boolean
}

/** JSON / CSV / Print behind one Export control. */
export function ExportMenu({ onExportJson, onExportCsv, onPrint, compact }: ExportMenuProps) {
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
    'flex w-full items-center gap-2.5 border-b border-rule px-3 py-2 text-left text-[0.8125rem] text-ink transition-colors duration-100 last:border-b-0 hover:bg-tint-blue'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? 'Export' : undefined}
        onClick={() => setOpen((v) => !v)}
        className={['btn btn-quiet', compact ? '!px-2.5' : ''].join(' ')}
      >
        <IconDownload size={14} />
        {!compact && (
          <>
            Export
            <IconChevronDown size={10} />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="settle absolute top-full right-0 z-40 mt-1 w-44 border border-ink bg-sheet shadow-[var(--shadow-pop)]"
        >
          <button type="button" role="menuitem" className={item} onClick={() => { onExportJson(); setOpen(false) }}>
            <IconDownload size={14} /> Download JSON
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onExportCsv(); setOpen(false) }}>
            <IconDownload size={14} /> Download CSV
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onPrint(); setOpen(false) }}>
            <IconPrint size={14} /> Print the sheet
          </button>
        </div>
      )}
    </div>
  )
}
