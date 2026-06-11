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
 * The chat sidekick — right-side sidebar, Linear/Claude conventions:
 * streamed message bubbles, quiet monospace lines for tool activity.
 * Chat is the sidekick, not the main surface.
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

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries, busy])

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
        push({
          role: 'assistant',
          text: `Something went wrong talking to the API: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    } finally {
      if (streamingId.current !== null) {
        patch(streamingId.current, { pending: false })
        streamingId.current = null
      }
      abortRef.current = null
      setBusy(false)
    }
  }

  if (!hasKey) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 p-6">
        <p className="smallcaps">Plan assistant</p>
        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
          Paste an Anthropic API key to enable the plan-review chat. It's stored only in
          this browser, never sent anywhere but Anthropic.
        </p>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="sk-ant-…"
          className="rounded-sm border border-hairline bg-paper px-2.5 py-2 font-mono text-[0.6875rem]"
          aria-label="Anthropic API key"
        />
        <button
          type="button"
          disabled={!keyInput.startsWith('sk-ant-')}
          onClick={() => {
            setStoredApiKey(keyInput)
            setHasKey(true)
          }}
          className="rounded-sm bg-penn-blue py-2 text-[0.8125rem] font-medium text-white transition-colors hover:bg-penn-blue-soft disabled:opacity-40"
        >
          Save key
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div>
          <p className="smallcaps">Plan assistant</p>
          <p className="font-mono text-[0.5625rem] text-ink/35">{CHAT_MODEL}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              history.current = []
              setEntries([])
            }}
            className="text-[0.6875rem] text-ink/45 hover:text-ink"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              setHasKey(false)
              setKeyInput('')
            }}
            className="text-[0.6875rem] text-ink/45 hover:text-ink"
          >
            Key
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-[0.8125rem] leading-relaxed text-ink/50">
              I can review your plan, explain program rules, or dry-run "what if"
              scenarios before anything changes.
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-md border border-hairline bg-paper px-3 py-2 text-left text-[0.78125rem] text-penn-blue transition-colors duration-150 hover:border-penn-blue/40 hover:bg-penn-blue/3"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          {entries.map((e) => {
            if (e.role === 'tool') {
              return (
                <div key={e.id} className="flex items-baseline gap-1.5 font-mono text-[0.625rem] text-ink/40">
                  <span aria-hidden>{e.pending ? '·' : e.ok === false ? '✗' : '✓'}</span>
                  <span className={e.ok === false ? 'text-penn-red/70' : ''}>{e.text}</span>
                  {e.pending && <span className="animate-pulse">…</span>}
                </div>
              )
            }
            if (e.role === 'user') {
              return (
                <div
                  key={e.id}
                  className="ml-10 self-end rounded-xl rounded-br-sm bg-penn-blue px-3.5 py-2 text-[0.8125rem] leading-relaxed text-white"
                >
                  {e.text}
                </div>
              )
            }
            return (
              <div
                key={e.id}
                className="mr-6 self-start rounded-xl rounded-bl-sm border border-hairline bg-paper px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-ink/90 shadow-[var(--shadow-card)]"
              >
                <MarkdownLite text={e.text} />
                {e.pending && <span className="animate-pulse text-ink/40">▍</span>}
              </div>
            )
          })}
          {busy && entries[entries.length - 1]?.role === 'user' && (
            <div className="text-[0.6875rem] text-ink/40">thinking…</div>
          )}
        </div>
      </div>

      <form
        className="flex gap-2 border-t border-hairline p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your plan…"
          className="min-w-0 flex-1 rounded-sm border border-hairline bg-paper px-2.5 py-2 text-[0.8125rem] placeholder:text-ink/30"
          aria-label="Chat message"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded-sm border border-penn-red/40 px-3.5 py-2 text-[0.78125rem] font-medium text-penn-red transition-colors hover:bg-penn-red/5"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-sm bg-penn-blue px-3.5 py-2 text-[0.78125rem] font-medium text-white transition-colors hover:bg-penn-blue-soft disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  )
}
