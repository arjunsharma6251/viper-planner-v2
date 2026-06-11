import type { ReactNode } from 'react'

/**
 * Tiny markdown renderer for chat bubbles: paragraphs, bullet/numbered
 * lists, **bold**, and `code`. Builds React nodes directly — no HTML
 * injection, no dependency. Anything fancier renders as plain text.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Split on **bold** and `code` spans, keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      nodes.push(
        <strong key={`${keyBase}-${i}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>,
      )
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <code key={`${keyBase}-${i}`} className="rounded-sm bg-ink/6 px-1 font-mono text-[0.6875rem]">
          {part.slice(1, -1)}
        </code>,
      )
    } else if (part) {
      nodes.push(part)
    }
  })
  return nodes
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '')
        if (lines.length === 0) return null
        const isBullets = lines.every((l) => /^\s*[-•*]\s+/.test(l))
        const isNumbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l))
        if (isBullets || isNumbered) {
          const List = isNumbered ? 'ol' : 'ul'
          return (
            <List
              key={bi}
              className={
                isNumbered ? 'ml-4 list-decimal space-y-1' : 'ml-4 list-disc space-y-1'
              }
            >
              {lines.map((l, li) => (
                <li key={li}>
                  {inline(l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, ''), `${bi}-${li}`)}
                </li>
              ))}
            </List>
          )
        }
        return <p key={bi}>{lines.map((l, li) => inline(l, `${bi}-${li}`))}</p>
      })}
    </div>
  )
}
