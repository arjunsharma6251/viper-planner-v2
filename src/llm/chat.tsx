import { useEffect, useRef, useState } from 'react'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { CHAT_MODEL, createClient, getStoredApiKey, setStoredApiKey } from './client'
import { runChatTurn } from './chat-loop'
import type { PlanToolContext } from './tools'
import { MarkdownLite } from './MarkdownLite'

interface DisplayEntry {
  id: number
  role: 'user' | 'assistant' | 'tool'
  text: string
  /** Tool entries: still executing. Assistant entries: still streaming. */
  pending?: boolean
  ok?: boolean
}

/** Entries with consecutive tool lines folded into one activity cluster. */
type RenderItem =
  | { kind: 'message'; entry: DisplayEntry }
  | { kind: 'activity'; id: number; entries: DisplayEntry[] }

function groupEntries(entries: DisplayEntry[]): RenderItem[] {
  const items: RenderItem[] = []
  for (const entry of entries) {
    const prev = items[items.length - 1]
    if (entry.role === 'tool') {
      if (prev?.kind === 'activity') prev.entries.push(entry)
      else items.push({ kind: 'activity', id: entry.id, entries: [entry] })
    } else {
      items.push({ kind: 'message', entry })
    }
  }
  return items
}

/** Map API failures to something a student can act on — never raw JSON. */
function friendlyError(err: unknown): string {
  const status =
    err && typeof err === 'object' && 'status' in err
      ? (err as { status?: number }).status
      : undefined
  if (status === 401)
    return "That API key was rejected. Tap **Key** above and re-paste it — and check the key's workspace actually has credits."
  if (status === 429)
    return 'Rate limited — give it a few seconds and try again.'
  if (status === 529 || status === 500)
    return "Anthropic's API is having a moment. Try again shortly."
  const msg = err instanceof Error ? err.message : String(err)
  return `Something went wrong talking to the API: ${msg.slice(0, 200)}`
}

const SUGGESTIONS = [
  'Review my plan',
  'Which semester is my heaviest, and what could move?',
  'What if I switch my BSE major to MSE?',
]

export interface ChatPanelProps {
  mode: 'student' | 'admin'
  ctx: PlanToolContext
}

/**
 * The chat sidekick — a quiet document margin, not a messenger app.
 * Tool activity renders as ledger clusters (dotted rules, mono labels);
 * prose streams into paper cards. Chat is the sidekick, not the surface.
 */
