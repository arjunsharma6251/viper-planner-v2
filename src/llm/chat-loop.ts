import type Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages'
import { CHAT_MODEL } from './client'
import {
  buildToolDefinitions,
  describeToolCall,
  executeTool,
  type PlanToolContext,
} from './tools'
import { STUDENT_SYSTEM_PROMPT } from './prompts/student'
import { ADMIN_SYSTEM_PROMPT } from './prompts/admin'

export type ChatTurnEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'text_done'; text: string }
  | { type: 'tool_call'; toolName: string; label: string }
  | { type: 'tool_result'; toolName: string; ok: boolean }

/**
 * Run one user turn through the tool-use loop: stream the response, execute
 * any tool calls against the plan store, feed results back, repeat until
 * the model stops. Text streams to the UI as it arrives (Doherty —
 * feedback starts instantly even when the full turn takes seconds).
 *
 * The plan state is refreshed into the system prompt each turn — the model
 * never works from a stale snapshot.
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
  const system = [
    mode === 'admin' ? ADMIN_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT,
    `\n\n## Current plan state (refreshed this turn)\n${JSON.stringify(ctx.getPlan())}`,
  ].join('')
  const tools = buildToolDefinitions()

  for (let round = 0; round < maxToolRounds; round++) {
    const stream = client.messages.stream(
      {
        model: CHAT_MODEL,
        max_tokens: 4096,
        system,
        tools,
        messages,
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
