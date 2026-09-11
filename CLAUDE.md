# VIPER Four-Year Planner — Project Context

This file is read every time a new Claude Code session starts. Keep it accurate.
When something here becomes wrong, update it.

---

## What this is

A four-year academic planning tool for Penn VIPER dual-degree students (BA + BSE, with the VIPER energy concentration). The audience is small: ~10 classmates in VIPER '28, the VIPER program director Michelle Hutchings, and LSM staff working on curriculum policy.

Two distinct user modes live in the same app, gated by URL parameter:

- **Student mode** (default) — a planning tool. Students lay out their courses across eight academic semesters plus summer terms, see what requirements they're satisfying, and use the LLM chat to review their plan or run "what if" scenarios.
- **Admin mode** (`?mode=admin` in URL, persisted to localStorage thereafter) — adds the NCC sandbox. This is the policy-advocacy tool used to model what curriculum reductions LSM might approve. It is intentionally hidden from students because it's confusing if you're not in those meetings.

The maintainer is Arjun Sharma (VIPER '28, CHEM BA + CBE BSE). When the doc says "the user" it means a student using the app. When it says "Arjun" or "the maintainer" it means the project owner.

---

## Non-negotiable principles

1. **The user owns the plan.** No background process moves their courses. Edits are direct mutations of the plan state. Anything that auto-rearranges is wrong.
2. **The scheduler runs once, as a seed generator.** It builds a starting plan when the student first picks majors. After that, the scheduler is silent.
3. **Two CU concepts must stay distinct: policy CU and in-term CU.** A course in summer counts toward policy (graduation requirements) but not in-term (academic-year burden). This split exists everywhere CU is shown in admin mode.
4. **The 14 CU baseline is fixed.** It represents the unreduced NCC policy (6 Foundations + 5+3 distribution). Toggles do not change the baseline; they show progress against it.
5. **Apple-clean design, Penn-branded surface.** Whitespace, typographic hierarchy, no chrome that doesn't earn its place. See the Branding section below.
6. **The share link is the killer feature.** Michelle's favorite thing about the current app is being able to view any student's plan from a link. This must keep working without auth.

---

## Architecture decisions (settled — do not re-litigate)

| Decision | Choice | Why |
|---|---|---|
| Framework | React + Vite + TypeScript | Familiar, fast builds, types catch LLM tool-call mistakes |
| Hosting | Vercel | Easy preview deploys, edge functions if needed later for LLM proxy |
| State persistence | LocalStorage only | Pilot scale; backend deferred |
| Cross-device sharing | URL fragment (existing share-link model) | Works without backend |
| Auth | None for v1 | PennKey OAuth deferred — see "Auth: why not now" below |
| LLM integration | Tool-calling from day one (Anthropic API) | "What if" requires modify-and-readback; tools are the right shape |
| LLM provider | Anthropic, Sonnet for chat | Arjun is paying via own API key for pilot |
| Styling | Tailwind + a thin Penn design tokens layer | Tailwind for productivity, Penn tokens for identity |
| Type strictness | TypeScript strict mode, no `any` | LLM tool calls must be type-safe |
| Admin gate | URL param `?mode=admin`, persisted to localStorage | No password — security theater for client-side gates |

### Auth: why not now

PennKey OAuth requires:
- A backend server (cannot do OAuth flow from static site)
- Emailing Penn Labs and requesting OAuth client registration
- Handling Shibboleth-backed sessions

For a 10-student pilot where the use cases are "view my own plan" and "share my plan with my advisor via link," none of that machinery is needed. Defer PennKey until there's a separate reason to need a backend (cross-device sync, server-side LLM proxy, multi-user admin features). At that point adding PennKey is small marginal cost. Trying to add it now is months of plumbing for an identity badge.

### LLM costs

Anthropic API key (Sonnet) used directly from the browser for now. **This will change.** Plan to move LLM calls behind a thin proxy on Vercel edge functions before pilot launches, so the API key is never shipped in the bundle. The proxy can be five lines of code — just forward the request. But it needs to exist before real users touch this.

**Token-cost conventions (implemented in `src/llm/chat-loop.ts` — keep these invariants):**

1. **The system prompt is frozen and cached.** Tools + the static system block carry a `cache_control` breakpoint; repeat turns read that prefix at ~10% of input price. Never interpolate anything volatile (plan state, dates, mode flags) into the system prompt — one changed byte invalidates the whole cache.
2. **Plan state goes in the user turn as a compact digest**, not in system, and never as raw `JSON.stringify(plan)`. `buildPlanContext()` (src/llm/plan-context.ts) renders ~1-2K tokens vs ~15K for the raw plan; the model calls `get_plan` / `get_course_info` when it needs full detail. The digest is stored in history so earlier turns stay byte-stable for caching.
3. **Conversation history is cached incrementally** — a send-time breakpoint on the final message block, added per-request (never persisted into history).
4. Model is `claude-sonnet-4-6` (settled decision). Haiku 4.5 is the cheap fallback if pilot costs surprise; change `CHAT_MODEL` in src/llm/client.ts only.

---

## What to port from the old app (and what to leave behind)

The previous version lives at `arjunsharma6251.github.io/<repo>`, source in a separate repo. ~6,200 lines, single HTML file. Many subtle correctness fixes accumulated over months of iteration. **Port these verbatim:**

### Reference materials in this repo

The old app's source is committed to this repo as a reference snapshot:

```
references/
  old-app/
    index.html                  // The final built artifact, ~290 KB
    src/                        // The six source modules pre-concat
      01-shell.html
      02-data.jsx
      03-scheduler.jsx
      04-components.jsx
      05-app.jsx
      06-ncc.jsx
    NOTES.md                    // Session-by-session decisions and gotchas
```

This directory is **read-only reference**, never built or deployed. When a behavior in the new build feels wrong, the old source is the ground truth — there are dozens of small judgment calls (why a default is `false`, why a warning is gold not red, why a tag appears in this state but not that one) that exist in the old code but not in this CLAUDE.md.

Default to checking the old source before re-deriving from first principles. The old app had hundreds of fixes for specific edge cases; recreating from scratch will rediscover those bugs painfully. Workflow when implementing a feature:

1. Search `references/old-app/src/` for the analogous code
2. Read it, understand what it does and *why* (look at comments)
3. Reimplement in TypeScript with the same semantics
4. If the old code is doing something that looks weird, assume there's a reason — ask before "simplifying" it away


### Logic to port

- **The scheduler** (`03-scheduler.jsx` in old repo). Twelve-stage pipeline that builds a valid 4-year plan for any of 420 supported major+concentration combinations. Hard-won correctness. Reimplement in TypeScript but do not redesign the algorithm.
- **NCC math** (`computeNCCWorkload`, `computeSEASGenElectives` in old `06-ncc.jsx`). The policy-vs-in-term split, the Foundation status (`waived`/`summer`/`in-term`), the distribution computation, the strategy toggle behaviors.
- **Course catalog** (`COURSES`, `MAJORS`, `VIPER_PROGRAM`, `AP_CREDITS`, `GENED_POOL`, `GENED_SLOTS`, `FA_REQUIREMENTS`, `SECTORS`, `ENERGY_COURSES`, `COMMON_DOUBLE_COUNTS` in old `02-data.jsx`). The data itself is months of cross-referencing against Penn's actual course catalog. Don't redo the research.
- **Penn Course Review URL helper.** PCR is the student's first reference for any course. Every course code needs a clickable PCR link.
- **Multi-star double-count / overlap indicator.** Gold stars for cross-degree overlap (BA+BSE), red stars for within-degree double-count. Cap at 3. Silent under 2.
- **`augmentPlan` function.** Takes the raw plan, computes requirement counts, overlap kinds, fulfillment intent. Same pattern in new architecture.

### Logic to leave behind

- **The single-HTML build system.** Six files concatenated into one HTML via a Python script, served from GitHub Pages, with `<script type="text/babel">` for in-browser JSX transform. This was clever but slow and fragile. Vite gets you a proper build.
- **The IIFE-wrapped modules.** Not needed with ES modules.
- **Loose object types.** Define proper TypeScript types for `Course`, `Plan`, `Semester`, `Mutation`, `WorkloadResult`, etc.
- **In-line styling everywhere.** Tailwind + Penn tokens.

---

## Domain knowledge (Penn VIPER specifics that take a while to learn)

### What VIPER is

Vagelos Integrated Program in Energy Research. Eight-semester dual-degree (BA + BSE) with three required summer research arcs. Roughly 25 students per class year. Students complete:
- One major in the College (SAS) → BA, 36 CU
- One major in Engineering (SEAS) → BSE, 40 CU
- 3 energy-designated courses
- VIPR 1200, 1210, 1300×N program courses
- Summer research (Y1 mandatory, Y2 typical, Y3 sometimes)

The College and Engineering have different gen-ed requirements. SAS uses either OCC (the older "old core curriculum") or NCC (the new core curriculum being phased in). For VIPER '28 and later, NCC is the relevant one.

### OCC vs NCC

**OCC** (old curriculum, mainly relevant for older students or specific BA tracks): organized around Foundational Approaches (FA) and Sectors (I–VII). Validation passes when every FA and every Sector has at least one course satisfying it.

**NCC** (new curriculum) — confirmed with Arjun 2026-09-11 from the College's own summary chart:

- **Foundations (6):** Kite, Key, First-Year Seminar, Perspectives and Difference, Language, Critical Writing. Each is 1 CU except Language, which is 0–2 CU depending on placement. First-Year Seminar and Perspectives and Difference *may be counted within the distribution requirements* (official policy, not a VIPER ask).
- **Distribution: 12 + 5 + 3** across the three divisions (Humanities & the Arts, Natural Sciences, Social Sciences). Division I (12 CU, "likely basis for major", 12–20 CU) is the major's own division — Natural Sciences for every VIPER College major, so it is covered by major work. The 5 and the 3 go to the other two divisions **in either order**; do not hardcode SS = 5, H = 3 as a rule (it is only the default targets object the sandbox starts from).
- **Electives:** 11–13+ CU. **BA total: 36+ CU.**
- **Approved VIPER overlap (the only one):** VIPR 1200/1210 count as the First-Year Seminar. Every other modification in the sandbox (Key via VIPR 1210, Language waiver, P&D via VIPR 1300, Kite waivers/lab, Kite/Writing/VIPR 1300 double-counts, A&S 3 CU waiver) **needs committee approval** and must not appear as granted in anything a student sees. `CONFIRMED_VIPER_MODS` in `src/ncc/mods.ts` encodes this; student-facing code uses it, the sandbox uses `DEFAULT_VIPER_MODS` (the current proposal).
- **SEAS general electives: 7 CU**, unchanged by NCC. 1 is the Writing seminar (the College's Critical Writing), 1 is Engineering ethics (VIPR 1200/1210), and the remaining 5 are SS / H / TBS courses whose split depends on the engineering major. Per-major split and the catalog's "X or Y" core alternatives live in `src/data/seas-catalog.ts`, read from catalog.upenn.edu on 2026-09-11 (CBE/MSE/ESE/CIS: 4 SS-or-H incl. Writing + 2 SS/H/TBS; MEAM: 1 SS + 2 H incl. Writing + 1 SS-or-H + 2 SS/H/TBS). Caveat: those catalog pages describe Fall 2026 entrants; `majors.ts` core lists stay as the entry-year requirement sheets, and alternatives are offered as swaps in the course detail modal, never forced.

For VIPER specifically, the NCC math is heavier than the major requirements can absorb, which is the whole reason for the policy-advocacy work the sandbox supports.

### The NCC reduction goal

Michelle Hutchings's framing: VIPER students take more major-required courses than non-dual-degree students. The non-major (NCC) load needs to come down by 4–6 CU to make the program survivable in 4 years. The sandbox models which combinations of LSM-approved waivers get to that 4-6 CU reduction.

Strategies tracked in the sandbox:
- **12+5+3 → 12+0** — full waiver of the SS+H distribution (LSM's May 2026 proposal, "high ask")
- **A&S 3 CU waiver** — existing OCC policy, 3 of 36 BA CUs waivable on audit ("confirmed")
- **Kite + Writing → distribution** — double-count both toward the distribution ("low ask")
- **VIPR 1300 → distribution** — up to 2 CU of VIPR 1300 count toward distribution ("low ask")
- **Foreign Language waived** — saves up to 2 CU ("high ask")
- **Kite + Key labs in summer** — summer scheduling, not policy waiver ("medium ask")
- **Key satisfied by VIPR 1200/1210** — under reconsideration as of May 2026 ("medium ask")

### Summer placement

Three summer terms: `summer-y1`, `summer-y2`, `summer-y3`. VIPR 1300 is pre-populated in all three:
- Summer Y1 is mandatory (locked, can't delete)
- Summer Y2 is the typical pattern (deletable)
- Summer Y3 happens for some students (deletable)

Foundations placed in summer count toward policy but NOT in-term. This is the key insight that the placement-driven NCC math captures.

### Overlap vs double-count

These are different things and the distinction matters:
- **Overlap** = a course counts toward both the BA and the BSE. Cross-degree contribution. Gold stars.
- **Double-count** = a course satisfies multiple requirements *within one degree*. (E.g., a BA course that's both a Sector and an FA.) Red stars.
- **Triple-count** also exists. Three stars.

In the old app this distinction was muddled into a single "DC" tag. Don't repeat that.

### CU semantics

- A "credit unit" (CU) at Penn = roughly one semester course
- Most courses are 1.0 CU
- Some are 0.5 CU (half-semester, modular, or research)
- VIPR 1300 is 0.5 CU per term, with a 0.5–1.5 CU range allowed in summer
- Total degrees: BA 36 CU minimum, BSE 40 CU minimum, dual 40+ CU (with overlap)
- Per-semester soft cap: 5.5 CU normal, 6.5 CU "dual overload" (allowed but tight), 7.5 CU hard cap (needs approval)
- **First semester (Fall Y1) is hard-capped at 5.5 CU** — no overload. The scheduler enforces this via `semesterCap()` in `src/scheduler/helpers.ts` (core courses beyond the cap defer to the next term with room; `first-semester-cap.test.ts` asserts it for every combo). The UI shows anything above 5.5 in Fall Y1 as "over first-semester cap" in red.
- Summers have different thresholds — don't apply the academic-year load classification

---

## What's in scope per mode

### Student mode (default)

- Plan editing: add, remove, move, reorder, rename, tag fulfillments, color-code courses
- Major selection (BA + BSE) and concentrations
- AP credit picker
- Graduation year selector
- Requirement trackers (FA, Sector, energy, double-count counts) — students need these
- Course detail modal (PCR link, tags, swap, rename, delete)
- Reference panels (VIPER program rules, common double-counts)
- LLM chat: plan review + what-if scenarios
- Export: JSON, CSV, share link
- Print view

### Admin mode (URL-gated)

Everything in student mode, PLUS:
- NCC sandbox (strategies, mod toggles, workload metric, 12+0 toggle)
- NCC vs OCC comparison table
- VIPER-to-NCC translation panel
- Distribution profile controls (manual SS / H targets)
- LLM chat: gets a different system prompt that knows about policy advocacy

---

## LLM integration

### Tool design

The LLM tools should mirror the user-action surface. If a student can do it manually, the LLM can do it via tool call. Same internal API powers both.

Required tools:

```typescript
// Read tools
get_plan(): Plan
get_requirements(): RequirementStatus
get_course_info(code: string): CourseDetail | null
analyze_plan(): PlanAnalysis  // requirement gaps, load warnings, etc.

// Simulation tool — returns analysis WITHOUT modifying state
simulate_change(mutations: Mutation[]): PlanAnalysis

// Mutation tools
add_course(semester: SemesterKey, course: CourseDraft): MutationResult
remove_course(semester: SemesterKey, courseId: string): MutationResult
move_course(from: SemesterKey, to: SemesterKey, courseId: string, targetIndex?: number): MutationResult
tag_fulfillment(courseId: string, fulfillmentId: FulfillmentTag, on: boolean): MutationResult
swap_elective(slotId: string, newCode: string): MutationResult
rename_course(courseId: string, newCode: string): MutationResult
```

The `simulate_change` primitive is essential for the "what if" use case. The LLM should always simulate before applying, and present the consequences to the student before committing. This pattern:

1. Student: "What if I switch from CBE to MSE?"
2. LLM calls `simulate_change` with the mutations that would result
3. LLM presents: "Switching to MSE would change these 8 courses. You'd gain X, lose Y. Want me to apply?"
4. Student confirms
5. LLM calls the actual mutation tools

### Versioned plan log

Every `apply_change` snapshots the previous plan. The student has an "Undo last change" button. The LLM has access to recent history if needed for "wait, what did I do earlier?" context.

### System prompts

Two distinct prompts: student mode and admin mode. Student prompt focuses on scoped, concrete advice within the student's constraints. Admin prompt knows about NCC policy strategies and can talk in those terms.

Both prompts should:
- Be aware of the current plan state (passed in context, refreshed each turn)
- Have access to the tool set
- Use `simulate_change` before any modify-style tool
- Cite PCR for course-specific opinions
- Distinguish between hard rules ("you need 3 energy courses") and soft preferences ("most students take CHEM 2410 sophomore year")

### Use cases the LLM should handle well

- "Review my plan" — open-ended quality check; the LLM walks through the plan and flags issues
- "What if I switch majors?" — simulate the major change, report consequences
- "What if I add a Math minor?" — simulate adding the minor's requirements
- "Why does the planner say I need X?" — explain the program rule
- "I want to take less in Spring Y3, what can I move?" — suggest plausible moves
- "Will I be ready for [a specific course] by [semester]?" — check prereqs and timing

### Use cases the LLM should NOT do

- Building a plan from scratch — that's the scheduler's job
- Course search across catalogs the LLM doesn't have — defer to "I don't have that catalog info"
- Replacing the structured planner UI with chat — chat is the sidekick, not the main surface
- Making policy-advocacy claims in student mode (only admin)

---

## Penn branding

The goal is "looks like an official Penn app." Use the published Penn visual identity guidelines: https://universitycommunications.upenn.edu/our-brand/

Core palette (these are official Penn colors, not approximations):
- **Penn Red** — `#990000` (PMS 201). Used for accents, key data, important callouts. Sparingly — Penn red everywhere feels aggressive.
- **Penn Blue** — `#011F5B` (PMS 288). Primary actionable color. Buttons, links, focused states.
- **Background** — off-white / cream, not pure white. Soft eye contrast.
- **Ink** — near-black for text, not pure black.
- **Subtle neutrals** for borders and dividers — avoid hard gray lines, prefer hairlines that almost disappear.

Typography:
- **Display / headlines** — a serif that's Penn-compatible. Penn's official guidelines lean toward Adobe Caslon Pro but that's a paid font; use a free serif that reads similar (Fraunces or EB Garamond work). For Penn-published web typography Lyon and Yale Design are both in use.
- **Body / UI** — sans-serif. Inter is fine. Penn uses Berthold Akzidenz Grotesk in print but on web Inter or Söhne is the practical choice.
- **Code / monospace** — JetBrains Mono or similar. Used for course codes and CU values.

What "official Penn app" means visually:
- Generous whitespace
- Confident typographic hierarchy (display sizes that earn their space)
- Penn red used as a signal, not decoration
- Photography (if used) is editorial, not stock
- Iconography is restrained — single-stroke, not playful
- The wordmark "Penn" or "University of Pennsylvania" appears in a footer or header tagline. Do not invent a Penn logo; use the official one if you can include it as an asset.

What NOT to do:
- Don't use the Penn shield without permission (this is licensed; we are not Penn officially)
- Don't claim University endorsement
- Avoid the "tech startup gradient" aesthetic — Penn is institutional
- Don't oversaturate Penn red — it's an accent

A reasonable disclaimer in the footer: "VIPER Planner is a student-built tool, not an official University of Pennsylvania application."

---

## UX principles — seamless and clean

The branding section says how the app *looks*. This section is how it *behaves*. Both are required for the app to feel like an institutional tool rather than a hackathon project.

The general rule: **a UI is good when the user doesn't notice it.** Decisions below are in service of disappearing into the task. When something draws attention, it had better be the thing the user came to do.

### Foundational stance

**Direct manipulation over forms.** Edit a course by clicking it. Move it by dragging it. Reorder by drag. Tag fulfillments by clicking a checkbox in a popover. Almost nothing should require typing in a form field except adding a brand-new course or renaming. Forms are escape hatches, not the primary interface.

**Optimistic updates everywhere.** State changes apply locally first, instantly. If a write to localStorage fails, recover gracefully — but the user should never wait for a "save" to feel like their edit took effect. The plan in memory is the truth; persistence is a side effect.

**Reversibility as default.** Every destructive action has an undo. Delete a course → toast "Removed CHEM 2410. Undo." Apply an LLM-suggested change → snapshot first. Reset to template → confirm. The cost of regret should be one click.

**Progressive disclosure.** The default surface shows the headline. Detail lives one click away. Examples:
- Course row shows code, title, CU, star indicator. Everything else (fulfillments, alternates, rename, delete) is in the detail modal.
- Sandbox shows the headline metric and one row per strategy. The mod-level toggles live deeper, in an "advanced" disclosure.
- Trackers show "5/7 satisfied" by default. Click to expand into which specific requirements are missing.

**Show, don't tell.** Where a number can speak, let it speak. Don't write "you have a heavy course load this semester" if you can show `6.5 CU` in red instead. Reserve text for explanations the user couldn't possibly derive themselves.

### Specific principles applied to this app

#### Fitts's Law — make targets reach-friendly

- Drag handles are at least 32px tall, edge-attached to the row (not floating mid-row)
- The whole course row is the click target for opening the detail modal — not a tiny "edit" icon
- Critical actions (Save, Apply, Share) sit in predictable corner positions; the user's mouse knows where to go without searching
- The "+" affordance to add a course is a full-width dashed-border button at the bottom of each semester card, not a tiny icon

#### Hick's Law — fewer choices per decision point

- At any moment, the visible primary actions should be ≤4. If you're adding a fifth, group some into a menu.
- The export menu hides JSON/CSV/Print behind a single "Export ▾". The two primary actions (Share link and Add course) stay visible.
- Onboarding is single-question: "Class of?" → "Major?" → done. No 12-step wizard.
- The course detail modal has ≤3 tabs (Tags, Pick course, Actions). Don't grow this.

#### Miller's Number — chunk by 5-7

- Foundations list is exactly 6 items
- Sectors list is exactly 7 items
- The strategies list in the sandbox should not exceed 7 — if it does, group into "core" and "experimental"
- A semester card showing more than 7 courses is a sign of a planning problem; flag it visually rather than hiding

#### Doherty Threshold — under 400ms feels instant

- Every interactive update must complete its visual feedback within 400ms
- Drag operations show a placeholder *immediately* on drag-over
- LLM tool calls show optimistic "applying..." state instantly even if the actual API call takes 2s
- Avoid layout shifts on state change — reserve space for elements that may appear

#### Peak-End Rule — invest in moments of delight and closure

- The "share link copied" moment is a *peak*. Make it sing — a brief animation, the link visible, copy confirmed, "send it to your advisor" microcopy.
- The "your plan is valid, you'll graduate on time" moment when all trackers go green — give it a celebratory but restrained beat (single subtle animation, not confetti).
- The "import succeeded" or "reset complete" moments — clear visual confirmation, not just silent state change.

#### Recognition over recall

- Course codes always shown alongside titles — students recognize "CHEM 2410" but might not recall what 2410 is
- The strategy toggles in the sandbox have human-readable labels ("12+5+3 → 12+0"), not internal IDs (`distribution`)
- Color tags persist across views — the student's mental "this is my Chem cluster" color carries from grid to list to print
- The detail modal shows context lines ("Slot: P&D Foundation · Counts toward: Sector V") so the student doesn't have to remember why a course is there

#### Jakob's Law — match conventions of apps students already use

- Drag-and-drop works like Notion (drop indicators, ghost preview, snap)
- Modals close with Escape and click-outside
- Cmd/Ctrl-Z undoes the last action
- Toasts appear bottom-right, auto-dismiss after ~5s, persist if the user is hovering
- A chat panel feels like Linear/Claude (right-side sidebar, message bubbles, code blocks for tool calls)

#### Goal-Gradient — show progress visibly

- A progress indicator near the top: "38 of 40 CU placed · 6 of 7 sectors satisfied"
- The tracker rows visually grow more saturated as they fill up — empty is dim, partial is muted, complete is solid Penn red
- The summer cells show "0 of 2" by default for VIPR 1300 to indicate the placement expectation

#### Von Restorff — only the important thing stands out

- Penn red is reserved for: load warnings, the share link button, "needs approval" badges. That's it.
- The single most-important headline number (currently "NCC workload in-term") gets the display-xl size; everything else respects that hierarchy.
- A single course that needs attention (over-cap, prereq concern) gets a colored border; the rest are calm.
- Don't decorate categories that aren't actionable.

#### Gestalt principles — let layout do the explaining

- **Proximity:** course rows within a semester are tightly packed; semesters are visually separated by clear whitespace, not borders
- **Similarity:** all double-counted courses have the same red star treatment, regardless of position; all summer cells share the slimmer column treatment
- **Closure:** a semester card is visually self-contained even without a border — the head/body/foot structure does the work
- **Common region:** the trackers panel is a single visual region with subtle background tone; courses live in their own region

#### Norman's principles — affordance, feedback, mapping

- A draggable element has a subtle "grip" visual cue on hover (not always-visible — that's clutter)
- A clickable course row has a hover state that previews the modal opening (slight elevation, cursor change)
- Drop targets light up during drag — every valid landing spot becomes visible without searching
- Color mapping is consistent: green = good, gold = caution, Penn red = problem. Never re-purpose these.

### What "clean" actually means in practice

Concretely, clean looks like:

- **Generous whitespace.** Padding inside semester cards is 18-24px. Margins between sections are 32-48px. Cramped layouts read as "tool," not "product."
- **One typeface family for UI**, one for display headers, one for course codes. Do not introduce a fourth.
- **Borders are hairlines or absent.** Use background tone shifts or whitespace to separate regions. Heavy borders read as "form."
- **Buttons have one visual treatment per role.** Primary (Penn blue or Penn red, filled), Secondary (outline), Ghost (no border, text only). Three total. Variants beyond these are debt.
- **Icons are functional, not decorative.** A `+` for add, `×` for close, `↗` for share, `▾` for menu, `✎` for rename. No emoji peppered through copy. No icons next to every label.
- **Animations are short and purposeful.** 120-200ms ease-out for most transitions. No bounces, no decorative flourishes. Animation should hide state changes, not announce them.
- **Empty states say what to do**, not what's missing. "Add a course to this semester" not "No courses yet."
- **Loading states are rare and brief.** If a state takes >400ms to compute, that's a perf bug to fix, not a spinner to add.

### What "seamless" actually means in practice

Seamless = no friction between *intent* and *result*. The user thinks "I want CHEM 2410 in Spring Y2 instead of Fall Y2" → they drag it → it's there. No save button, no confirmation modal, no reload, no waiting.

Concretely:

- **No save buttons anywhere.** Persistence is automatic and instantaneous.
- **No modal confirmation for non-destructive actions.** Move a course? Just do it. Tag a fulfillment? Just do it. Confirmation is reserved for things that lose data (Reset to template, Delete locked course).
- **Transitions between modes don't lose state.** Switch from Grid to List view → same plan, same selection, same scroll position remembered.
- **Single source of truth for every piece of state.** Don't have "current selection" stored in two places that can desync.
- **LLM tool calls and direct user actions go through the same mutation API.** Whether the student drags or the LLM calls `move_course`, the path through the code is identical. No drift between the two.
- **The share link contains the entire app state**, not a pointer to it. Open the link → exact same view, no fetch.

### Anti-patterns to avoid

- **Skeuomorphic flourishes.** No paper textures, no notebook lines, no calendar-page tear effects. This is a digital tool, not a metaphor.
- **Tooltips as crutches.** If you need a tooltip to explain a button, the button label is wrong. Tooltips are for keyboard shortcuts and additional metadata, not basic comprehension.
- **Density via micro-text.** If text needs to be 11px to fit, the layout is wrong. Reduce content or expand the container.
- **Modal stacking.** Never open a modal from within a modal. If a second decision is needed, use a tab or a step within the first modal.
- **Persistent banners.** Onboarding banners, announcement banners, "new feature" banners — they steal vertical space forever. Use ephemeral toasts or settings instead.
- **Right-rail clutter.** The right side of the screen, when it's used, holds ONE thing — either the LLM chat OR a single panel. Not a grab-bag of widgets.
- **Hidden state.** If a course is "moved from its original semester," the user should know. If a Foundation is "satisfied via summer placement," the user should know. State visible = state trustable.
- **Inconsistent layouts between screens.** A button in the top-right of one screen should be in the top-right of every other screen. Predictable spatial location is half of intuitive UI.

### Accessibility (the floor, not the ceiling)

These aren't aspirations — they're requirements:

- Color is never the only signal. A red overload warning also has text. A green check also has the word "satisfied."
- All interactive elements are keyboard-reachable in a logical tab order
- Focus indicators are visible (Penn blue outline, 2px, 2px offset)
- Color contrast meets WCAG AA minimums for text (4.5:1) — Penn red on cream meets this; double-check any new pairings
- Drag-and-drop has a keyboard alternative (the course detail modal's Actions tab can move a course via dropdown)
- Modals trap focus, restore focus on close
- Screen reader text for icon-only buttons (`aria-label` on `+`, `×`, etc.)

---

## File structure (target)

```
src/
  app/
    main.tsx                  // Vite entry
    routes.tsx                // ?mode=admin routing
  data/
    courses.ts                // COURSES catalog
    majors.ts                 // MAJORS + concentrations
    requirements.ts           // FA, Sectors, Foundations, distribution
    ap-credits.ts             // AP_CREDITS table
    viper-program.ts          // VIPER_PROGRAM (fixed courses, summer placements)
    common-double-counts.ts
  scheduler/
    types.ts
    build-plan.ts             // entry point (port from old buildPlan)
    stages/                   // 12 stages, one file each
    helpers.ts
  ncc/
    types.ts
    compute-workload.ts       // port from old computeNCCWorkload
    compute-seas-gen.ts       // port from old computeSEASGenElectives
    mods.ts                   // DEFAULT_VIPER_MODS, MOD_PRESETS, normalizeViperMods
    strategies.ts             // STRATEGIES list
  plan/
    types.ts                  // Plan, Course, Semester, Mutation
    augment.ts                // augmentPlan (port from old augmentPlan)
    mutations.ts              // add_course, remove_course, etc. — the internal API
    serialize.ts              // JSON export/import, share-link encoding
  llm/
    client.ts                 // Anthropic API client (will become proxy call later)
    tools.ts                  // Tool definitions matching mutations + reads
    prompts/
      student.ts              // System prompt for student mode
      admin.ts                // System prompt for admin mode
    chat.tsx                  // Chat UI component
  ui/
    components/
      CourseRow.tsx
      SemesterCard.tsx
      ScheduleGrid.tsx
      ScheduleList.tsx
      FocusView.tsx
      CourseDetailModal.tsx
      AddCourseModal.tsx
      RequirementTracker.tsx
      ShareLinkButton.tsx
    sandbox/                  // Admin-only
      Sandbox.tsx
      StrategyToggle.tsx
      WorkloadMetric.tsx
      VIPRtoNCCPanel.tsx
    pages/
      StudentApp.tsx          // Default route
      AdminApp.tsx             // ?mode=admin
    branding/
      penn-tokens.ts          // Penn color tokens, typography constants
      Logo.tsx
  utils/
    storage.ts                 // localStorage wrappers
    share-link.ts              // URL fragment encoding/decoding
  test/
    fixtures/                  // Known-good plans for regression testing
    scheduler.test.ts          // OCC 420-combination regression
    ncc-math.test.ts           // NCC scenarios
```

---

## Coding conventions

- TypeScript strict mode. No `any`. Use `unknown` and narrow if you must.
- Prefer named exports over default exports
- React functional components only. No class components.
- Component files are PascalCase, utility files are kebab-case
- Tests live next to source as `*.test.ts` or in `test/`
- Use Vitest for testing
- Use Tailwind utility classes for layout, custom CSS only when Tailwind can't express it
- Penn brand colors come from `penn-tokens.ts`, not hardcoded
- All LLM tool inputs/outputs have Zod schemas (so the LLM gets validation errors back, not silent failures)
- Commit messages: imperative present tense, scope prefix (e.g., `scheduler: fix placement ordering for summer courses`)

---

## Testing requirements

The scheduler regression is non-negotiable. Before merging any scheduler change:

- Run the 420 major+concentration combination test (4 SAS × 5 SEAS × concentrations)
- Each combination must produce a plan where:
  - `meetsDualMin` is true (total CU >= 40)
  - `meetsEnergyReq` is true (>= 3 energy courses)
  - `unfulfilledFA.length === 0`
  - `unfulfilledSec.length === 0`

For NCC math, the regression scenarios:

| Scenario | In-term CU | Reduction | Meets goal? |
|---|---|---|---|
| No mods, no summer | 14 | 0 | No |
| Current memo (defaults), no summer | 8 | 6 | Yes |
| Current memo + Kite in summer | 7 | 7 | Yes |
| Current memo + 12+0 | 3 | 11 | Yes |
| Aggressive + 12+0 | 6 | 8 | Yes |

The "current memo" number changed from 7 to 8 in the last iteration when `keyWaiver` was demoted from default-on to default-off. That's the correct number now.

For LLM tools, every tool call should be tested for:
- Valid input → expected mutation
- Invalid input → schema error message (not silent failure)
- Edge case: empty plan, full plan, plan with summer-only courses

---

## Things to ASK ABOUT, not assume

When in doubt:

- **NCC policy details** — these change. Ask Arjun what the current state of LSM negotiations is. Don't assume Foundation X is waived or distribution Y is the target.
- **Branding strictness** — if the project wants real Penn licensing, that's a conversation with the University. For now we operate as "student-built, Penn-flavored."
- **Course catalog updates** — Penn adds/renames/discontinues courses each term. Don't invent course codes.
- **Concentrations** — the data file has the concentrations we know. New ones get added as VIPER students declare them.
- **Anything that touches money** (LLM cost limits, etc.) — ask before defaulting

---

## Common traps from the old version

Things I (Claude) screwed up in previous iterations that are now fixed and should stay fixed:

1. **`fixed` flag on summer VIPR 1300.** Summer Y1 is `fixed: true`, Y2 and Y3 are `fixed: false`. Don't lock Y2/Y3 — students need to delete them.
2. **`emptyPlan` must initialize ALL 11 semester slots** including summers. Forgetting this crashes `addCourse` on summer keys.
3. **`augmentPlan` needs to expose a `placement` map.** Helper functions like `electivesForSlot` access `plan.placement[code]`; if it doesn't exist, the click-an-elective flow crashes.
4. **Baseline is fixed at 14, not derived from current targets.** If you change the baseline based on targets, the "reduction" metric becomes nonsense (toggling 12+0 would show 0 reduction).
5. **The `keyWaiver` default is `false`** as of May 2026 (was `true` previously). Don't flip it back without checking with Arjun.
6. **The `LeaderboardClassifier` distinction:** "Overlap" (cross-degree) is GOLD stars. "Double-count" (within-degree) is RED stars. The old app conflated them; don't.
7. **Drag-and-drop intra-semester:** dragging a course within its current semester is a reorder, not a move. The MOVED tag should not be added. The insertion index needs adjustment when `fromIdx < insertAt` because the splice changes positions.
8. **CSV export must NOT include "Developed by Arjun Sharma."** Michelle uses the CSV to match against degree audit format; the line broke that.

---

## Useful links and references

- Penn brand guidelines: https://universitycommunications.upenn.edu/our-brand/
- Penn Course Review: https://penncoursereview.com/
- Penn Labs platform (for future PennKey integration): https://github.com/pennlabs/platform
- Penn Labs accounts library: https://github.com/pennlabs/django-labs-accounts
- VIPER program page (for current requirements): https://viper.upenn.edu/

---

## Maintainer contact

Project owner: Arjun Sharma. When session-level decisions need to be made (especially about scope, NCC policy details, branding strictness, or LLM cost limits), ASK rather than assume. The previous iteration accumulated many subtle correctness fixes from real conversations with Michelle Hutchings; the value of this app is its accuracy on Penn's actual program rules, and getting that wrong silently is worse than asking.
