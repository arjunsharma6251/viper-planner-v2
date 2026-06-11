import { Fragment, type ReactNode } from 'react'

/**
 * Small markdown renderer for chat bubbles: paragraphs (single newlines
 * become line breaks), headings, bullet/numbered lists, tables, horizontal
 * rules, **bold**, *italic*, and `code`. Builds React nodes directly — no
 * HTML injection, no dependency. Anything fancier renders as plain text.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g)
  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      nodes.push(
        <strong key={`${keyBase}-${i}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>,
      )
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <code
          key={`${keyBase}-${i}`}
          className="rounded-sm bg-ink/6 px-1 font-mono text-[0.6875rem]"
        >
          {part.slice(1, -1)}
        </code>,
      )
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push(<em key={`${keyBase}-${i}`}>{part.slice(1, -1)}</em>)
    } else if (part) {
      nodes.push(part)
    }
  })
  return nodes
}

const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isSeparatorLine = (l: string) => /^\s*\|[\s\-:|]+\|\s*$/.test(l)
const isBullet = (l: string) => /^\s*[-•*]\s+/.test(l)
const isNumbered = (l: string) => /^\s*\d+[.)]\s+/.test(l)
const isHeading = (l: string) => /^#{1,4}\s+/.test(l)
const isRule = (l: string) => /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l)

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

function Table({ lines, keyBase }: { lines: string[]; keyBase: string }) {
  const rows = lines.filter((l) => !isSeparatorLine(l)).map(cells)
  const [head, ...body] = rows
  if (!head) return null
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-[0.71875rem]">
        <thead>
          <tr>
            {head.map((c, i) => (
              <th
                key={i}
                className="smallcaps border-b-2 border-ink/20 px-1.5 py-1 text-left !text-[0.5625rem]"
              >
                {inline(c, `${keyBase}-h${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td
                  key={ci}
                  className="border-b border-dotted border-hairline px-1.5 py-1.5 align-top leading-snug"
                >
                  {inline(c, `${keyBase}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Render one block (text between blank lines), which may mix line kinds. */
function renderBlock(block: string, bi: number): ReactNode[] {
  const lines = block.split('\n').filter((l) => l.trim() !== '')
  const out: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    const key = `${bi}-${i}`

    if (isRule(line)) {
      out.push(<hr key={key} className="my-1 border-t border-hairline" />)
      i++
    } else if (isHeading(line)) {
      const level = (/^#+/.exec(line)?.[0].length ?? 2) as number
      out.push(
        <p
          key={key}
          className={
            level <= 2
              ? 'mt-1 text-[0.875rem] font-semibold text-ink'
              : 'mt-0.5 text-[0.8125rem] font-semibold text-ink/90'
          }
        >
          {inline(line.replace(/^#{1,4}\s+/, ''), key)}
        </p>,
      )
      i++
    } else if (isTableLine(line)) {
      const start = i
      while (i < lines.length && isTableLine(lines[i]!)) i++
      out.push(<Table key={key} lines={lines.slice(start, i)} keyBase={key} />)
    } else if (isBullet(line) || isNumbered(line)) {
      const numbered = isNumbered(line)
      const items: string[] = []
      // An item is its marker line plus any following plain lines (wrapped text).
      while (i < lines.length && (isBullet(lines[i]!) || isNumbered(lines[i]!))) {
        let item = lines[i]!.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')
        i++
        while (
          i < lines.length &&
          !isBullet(lines[i]!) &&
          !isNumbered(lines[i]!) &&
          !isTableLine(lines[i]!) &&
          !isHeading(lines[i]!) &&
          !isRule(lines[i]!)
        ) {
          item += ` ${lines[i]!.trim()}`
          i++
        }
        items.push(item)
      }
      const List = numbered ? 'ol' : 'ul'
      out.push(
        <List
          key={key}
          className={numbered ? 'ml-4 list-decimal space-y-1' : 'ml-4 list-disc space-y-1'}
        >
          {items.map((item, li) => (
            <li key={li}>{inline(item, `${key}-${li}`)}</li>
          ))}
        </List>,
      )
    } else {
      // Paragraph: consecutive plain lines, single newlines become <br>.
      const para: string[] = []
      while (
        i < lines.length &&
        !isBullet(lines[i]!) &&
        !isNumbered(lines[i]!) &&
        !isTableLine(lines[i]!) &&
        !isHeading(lines[i]!) &&
        !isRule(lines[i]!)
      ) {
        para.push(lines[i]!)
        i++
      }
      out.push(
        <p key={key}>
          {para.map((l, li) => (
            <Fragment key={li}>
              {li > 0 && <br />}
              {inline(l, `${key}-${li}`)}
            </Fragment>
          ))}
        </p>,
      )
    }
  }
  return out
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => (
        <Fragment key={bi}>{renderBlock(block, bi)}</Fragment>
      ))}
    </div>
  )
}
