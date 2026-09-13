import { useEffect, useRef, useState } from 'react'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { CHAT_MODEL, USES_PROXY, chatIsReady, createClient, setStoredApiKey } from './client'
import { runChatTurn } from './chat-loop'
import type { PlanToolContext } from './tools'
import { MarkdownLite } from './MarkdownLite'
import { IconArrowUp, IconCheck, IconChevronRight, IconClose, IconStop } from '../ui/components/icons'

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
    err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined
  if (status === 401)
    return "That API key was rejected. Use **Key** above and re-paste it, and check the key's workspace actually has credits."
  if (status === 429) return 'Rate limited. Give it a few seconds and try again.'
  if (status === 529 || status === 500) return "Anthropic's API is having a moment. Try again shortly."
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
  /** Closes the panel. Rendered as a visible control in the panel header. */
  onClose?: () => void
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null
  return (
    <button type="button" onClick={onClose} aria-label="Close chat" className="btn btn-quiet !px-2">
      <IconClose size={14} />
      <span className="kbd" aria-hidden>
        esc
      </span>
    </button>
  )
}

/**
 * The plan assistant: a log beside the sheet, not a messenger. Tool activity
 * prints as ruled mono lines; prose lands in bordered panels. Chat is the
 * sidekick, not the surface.
 */
export function ChatPanel({ mode, ctx, onClose }: ChatPanelProps) {
  const [entries, setEntries] = useState<DisplayEntry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasKey, setHasKey] = useState(chatIsReady)
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
              setEntries((es) => es.map((e) => (e.id === id ? { ...e, text: e.text + event.text } : e)))
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
              return es.map((e) => (e.id === last.id ? { ...e, pending: false, ok: event.ok } : e))
            })
          }
        },
      })
    } catch (err) {
      if (!abort.signal.aborted) push({ role: 'assistant', text: friendlyError(err) })
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

  const header = (
    <header className="flex items-center justify-between gap-2 border-b border-ink px-4 py-2.5">
      <div className="min-w-0">
        <p className="label !text-ink">Plan assistant</p>
        <p className="tag mt-0.5 !text-[0.625rem] text-ink-3">{CHAT_MODEL}</p>
      </div>
      <div className="flex items-center gap-1">
        {hasKey && (
          <button
            type="button"
            onClick={() => {
              history.current = []
              setEntries([])
            }}
            className="btn btn-quiet !py-2"
          >
            Clear
          </button>
        )}
        {hasKey && !USES_PROXY && (
          <button
            type="button"
            onClick={() => {
              setHasKey(false)
              setKeyInput('')
            }}
            className="btn btn-quiet !py-2"
          >
            Key
          </button>
        )}
        <div className="hidden lg:block">
          <CloseButton onClose={onClose} />
        </div>
      </div>
    </header>
  )

  if (!hasKey) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col justify-center gap-3 px-4">
          <p className="text-[0.8125rem] leading-relaxed text-ink-2">
            Paste an Anthropic API key to enable the plan-review chat. It is stored only in this browser and
            sent nowhere but Anthropic.
          </p>
          <label className="label" htmlFor="api-key">
            API key
          </label>
          <input
            id="api-key"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-ant-…"
            className="field font-mono !text-[0.75rem]"
          />
          <button
            type="button"
            disabled={!keyInput.startsWith('sk-ant-')}
            onClick={() => {
              setStoredApiKey(keyInput)
              setHasKey(true)
            }}
            className="btn btn-primary justify-center"
          >
            Save key
          </button>
        </div>
      </div>
    )
  }

  const items = groupEntries(entries)

  return (
    <div className="flex h-full flex-col">
      {header}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
        {entries.length === 0 && (
          <div className="flex h-full flex-col justify-end gap-2 pb-2">
            <p className="font-cond text-[1.375rem] leading-tight font-semibold tracking-[0.02em] text-ink">
              Ask about your plan.
            </p>
            <p className="mb-2 text-[0.8125rem] leading-relaxed text-ink-2">
              I can review it, explain program rules, or dry-run "what if" scenarios. Nothing changes until you
              confirm.
            </p>
            <div className="border-t border-ink">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="group flex w-full items-center justify-between gap-3 border-b border-rule px-1 py-2.5 text-left text-[0.8125rem] text-ink transition-colors duration-100 hover:bg-tint-blue"
                >
                  <span>{s}</span>
                  <span className="text-ink-3 transition-colors group-hover:text-penn-blue" aria-hidden>
                    <IconChevronRight size={12} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          {items.map((item) => {
            if (item.kind === 'activity') {
              return (
                <div key={item.id} className="fade mr-8 border-l-2 border-rule-2 pl-3">
                  {item.entries.map((e) => (
                    <div key={e.id} className="tag flex items-center gap-2 py-1 !text-[0.625rem]">
                      <span
                        className={[
                          'flex w-3 justify-center',
                          e.pending ? 'animate-pulse text-ink-3' : e.ok === false ? 'text-penn-red' : 'text-good',
                        ].join(' ')}
                        aria-hidden
                      >
                        {e.pending ? '·' : e.ok === false ? <IconClose size={10} /> : <IconCheck size={10} />}
                      </span>
                      <span className={e.ok === false ? 'text-penn-red' : 'text-ink-2'}>
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
                <div key={e.id} className="settle ml-10 self-end bg-ink px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-sheet">
                  {e.text}
                </div>
              )
            }
            return (
              <div key={e.id} className="settle mr-6 self-start border border-rule-2 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink">
                <MarkdownLite text={e.text} />
                {e.pending && <span className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] animate-pulse bg-penn-blue" />}
              </div>
            )
          })}
          {busy && entries[entries.length - 1]?.role === 'user' && (
            <div className="flex gap-1 pl-1" aria-label="Assistant is thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-pulse bg-ink-3" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <form
        className="border-t border-ink px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <div className="flex items-stretch gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your plan…"
            className="field min-w-0 flex-1"
            aria-label="Chat message"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop" className="btn btn-danger !px-2.5">
              <IconStop size={14} />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="btn btn-primary !px-2.5">
              <IconArrowUp size={14} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
