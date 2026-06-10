import type Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages'
import { CHAT_MODEL } from './client'
import { buildToolDefinitions, executeTool, type PlanToolContext } from './tools'
import { STUDENT_SYSTEM_PROMPT } from './prompts/student'
import { ADMIN_SYSTEM_PROMPT } from './prompts/admin'

export interface ChatTurnEvent {
  type: 'text' | 'tool_call' | 'tool_result'
  text?: string
  toolName?: string
  toolInput?: unknown
  toolOk?: boolean
}

/**
 * Run one user turn through the tool-use loop: send, execute any tool
 * calls against the plan store, feed results back, repeat until the model
 * stops. `onEvent` fires as content arrives so the UI can render
 * optimistically (Doherty: show the "applying…" state instantly).
 *
 * The plan state is refreshed into context each turn via a system suffix —
 * the model never works from a stale snapshot.
 */
export async function runChatTurn(
  client: Anthropic,
  options: {
    mode: 'student' | 'admin'
    history: MessageParam[]
    ctx: PlanToolContext
    onEvent?: (event: ChatTurnEvent) => void
    maxToolRounds?: number
  },
): Promise<MessageParam[]> {
  const { mode, ctx, onEvent, maxToolRounds = 12 } = options
  const messages: MessageParam[] = [...options.history]
  const system = [
    mode === 'admin' ? ADMIN_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT,
    `\n\n## Current plan state (refreshed this turn)\n${JSON.stringify(ctx.getPlan())}`,
  ].join('')
  const tools = buildToolDefinitions()

  for (let round = 0; round < maxToolRounds; round++) {
    const response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 4096,
      system,
      tools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    const toolUses = response.content.filter(
      (block): block is Extract<ContentBlock, { type: 'tool_use' }> =>
        block.type === 'tool_use',
    )
    for (const block of response.content) {
      if (block.type === 'text') onEvent?.({ type: 'text', text: block.text })
    }

    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break

    const results = toolUses.map((use) => {
      onEvent?.({ type: 'tool_call', toolName: use.name, toolInput: use.input })
      const outcome = executeTool(ctx, use.name, use.input)
      onEvent?.({ type: 'tool_result', toolName: use.name, toolOk: outcome.ok })
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
