# Design notes from the November 2026 beta (no code yet)

Three requests that need decisions before anything is built. Each note lists
the options and the open questions.

---

## 1. Submatriculation and minors as optional overlays

**Asked by:** Max, Adi, Austin.

**What it would do:** let a student lay a minor (e.g. Math, Physics, CIS) or a
submatriculation master's (e.g. CBE/MSE/ESE MSE) over the BA + BSE plan and see
what is still needed, how much already double-counts, and what it costs in CU
per term.

**Options**

- **A. Audit-only overlay.** A minor/submat is a requirement list like a
  concentration (core + elective slots in `majors.ts` style). It adds a third
  section to the degree audit and ticks against courses already in the plan.
  It never seeds courses. Smallest; reuses `major-audit.ts` as is.
- **B. Overlay plus seeding.** Same data, but "Add minor" also places the
  missing courses as open slots in the lightest later terms. Needs rules on
  where they go and on the 6.5 CU cap. The scheduler stays a one-time seed;
  this would be a separate, explicit "add these" action.
- **C. Chat-only.** The sidekick's existing "What if I add a Math minor?" use
  case, answered by `simulate_change`. No new UI, but no lasting audit either.

**Open questions**

- Which minors and submat programs to model first? Ideally the ones VIPER
  students actually declare.
- Double-counting limits: Penn may limit how many courses a minor can share with a
  major, and submat may have its own rules about counting toward both degrees.
  These rules need a source (department sheets or Michelle).
- Submat timing: application windows and the graduate-level course count per
  term. Do we show those, or leave them to the advisor?
- Does an overlay belong in the share link Michelle sees? Probably yes, but it
  makes the link longer.

**Recommendation:** start with A for one or two minors that have published
requirement sheets. Add B only once A's requirement data has been checked.

---

## 2. A library of real past VIPER plans per major combination

**Asked by:** Adi.

**What it would do:** show "here is how a CHEM + CBE student from '26 actually
did it" next to the seeded plan, as a reference the student can copy terms
from.

**Options**

- **A. Program-office curated.** Michelle (or a TA) collects plans from
  graduates who opt in, strips identifying details, and adds them as
  read-only templates, like the existing `templates.ts` but labeled "past
  student". No new infrastructure; updates ship with the app.
- **B. Student-submitted.** A "share my finished plan with future VIPERs"
  action. Needs a backend (the app is localStorage-only by design), moderation,
  and a consent flow. Out of scope until there is a backend for other reasons.
- **C. Aggregates only.** Show "most VIPER CHEM + CBE students took P-Chem
  junior fall" style statistics instead of whole plans. Better for privacy, but
  needs enough plans to be meaningful (~25 students per class split across
  ~40 combinations is thin).

**Open questions**

- **Consent:** written opt-in from each graduate, covering what is shown (course
  list only? grades never) and for how long.
- **Program-office decision:** does VIPER want to publish past plans at all?
  Plans reflect old curricula (old core vs NCC, changed requirements) and could
  mislead. Each one needs a "Class of / curriculum" stamp and a warning.
- **Re-identification:** with ~25 students a year, a rare combination plus a
  class year identifies the student even without a name. A minimum count per
  combination before showing anything?
- Who keeps it current?

**Recommendation:** A, gated on Michelle's approval and a simple consent form.
Show a plan only for combinations with at least two or three opted-in
graduates, and stamp every plan with its class and curriculum.

---

## 3. "Explore an interest" suggestions through the chat sidekick

**Asked by:** Austin.

**What it would do:** "I'm interested in climate policy — what could I take?"
returns courses that fit open slots (Sectors / distribution / free electives)
and the student's interest, ideally ones that double-count.

**Options**

- **A. Catalog-bounded suggestions.** The sidekick searches only `courses.ts`
  (plus a new `get_open_slots` read tool) and proposes courses that fill an
  open slot, using `fillTargetsFor` / `doubleCountPicksFor`. Accurate but
  limited: our catalog is small (VIPER-relevant courses, not the whole
  university).
- **B. Larger course data.** Import a fuller Penn course list (titles,
  attributes, descriptions) so interests can match more than our ~200 courses.
  Needs an outside data source and a refresh process, which is the same
  decision as item 15 (deferred).
- **C. Model knowledge.** Let the model suggest from what it knows. Fast, but
  it will invent or misremember course codes. That conflicts with the "never
  invent course codes" rule. Not acceptable without B.

**Open questions**

- Is A useful with today's catalog, or does this really need B? Worth a quick
  test: list Austin's interests and check how many catalog courses match.
- Every suggestion should carry a PCR link and "check Path@Penn for this
  term's offering". Should it also check the prerequisite-order note before
  proposing a term?
- Cost: interest exploration is open-ended chat. Does it fit the pilot's API
  budget (Arjun pays)?

**Recommendation:** A now, as a prompt and tool addition (no new data). Revisit
B together with item 15's outside-data decision.
