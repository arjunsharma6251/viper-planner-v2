import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => vi.unstubAllGlobals())

const fakeDocument = (execOk: boolean) => ({
  createElement: () => ({ value: '', style: {}, setAttribute() {}, select() {} }),
  body: { appendChild() {}, removeChild() {} },
  execCommand: () => execOk,
})

describe('copyText (share link)', () => {
  it('uses the Clipboard API when it works', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('https://x/#abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://x/#abc')
  })
  it('falls back to the copy command when the Clipboard API refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    vi.stubGlobal('document', fakeDocument(true))
    expect(await copyText('link')).toBe(true)
  })
  it('reports failure instead of claiming success', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', fakeDocument(false))
    expect(await copyText('link')).toBe(false)
  })
})
