# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**VIPER students planning their own four years** (primary editor). Penn undergraduates in the Vagelos Integrated Program in Energy Research, a BA + BSE dual degree with an energy concentration and three summer research arcs. Roughly 25 students per class year; the pilot audience is ~10 classmates in VIPER '28 plus the maintainer. They arrive with a College major, an Engineering major, incoming AP/IB/exam credit, and a graduation year, and need a valid eight-semester plan they can keep editing as reality changes. They are heavy users of Penn Course Review and expect every course code to link there.

**Advisors reading a shared plan** (co-equal with student editing, confirmed 2026-09-13). The VIPER program director, Michelle Hutchings, reviews any student's plan from a share link with no login. The link view is the moment the plan is judged: it must read cleanly, print cleanly, and carry the advisor notes (what needs a form, what is over cap) without the student present to explain.

**Program and LSM staff using the admin sandbox** (secondary). Staff working on curriculum policy open admin mode (`?mode=admin`) to model which combinations of New College Curriculum waivers reduce the non-major load enough for VIPER to fit in four years. Hidden from students because it is meaningless outside those meetings.

## Product Purpose

A four-year academic planner that produces a correct starting plan for any of the 420 supported major/concentration combinations, then gets out of the way while the student edits it directly. It shows what each course satisfies across both degrees, flags Penn load rules, and lets an advisor see the whole plan from a link. An AI sidekick reviews the plan and runs "what if" scenarios through the same mutation API the UI uses.

Status (confirmed 2026-09-13): live at https://viper-planner-v2.vercel.app and in use by VIPER '28 classmates and the program director.

Success means: a student's plan is accurate against Penn's actual program rules, the advisor can trust what the link shows, and the sandbox gives staff a defensible number for the policy case. Accuracy on program rules is the product's value; a silent wrong rule is worse than a missing feature.

## Positioning

The only planner that models the VIPER dual degree as Penn actually administers it: both curricula (old core and the New College Curriculum, chosen by graduation year), the SEAS per-major general-elective split from the catalog, the first-semester 5.5 CU hard cap, summer-vs-in-term credit semantics, cross-degree overlap versus within-degree double-count, and only the VIPER overlaps the College has confirmed. Generic degree planners and Penn's own audit tools do none of this, and the previous single-file version of this app accumulated months of correctness fixes from real conversations with the program director that this version ports verbatim.

The share link works without any account and is the feature the director values most. Keeping that true without auth is a deliberate position, not a gap.

## Operating Context

- **Two modes, one app.** Student mode is the default; admin mode is URL-gated and persisted in localStorage. Admin adds the NCC sandbox (strategy toggles, workload metric, 12+0 toggle, NCC vs OCC comparison, VIPER-to-NCC translation panel, distribution profile controls) and a policy-aware chat prompt.
- **Plan lifecycle.** Setup (majors, concentrations, incoming credit, graduation year, curriculum mode) seeds a plan once via the 12-stage scheduler. After that the student owns every move; nothing auto-rearranges. Undo snapshots each change. Plans persist in localStorage only; share links encode the plan in the URL fragment and stay compatible with the old app's links.
- **Time structure.** Four years, each Fall | Spring | Summer. VIPR 1300 is pre-placed in all three summers; Summer Y1 is locked, Y2 and Y3 deletable. Year 4's third slot is Commencement.
- **Advisor moments.** Share link, print view, and the advisor notes panel (live constraint checks that print with the plan). Export to JSON and CSV also exists.
- **AI sidekick.** Anthropic chat (Sonnet, prompt-cached) behind a Vercel edge proxy in production; direct-key mode in local dev. Tools mirror the UI mutation API; it simulates before applying and asks before committing. It is a sidekick, not the main surface, and never builds a plan from scratch.
- **Reference material.** Penn Course Review is the student's first reference for any course. Reference panels cover VIPER program rules and common double-counts. NCC policy comes from the College's summary chart and the program director; SEAS catalog data was read from catalog.upenn.edu (Fall 2026 entrants).
- **Policy advocacy ritual.** The director's framing: VIPER's non-major load must drop 4 to 6 CU to survive in four years. The sandbox exists to model which LSM-approved waivers get there. Under confirmed policy, 140 of 420 combinations seed with a semester above 7.5 CU (40 under the old core); that gap is the advocacy case.

## Capabilities and Constraints

Confirmed functionality (see README and CLAUDE.md for the full inventory): plan editing by direct manipulation (add, remove, move, reorder, rename, tag, color, swap), major and concentration selection, incoming-credit picker grouped per Penn Admissions, graduation-year and curriculum-mode selection, requirement trackers and the NCC audit, course detail modal with PCR link and catalog alternatives, reference panels, advisor notes, focus view, chat, export, share link, print.

