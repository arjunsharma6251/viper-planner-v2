import { forwardRef, useRef, useState } from 'react'
import { IconCheck, IconShare } from './icons'
import { copyText } from '../../utils/clipboard'

export interface ShareLinkButtonProps {
  getLink: () => string
  compact?: boolean
}

/**
 * The share link is the feature advisors value most. Copying it is a peak
 * moment: confirm visibly, show the link, say who to send it to.
 */
export const ShareLinkButton = forwardRef<HTMLButtonElement, ShareLinkButtonProps>(function ShareLinkButton(
  { getLink, compact },
  ref,
) {
  // 2026-11 beta feedback (Austin, low confidence): the link is long and
  // copying looked hard. One click copies; the popover says whether it
  // worked, and a failure offers a one-click retry or the system share
  // sheet, never "select the URL by hand". The old code claimed success
  // even when the clipboard refused.
  const [result, setResult] = useState<{ link: string; ok: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function copy() {
    const link = getLink()
    const ok = await copyText(link)
    setResult({ link, ok })
    if (timer.current) clearTimeout(timer.current)
    // A failure stays up until the student acts on it or clicks away.
    timer.current = ok ? setTimeout(() => setResult(null), 5000) : null
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="relative">
      <button
        ref={ref}
        type="button"
        onClick={() => void copy()}
        aria-label={compact ? 'Share plan' : undefined}
        className={['btn btn-primary', compact ? '!px-2.5' : ''].join(' ')}
      >
        <IconShare size={14} />
        {!compact && (
          <>
            Share plan
            <span className="kbd" aria-hidden>
              S
            </span>
          </>
        )}
      </button>
      {result && (
        <div
          role="status"
          className="settle absolute top-full right-0 z-40 mt-1 w-72 border border-ink bg-sheet p-3 shadow-[var(--shadow-pop)]"
        >
          {result.ok ? (
            <>
              <p className="label flex items-center gap-1.5 !text-good">
                <IconCheck size={12} /> Link copied
              </p>
              <p className="tag mt-1.5 truncate text-ink-2">{result.link}</p>
              <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-2">
                Paste it to your advisor. They see exactly this plan, no login needed.
              </p>
            </>
          ) : (
            <>
              <p className="label !text-caution">Your browser blocked copying</p>
              <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-2">Try once more, or send it straight from the share sheet.</p>
              <div className="mt-2.5 flex gap-2">
                <button type="button" className="btn btn-primary !py-1.5" onClick={() => void copy()}>
                  Copy link
                </button>
                {canShare && (
                  <button
                    type="button"
                    className="btn !py-1.5"
                    onClick={() => {
                      void navigator.share({ title: 'VIPER plan', url: result.link }).catch(() => undefined)
                    }}
                  >
                    Share…
                  </button>
                )}
                <button type="button" className="btn btn-quiet !py-1.5" onClick={() => setResult(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
})

