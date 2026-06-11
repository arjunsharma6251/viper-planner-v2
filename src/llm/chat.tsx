import { useRef, useState } from 'react'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient, getStoredApiKey, setStoredApiKey } from './client'
import { runChatTurn } from './chat-loop'
import type { PlanToolContext } from './tools'

interface DisplayEntry {
  id: number
  role: 'user' | 'assistant' | 'tool'
  text: string
  pending?: boolean
}

export interface ChatPanelProps {
  mode: 'student' | 'admin'
  ctx: PlanToolContext
}

/**
 * The chat sidekick — right-side sidebar, Linear/Claude conventions:
 * message bubbles, monospace lines for tool calls. Chat is the sidekick,
 * not the main surface.
 */
export function ChatPanel({ mode, ctx }: ChatPanelProps) {
  const [entries, setEntries] = useState<DisplayEntry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasKey, setHasKey] = useState(() => !!getStoredApiKey())
  const [keyInput, setKeyInput] = useState('')
  const history = useRef<MessageParam[]>([])
  const nextId = useRef(1)

  function push(entry: Omit<DisplayEntry, 'id'>) {
    setEntries((es) => [...es, { ...entry, id: nextId.current++ }])
  }

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const client = createClient()
    if (!client) return
    setInput('')
    push({ role: 'user', text })
    setBusy(true)
    history.current.push({ role: 'user', content: text })
    try {
      history.current = await runChatTurn(client, {
        mode,
        history: history.current,
        ctx,
        onEvent: (event) => {
          if (event.type === 'text' && event.text) {
            push({ role: 'assistant', text: event.text })
          } else if (event.type === 'tool_call') {
            push({ role: 'tool', text: `→ ${event.toolName}`, pending: true })
          } else if (event.type === 'tool_result') {
            push({ role: 'tool', text: `← ${event.toolName} ${event.toolOk ? '✓' : '✗'}` })
          }
        },
      })
    } catch (err) {
      push({
        role: 'assistant',
        text: `Something went wrong talking to the API: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setBusy(false)
    }
  }

  if (!hasKey) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-4">
        <p className="text-sm text-ink/70">
          Paste an Anthropic API key to enable the plan-review chat. Stored only in this
          browser.
        </p>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="sk-ant-…"
          className="rounded-md border border-hairline px-2 py-1.5 font-mono text-xs"
          aria-label="Anthropic API key"
        />
        <button
          type="button"
          disabled={!keyInput.startsWith('sk-ant-')}
          onClick={() => {
            setStoredApiKey(keyInput)
            setHasKey(true)
          }}
          className="rounded-md bg-penn-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Save key
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 && (
          <p className="text-sm text-ink/50">
            Ask me to review your plan, or try a what-if: "What if I switch from CBE to
            MSE?"
          </p>
        )}
        <div className="flex flex-col gap-2">
          {entries.map((e) => {
            if (e.role === 'tool') {
              return (
                <div key={e.id} className="font-mono text-[0.6875rem] text-ink/40">
                  {e.text}
                  {e.pending && '…'}
                </div>
              )
            }
            return (
              <div
                key={e.id}
                className={
                  e.role === 'user'
                    ? 'ml-8 self-end rounded-xl bg-penn-blue px-3 py-2 text-sm text-white'
                    : 'mr-8 self-start rounded-xl bg-white px-3 py-2 text-sm shadow-sm'
                }
              >
                {e.text}
              </div>
            )
          })}
          {busy && <div className="text-xs text-ink/40">thinking…</div>}
        </div>
      </div>
      <form
        className="flex gap-2 border-t border-hairline p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your plan…"
          className="min-w-0 flex-1 rounded-md border border-hairline px-2 py-1.5 text-sm"
          aria-label="Chat message"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-penn-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
