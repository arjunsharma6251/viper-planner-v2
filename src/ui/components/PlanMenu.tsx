import { useEffect, useRef, useState } from 'react'
import type { PlanListing } from '../store/use-plan-store'
import { IconCheck, IconChevronDown } from './icons'

export interface PlanMenuProps {
  plans: PlanListing[]
  activeId: string | null
  viewingShared: boolean
  onSwitch: (id: string) => void
  onNew: () => void
  onDuplicate: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSaveShared: () => void
}

/**
 * Saved plans, in one menu (2026-11 beta feedback, Max): switch between
 * versions or major combinations, start a new one (setup runs again),
 * duplicate, rename, delete (undo from the toast). Everything autosaves.
 */
export function PlanMenu({ plans, activeId, viewingShared, onSwitch, onNew, onDuplicate, onRename, onDelete, onSaveShared }: PlanMenuProps) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const active = plans.find((p) => p.id === activeId) ?? null

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setRenaming(false)
  }
  function act(fn: () => void) {
    fn()
    close()
  }

  const item =
    'flex w-full items-center gap-2.5 border-b border-rule px-3 py-2 text-left text-[0.8125rem] text-ink transition-colors duration-100 last:border-b-0 hover:bg-tint-blue'
  const label = viewingShared ? 'Shared plan · not saved' : (active?.name ?? 'Plan')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="inline-flex max-w-[22rem] items-center gap-1.5 text-left text-[0.9375rem] text-ink hover:text-penn-blue"
      >
        <span className="truncate font-medium">{label}</span>
        <IconChevronDown size={10} />
      </button>
      {open && (
        <div role="menu" className="settle absolute top-full left-0 z-40 mt-1 w-72 border border-ink bg-sheet shadow-[var(--shadow-pop)]">
          {viewingShared && (
            <div className="border-b border-ink px-3 py-2.5">
              <p className="text-[0.75rem] leading-snug text-ink-2">
                You are viewing a shared link. Your saved plans are untouched; editing this one saves it as a new plan.
              </p>
              <button type="button" role="menuitem" className="btn btn-primary mt-2 !py-1.5" onClick={() => act(onSaveShared)}>
                Save to my plans
              </button>
            </div>
          )}
          {plans.length > 0 && (
            <div className="max-h-64 overflow-y-auto border-b border-ink">
              <p className="label px-3 pt-2 pb-1 !text-[0.5625rem] !text-ink-3">My plans</p>
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={p.id === activeId}
                  className={item}
                  onClick={() => act(() => p.id !== activeId && onSwitch(p.id))}
                >
                  <span className="w-3 shrink-0 text-good">{p.id === activeId && <IconCheck size={12} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.name}</span>
                    <span className="tag block !text-[0.625rem] text-ink-3">{p.combo}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <button type="button" role="menuitem" className={item} onClick={() => act(onNew)}>
            New plan…
          </button>
          {active && !viewingShared && (
            <>
              <button type="button" role="menuitem" className={item} onClick={() => act(() => onDuplicate(active.id))}>
                Duplicate this plan
              </button>
              {renaming ? (
                <form
                  className="flex items-center gap-2 border-b border-rule px-3 py-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (draft.trim()) act(() => onRename(active.id, draft))
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Plan name"
                    className="field min-w-0 flex-1 !py-1.5"
                    value={draft}
                    maxLength={60}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button type="submit" className="btn !py-1.5" disabled={!draft.trim()}>
                    Save
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => {
                    setDraft(active.name)
                    setRenaming(true)
                  }}
                >
                  Rename…
                </button>
              )}
              <button type="button" role="menuitem" className={[item, '!text-penn-red'].join(' ')} onClick={() => act(() => onDelete(active.id))}>
                Delete this plan
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