Durable constraints:

- **The user owns the plan.** No background process moves courses. The scheduler runs once as a seed and is then silent.
- **Policy CU and in-term CU stay distinct** everywhere CU is shown in admin mode. Summer courses count toward policy, not in-term.
- **The 14 CU NCC baseline is fixed.** Toggles show progress against it, never change it.
- **Only confirmed VIPER policy appears in student views.** The sole approved overlap is VIPR 1200/1210 satisfying the First-Year Seminar. Every other waiver lives in the sandbox as a proposal and must never look granted to a student.
- **Penn load rules:** 5.5 CU first-semester hard cap (red), 6.5 CU dual overload, 7.5 CU hard cap; summers use different thresholds.
- **No auth, no backend state.** LocalStorage plus URL-fragment share links. PennKey is deferred until a separate reason needs a backend.
- **Course data is not re-researched.** The catalog, majors, requirements, and credit tables were cross-referenced over months; never invent course codes.
- **Terminology.** CU = credit unit. Overlap = counts toward both BA and BSE (gold stars). Double-count = multiple requirements within one degree (red stars). Triple-count = three stars; silent below two. Foundations, distribution 12+5+3, OCC vs NCC, Perspectives and Difference (not "P&D" in UI).
- **Stack is settled:** React + Vite + TypeScript strict, Tailwind with a thin Penn token layer, Vitest (1,377+ tests including 420-combo seed regressions), Vercel hosting with Git auto-deploy.

Explicitly undecided or ask-first (per CLAUDE.md): current state of LSM negotiations on any NCC waiver; branding strictness beyond "student-built, Penn-flavored"; new concentrations; anything touching LLM cost limits.

## Brand Commitments

- **Name:** VIPER Four-Year Planner (short: VIPER Planner). Positioned as "a student-built tool, not an official University of Pennsylvania application"; that disclaimer is required.
- **Goal look:** "looks like an official Penn app" while never claiming endorsement. Institutional, not startup. No Penn shield (licensed). Penn wordmark only as a tagline, no invented logo.
- **Official Penn colors are binding:** Penn Red `#990000` (PMS 201) as a sparing signal for accents, warnings, and key data; Penn Blue `#011F5B` (PMS 288) as the primary actionable color; cream background `#FAF8F4`; near-black ink `#1A1A1A`; hairline neutrals `#E8E4DC`. Status colors green/gold/Penn red mean good/caution/problem and are never re-purposed.
- **Type stack in use:** Fraunces (display serif standing in for Caslon), Inter (UI), JetBrains Mono (course codes and CU values). Tokens live in `src/ui/branding/penn-tokens.ts` and the `@theme` block in `src/index.css`.
- **Voice:** precise and institutional. Hard rules stated as rules, soft preferences as preferences. Chat cites PCR for course opinions.
- **Behavioral commitments** recorded in CLAUDE.md § UX principles: direct manipulation over forms, optimistic updates, a UI the user does not notice.

## Evidence on Hand

- The running product itself, the 1,377-test suite, and the old app snapshot at `references/old-app/index.html` as behavioral ground truth.
- One hard number from the seed regression: 140 of 420 combinations exceed 7.5 CU in some semester under confirmed NCC policy, versus 40 under the old core.
- Source documents: the College's NCC summary chart (policy confirmed with the maintainer 2026-09-11) and SEAS catalog pages read 2026-09-11.

Absences, confirmed 2026-09-13: no quotable advisor testimonials, no usage numbers, no student plans cleared as demo content, no University endorsement or licensing. Future surfaces must not fabricate any of these. The director's stated preference for the share link is a paraphrase, not a quote.

## Product Principles

1. **Accuracy is the product.** A rule shown wrong, or a proposal shown as granted, is a worse failure than a missing feature. Ask before assuming any Penn or VIPER policy.
2. **The plan belongs to the student.** Seed once, then only the student (or the sidekick, with confirmation) moves anything.
3. **The link view is a first-class surface.** Whatever a student can see, an advisor can read from the link and on paper, unattended.
4. **Confirmed truth for students, proposals for staff.** Student and admin views draw from different policy sets by design; never let sandbox assumptions leak into student surfaces.
5. **Penn-flavored, student-built.** Institutional restraint and official colors, always with the disclaimer and never with the shield.

## Accessibility & Inclusion

Requirements, not aspirations (CLAUDE.md § Accessibility): color is never the only signal; every interactive element is keyboard-reachable in logical order; visible focus indicators (Penn blue, 2px outline, 2px offset); WCAG AA text contrast (4.5:1), re-checked for any new color pairing; drag-and-drop has a keyboard alternative via the course detail modal; modals trap and restore focus; icon-only buttons carry accessible labels. Print output is part of the accessible surface because advisors read plans on paper.
