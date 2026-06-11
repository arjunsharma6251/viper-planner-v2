/**
 * Thin Anthropic proxy (Vercel Edge Function).
 *
 * The browser SDK points its baseURL at /api/anthropic; this forwards the
 * request to api.anthropic.com and injects the real API key from the
 * ANTHROPIC_API_KEY environment variable — the key is never shipped in the
 * bundle or stored client-side (CLAUDE.md "LLM costs"). Streaming (SSE)
 * passes through untouched.
 *
 * Vercel setup: set ANTHROPIC_API_KEY (server env) and VITE_LLM_PROXY=1
 * (build env) on the project.
 */
export const config = { runtime: 'edge' }

const UPSTREAM = 'https://api.anthropic.com'

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Proxy not configured: ANTHROPIC_API_KEY missing' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/anthropic/, '')
  // Only the Messages API is exposed — this proxy exists for the chat
  // sidekick, not as a general Anthropic gateway.
  if (!path.startsWith('/v1/messages')) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  const headers: Record<string, string> = {
    'content-type': req.headers.get('content-type') ?? 'application/json',
    'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
    'x-api-key': apiKey,
  }
  const beta = req.headers.get('anthropic-beta')
  if (beta) headers['anthropic-beta'] = beta

  const upstream = await fetch(`${UPSTREAM}${path}${url.search}`, {
    method: req.method,
    headers,
    body: req.body,
    // Required by the fetch spec when forwarding a streaming request body.
    // @ts-expect-error - duplex is not yet in the TS lib dom types
    duplex: 'half',
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  })
}
