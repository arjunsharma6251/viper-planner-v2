/**
 * Thin Anthropic proxy (Vercel Edge Function).
 *
 * The browser SDK points its baseURL at /api/anthropic and appends
 * /v1/messages — this file IS that route (static file-system routing;
 * catch-all [...path] segments are Next.js-only and 404 on plain Vercel
 * functions). It forwards to api.anthropic.com and injects the real key
 * from the ANTHROPIC_API_KEY env var — the key is never shipped in the
 * bundle or stored client-side (CLAUDE.md "LLM costs"). Streaming (SSE)
 * passes through untouched.
 *
 * Vercel setup: ANTHROPIC_API_KEY (server env) + VITE_LLM_PROXY=1 (build env).
 */
export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Proxy not configured: ANTHROPIC_API_KEY missing' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  const headers: Record<string, string> = {
    'content-type': req.headers.get('content-type') ?? 'application/json',
    'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
    'x-api-key': apiKey,
  }
  const beta = req.headers.get('anthropic-beta')
  if (beta) headers['anthropic-beta'] = beta

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
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