export function ChatPanel({ mode, ctx }: ChatPanelProps) {
  const [entries, setEntries] = useState<DisplayEntry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasKey, setHasKey] = useState(() => !!getStoredApiKey())
  const [keyInput, setKeyInput] = useState('')
  const history = useRef<MessageParam[]>([])
  const nextId = useRef(1)
  const streamingId = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries, busy])

  useEffect(() => {
    if (hasKey) inputRef.current?.focus()
  }, [hasKey])

  useEffect(() => () => abortRef.current?.abort(), [])

  function push(entry: Omit<DisplayEntry, 'id'>): number {
    const id = nextId.current++
    setEntries((es) => [...es, { ...entry, id }])
    return id
  }

  function patch(id: number, updates: Partial<DisplayEntry>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...updates } : e)))
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    const client = createClient()
    if (!client) return
    setInput('')
    push({ role: 'user', text: message })
    setBusy(true)
    history.current.push({ role: 'user', content: message })
    const abort = new AbortController()
    abortRef.current = abort
    try {
      history.current = await runChatTurn(client, {
        mode,
        history: history.current,
        ctx,
        signal: abort.signal,
        onEvent: (event) => {
          if (event.type === 'text_delta') {
            if (streamingId.current === null) {
              streamingId.current = push({ role: 'assistant', text: event.text, pending: true })
            } else {
              const id = streamingId.current
              setEntries((es) =>
                es.map((e) => (e.id === id ? { ...e, text: e.text + event.text } : e)),
              )
            }
          } else if (event.type === 'text_done') {
            if (streamingId.current !== null) {
              patch(streamingId.current, { text: event.text, pending: false })
              streamingId.current = null
            }
          } else if (event.type === 'tool_call') {
            push({ role: 'tool', text: event.label, pending: true })
          } else if (event.type === 'tool_result') {
            setEntries((es) => {
              const last = [...es].reverse().find((e) => e.role === 'tool' && e.pending)
              if (!last) return es
              return es.map((e) =>
                e.id === last.id ? { ...e, pending: false, ok: event.ok } : e,
              )
            })
          }
        },
      })
    } catch (err) {
      if (!abort.signal.aborted) {
        push({ role: 'assistant', text: friendlyError(err) })
      }
    } finally {
      if (streamingId.current !== null) {
        patch(streamingId.current, { pending: false })
        streamingId.current = null
      }
      abortRef.current = null
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  if (!hasKey) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 px-6">
        <p className="smallcaps">Plan assistant</p>
        <hr className="double-rule" />
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
          Paste an Anthropic API key to enable the plan-review chat. It's stored only in
          this browser, never sent anywhere but Anthropic.
        </p>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="sk-ant-…"
          className="rounded-md border border-hairline bg-paper px-3 py-2.5 font-mono text-[0.6875rem] placeholder:text-ink/30"
          aria-label="Anthropic API key"
        />
        <button
          type="button"
          disabled={!keyInput.startsWith('sk-ant-')}
          onClick={() => {
            setStoredApiKey(keyInput)
            setHasKey(true)
          }}
          className="rounded-md bg-penn-blue py-2.5 text-[0.75rem] font-semibold tracking-[0.08em] text-white uppercase transition-colors hover:bg-penn-blue-soft disabled:opacity-40"
        >
          Save key
        </button>
      </div>
    )
  }

  const items = groupEntries(entries)

  return (
    <div className="flex h-full flex-col">
      {/* ── Panel masthead ── */}
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="smallcaps">Plan assistant</p>
            <p className="tnum mt-0.5 font-mono text-[0.5625rem] text-ink/30">{CHAT_MODEL}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                history.current = []
                setEntries([])
              }}
              className="smallcaps !text-[0.5625rem] !text-ink/40 transition-colors hover:!text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setHasKey(false)
                setKeyInput('')
              }}
              className="smallcaps !text-[0.5625rem] !text-ink/40 transition-colors hover:!text-ink"
            >
              Key
            </button>
          </div>
        </div>
        <hr className="double-rule mt-3" />
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-4">
        {entries.length === 0 && (
          <div className="flex h-full flex-col justify-end gap-2.5 pb-2">
            <p
              className="rise font-display text-[1.5rem] leading-snug font-semibold text-ink"
              style={{ '--i': 0 } as React.CSSProperties}
            >
              Ask about <span className="text-penn-blue italic">your plan</span>
              <span className="text-penn-red">.</span>
            </p>
            <p
              className="rise mb-2 text-[0.78125rem] leading-relaxed text-ink-soft"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              I can review it, explain program rules, or dry-run "what if" scenarios —
              nothing changes until you confirm.
            </p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                style={{ '--i': i + 2 } as React.CSSProperties}
                className="rise group flex items-baseline justify-between gap-3 rounded-md border border-hairline bg-paper px-3.5 py-2.5 text-left text-[0.78125rem] text-ink/80 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-px hover:border-penn-blue/40 hover:text-penn-blue hover:shadow-[var(--shadow-card-hover)]"
              >
                <span>{s}</span>
                <span
                  aria-hidden
                  className="text-ink/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-penn-blue"
                >
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map((item) => {
            if (item.kind === 'activity') {
              return (
                <div
                  key={item.id}
                  className="animate-fade mr-8 rounded-md border border-hairline bg-cream/70 px-3 py-1"
                >
                  {item.entries.map((e, i) => (
                    <div
                      key={e.id}
                      className={[
                        'flex items-baseline gap-2 py-1.5 font-mono text-[0.625rem]',
                        i > 0 ? 'border-t border-dotted border-hairline' : '',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden
                        className={[
                          'w-3 text-center',
                          e.pending
                            ? 'animate-pulse text-ink/40'
                            : e.ok === false
                              ? 'text-penn-red'
                              : 'text-[#1e6b38]',
                        ].join(' ')}
                      >
                        {e.pending ? '·' : e.ok === false ? '✗' : '✓'}
                      </span>
                      <span className={e.ok === false ? 'text-penn-red/80' : 'text-ink/55'}>
                        {e.text}
                        {e.pending && '…'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
            const e = item.entry
            if (e.role === 'user') {
              return (
                <div
                  key={e.id}
                  className="animate-rise ml-10 self-end rounded-2xl rounded-br-md bg-penn-blue px-4 py-2.5 text-[0.8125rem] leading-relaxed text-[#f5f7ff] shadow-[var(--shadow-card)]"
                >
                  {e.text}
                </div>
              )
            }
            return (
              <div
                key={e.id}
                className="animate-rise mr-6 self-start rounded-2xl rounded-bl-md border border-hairline bg-paper px-4 py-3 text-[0.8125rem] leading-relaxed text-ink/90 shadow-[var(--shadow-card)]"
              >
                <MarkdownLite text={e.text} />
                {e.pending && (
                  <span className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] animate-pulse rounded bg-penn-blue/60" />
                )}
              </div>
            )
          })}
          {busy && entries[entries.length - 1]?.role === 'user' && (
            <div className="ml-1 flex gap-1" aria-label="Assistant is thinking">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/25"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Composer ── */}
      <form
        className="border-t border-hairline bg-paper/60 px-4 py-3 backdrop-blur-sm"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your plan…"
            className="min-w-0 flex-1 rounded-full border border-hairline bg-paper px-4 py-2.5 text-[0.8125rem] shadow-[inset_0_1px_2px_rgba(22,20,15,0.03)] transition-colors placeholder:text-ink/30 focus:border-penn-blue/50"
            aria-label="Chat message"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              aria-label="Stop"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-penn-red/40 text-[0.625rem] text-penn-red transition-colors hover:bg-penn-red/5"
            >
              ■
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-penn-blue text-[0.9375rem] text-white transition-all duration-150 hover:bg-penn-blue-soft disabled:opacity-30"
            >
              ↑
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
