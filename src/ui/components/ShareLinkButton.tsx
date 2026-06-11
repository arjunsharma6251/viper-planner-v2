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
        className="rounded-lg bg-penn-red px-4 py-2 text-sm font-medium text-white transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-100"
      >
        Share plan ↗
      </button>
      {copied && (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 animate-[fadeIn_150ms_ease-out] rounded-lg bg-white p-3 shadow-xl ring-1 ring-hairline">
          <p className="text-sm font-medium text-green-700">✓ Link copied</p>
          <p className="mt-1 truncate font-mono text-[11px] text-ink/60">{copied}</p>
          <p className="mt-1.5 text-xs text-ink/60">
            Send it to your advisor — they'll see exactly this plan, no login needed.
          </p>
        </div>
      )}
    </div>
  )
}
