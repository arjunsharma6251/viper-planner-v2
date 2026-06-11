import { useState } from 'react'

/**
 * The killer feature. Copying the share link is a peak moment — confirm
 * visibly, show the link, nudge toward the advisor use case.
 */
export function ShareLinkButton({ getLink }: { getLink: () => string }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy() {
    const link = getLink()
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Clipboard API unavailable — still show the link for manual copy
    }
    setCopied(link)
    setTimeout(() => setCopied(null), 4000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-full bg-penn-red px-4.5 py-2 text-[0.71875rem] font-semibold tracking-[0.08em] text-white uppercase shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#7e0000] hover:shadow-[var(--shadow-card-hover)] active:translate-y-0"
      >
        Share plan ↗
      </button>
      {copied && (
        <div className="animate-rise absolute top-full right-0 z-40 mt-2 w-72 rounded-md border border-hairline bg-paper p-3.5 shadow-[var(--shadow-pop)]">
          <p className="smallcaps !text-[#1e6b38]">✓ Link copied</p>
          <p className="mt-1.5 truncate font-mono text-[0.625rem] text-ink-soft">{copied}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Send it to your advisor — they'll see exactly this plan, no login needed.
          </p>
        </div>
      )}
    </div>
  )
}
