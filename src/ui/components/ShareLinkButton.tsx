import { forwardRef, useState } from 'react'
import { IconCheck, IconShare } from './icons'

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
  const [copied, setCopied] = useState<string | null>(null)

  async function copy() {
    const link = getLink()
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Clipboard API unavailable — still show the link for manual copy
    }
    setCopied(link)
    setTimeout(() => setCopied(null), 5000)
  }

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
      {copied && (
        <div
          role="status"
          className="settle absolute top-full right-0 z-40 mt-1 w-72 border border-ink bg-sheet p-3 shadow-[var(--shadow-pop)]"
        >
          <p className="label flex items-center gap-1.5 !text-good">
            <IconCheck size={12} /> Link copied
          </p>
          <p className="tag mt-1.5 truncate text-ink-2">{copied}</p>
          <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-2">
            Send it to your advisor. They see exactly this plan, no login needed.
          </p>
        </div>
      )}
    </div>
  )
})
