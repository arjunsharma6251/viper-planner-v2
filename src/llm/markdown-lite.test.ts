// Renders MarkdownLite to static HTML in node — no browser needed.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownLite } from './MarkdownLite'

function render(text: string): string {
  return renderToStaticMarkup(createElement(MarkdownLite, { text }))
}

describe('MarkdownLite', () => {
  it('renders single newlines as line breaks, not smushed text', () => {
    const html = render('**Sector VI – The Physical World**\nYour CHEM 1012 carries the tag.')
    expect(html).toContain('<br/>')
    expect(html).not.toContain('WorldYour')
  })

  it('renders markdown tables as real tables', () => {
    const html = render(
      '| Check | Status |\n|---|---|\n| Total CU (50) | ✅ Exceeds minimum |\n| Energy (3/3) | ✅ Done |',
    )
    expect(html).toContain('<table')
    expect(html).toContain('<th')
    expect(html).toContain('Total CU (50)')
    // Separator row must not leak into the body
    expect(html).not.toContain('---')
  })

  it('renders headings and horizontal rules', () => {
    const html = render("## What's Looking Good\n\n---\n\n### Hard Requirement Gaps")
    expect(html).toContain("What&#x27;s Looking Good")
    expect(html).toContain('<hr')
    expect(html).not.toContain('##')
  })

  it('keeps wrapped numbered-list items together', () => {
    const html = render(
      '1. **First issue** — something\nthat wraps onto the next line.\n2. Second issue.',
    )
    expect(html).toContain('<ol')
    expect((html.match(/<li>/g) ?? []).length).toBe(2)
    expect(html).toContain('that wraps')
  })

  it('still handles bold, code, and bullets', () => {
    const html = render('- **CHEM 2410** in `fall-y2`\n- plain item')
    expect(html).toContain('<ul')
    expect(html).toContain('<strong')
    expect(html).toContain('<code')
  })
})
