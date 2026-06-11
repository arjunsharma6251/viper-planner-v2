import type Anthropic from '@anthropic-ai/sdk'
import type {
  ContentBlock,
  MessageParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages'
import { CHAT_MODEL } from './client'
import {
  buildToolDefinitions,
  describeToolCall,
  executeTool,
  type PlanToolContext,
} from './tools'
import { buildPlanContext } from './plan-context'
import { STUDENT_SYSTEM_PROMPT } from './prompts/student'
import { ADMIN_SYSTEM_PROMPT } from './prompts/admin'

export type ChatTurnEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'text_done'; text: string }
  | { type: 'tool_call'; toolName: string; label: string }
  | { type: 'tool_result'; toolName: string; ok: boolean }

/**
 * Token economics (see CLAUDE.md → LLM cost conventions):
 * - tools + system are FROZEN and carry a cache_control breakpoint — repeat
 *   turns read that prefix at ~10% of input price. Never interpolate
 *   anything volatile (plan state, timestamps) into the system prompt.
 * - The plan digest (compact, ~1-2K tokens vs ~15K raw JSON) is injected
 *   into the USER turn, after the cached prefix.
 * - A send-time breakpoint on the last message block caches conversation
 *   history incrementally across turns and tool rounds.
 */

/** Clone messages, adding a cache breakpoint to the final content block. */
function withHistoryBreakpoint(messages: MessageParam[]): MessageParam[] {
  if (messages.length === 0) return messages
  const out = [...messages]
  const last = out[out.length - 1]
  if (!last) return messages
  if (typeof last.content === 'string') {
    out[out.length - 1] = {
      ...last,
      content: [
        { type: 'text', text: last.content, cache_control: { type: 'ephemeral' } },
      ],
    }
  } else if (Array.isArray(last.content) && last.content.length > 0) {
    const blocks = [...last.content]
    const lastBlock = blocks[blocks.length - 1]
    if (
      lastBlock &&
      (lastBlock.type === 'text' || lastBlock.type === 'tool_result')
    ) {
      blocks[blocks.length - 1] = {
        ...lastBlock,
        cache_control: { type: 'ephemeral' },
      }
      out[out.length - 1] = { ...last, content: blocks }
    }
  }
  return out
}

/**
 * Run one user turn through the tool-use loop: stream the response, execute
 * any tool calls against the plan store, feed results back, repeat until
 * the model stops. Text streams to the UI as it arrives.
 */
export async function runChatTurn(
  client: Anthropic,
  options: {
    mode: 'student' | 'admin'
    history: MessageParam[]
    ctx: PlanToolContext
    onEvent?: (event: ChatTurnEvent) => void
    signal?: AbortSignal
    maxToolRounds?: number
  },
): Promise<MessageParam[]> {
  const { mode, ctx, onEvent, signal, maxToolRounds = 12 } = options
  const messages: MessageParam[] = [...options.history]

  // Frozen, cacheable prefix: tools render first, then this single system
  // block; the breakpoint here caches both together.
  const system: TextBlockParam[] = [
    {
      type: 'text',
      text: mode === 'admin' ? ADMIN_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' },
    },
  ]
  const tools = buildToolDefinitions()

  // Inject the fresh plan digest into the NEW user turn (volatile content
  // goes after the cached prefix, never into system). The digest is stored
  // in history so earlier turns' prefixes stay byte-stable.
  const last = messages[messages.length - 1]
  if (last && last.role === 'user' && typeof last.content === 'string') {
    messages[messages.length - 1] = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `<plan-state>\n${buildPlanContext(ctx.getPlan())}\n</plan-state>`,
        },
        { type: 'text', text: last.content },
      ],
    }
  }

  for (let round = 0; round < maxToolRounds; round++) {
    const stream = client.messages.stream(
      {
        model: CHAT_MODEL,
        max_tokens: 4096,
        system,
        tools,
        messages: withHistoryBreakpoint(messages),
      },
      { signal },
    )
    stream.on('text', (delta) => onEvent?.({ type: 'text_delta', text: delta }))
    const response = await stream.finalMessage()

    messages.push({ role: 'assistant', content: response.content })
    for (const block of response.content) {
      if (block.type === 'text') onEvent?.({ type: 'text_done', text: block.text })
    }

    const toolUses = response.content.filter(
      (block): block is Extract<ContentBlock, { type: 'tool_use' }> =>
        block.type === 'tool_use',
    )
    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break

    const results = toolUses.map((use) => {
      onEvent?.({
        type: 'tool_call',
        toolName: use.name,
        label: describeToolCall(use.name, use.input),
      })
      const outcome = executeTool(ctx, use.name, use.input)
      onEvent?.({ type: 'tool_result', toolName: use.name, ok: outcome.ok })
      return {
        type: 'tool_result' as const,
        tool_use_id: use.id,
        content: JSON.stringify(outcome.result),
        is_error: !outcome.ok,
      }
    })
    messages.push({ role: 'user', content: results })
  }

  return messages
}
