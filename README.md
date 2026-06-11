# VIPER Four-Year Planner

A four-year academic planning tool for Penn VIPER dual-degree students (BA + BSE). Students lay out courses across eight semesters plus summer research terms, track requirement fulfillment, share plans with advisors via link, and use an AI sidekick for plan review and "what if" scenarios. An admin mode (`?mode=admin`) adds the NCC policy sandbox used for curriculum-reduction advocacy.

> VIPER Planner is a student-built tool, not an official University of Pennsylvania application.

## Development

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # 522 tests: scheduler 420-combo regression, NCC math, plan core, LLM tools
npm run build      # production build
```

Read `CLAUDE.md` before changing anything — it carries the program rules, settled architecture decisions, and the regression requirements. The old app's source lives in `references/old-app/` as read-only ground truth.

## Architecture

```
src/
  data/        Course catalog, majors, requirements (ported verbatim — don't re-research)
  scheduler/   12-stage seed-plan pipeline (420 major-combo regression in scheduler.test.ts)
  ncc/         NCC workload math: policy vs in-term CU, strategy toggles
  plan/        Plan types, mutation API (UI and LLM share it), augment, serialization
  llm/         Anthropic chat: tools mirror the mutation API, prompt caching, plan digest
  ui/          React components (registrar-ledger design system), plan store
  utils/       Share-link codec (old-app compatible), storage, PCR links
api/
  anthropic/   Vercel edge proxy — injects the API key server-side
```

## Deploying (Vercel)

1. Push this repo to GitHub and import it in Vercel (framework preset: Vite).
2. Project → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` — the pilot key (server-side only; never shipped to browsers)
   - `VITE_LLM_PROXY` = `1` — tells the build to route chat through `/api/anthropic`
3. Deploy. Students get the chat with no key setup; share links work immediately.

Local dev keeps direct mode: paste a key into the chat panel (stored in that browser's localStorage only).

## Maintainer

Arjun Sharma, VIPER '28. See `CLAUDE.md` § Maintainer contact.
