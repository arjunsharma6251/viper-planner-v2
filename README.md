# VIPER Four-Year Planner

A four-year academic planning tool for Penn VIPER dual-degree students (BA + BSE). Students lay out courses across eight semesters plus summer research terms, track requirement fulfillment, share plans with advisors via link, and use an AI sidekick for plan review and "what if" scenarios. An admin mode (`?mode=admin`) adds the NCC policy sandbox used for curriculum-reduction advocacy.

> VIPER Planner is a student-built tool, not an official University of Pennsylvania application.

## What it models

- **Two College curricula.** The Class of 2028 and later seed under the New College Curriculum (six Foundations plus a 12 + 5 + 3 distribution); earlier classes under the old core (Foundational Approaches and Sectors). The mode follows graduation year and can be overridden in setup.
- **Confirmed VIPER policy only in student views.** The sole approved overlap is VIPR 1200/1210 satisfying the First-Year Seminar. Every other waiver or double-count lives in the admin sandbox as a proposal.
- **SEAS general electives (7 CU)** with the per-major split from the Penn catalog, plus the catalog's "X or Y" core alternatives offered as swaps in a course's detail modal.
- **Penn load rules:** a 5.5 CU hard cap on the first semester (enforced by the seed and flagged in red), 6.5 CU dual overload, 7.5 CU hard cap. Advisor notes list what needs a change or a form, and print with the plan.
- **Incoming credit** grouped as AP/IB/A-level exams, Penn credit and placement exams, and waivers, per Penn Admissions' pre-college credit policy.

## Development

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # 1,300+ tests: 420-combo seed regressions (old core + NCC), first-semester cap, NCC math, plan core, audit, LLM tools
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
  ui/          React components (one-line-diagram design system, see DESIGN.md), plan store
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
