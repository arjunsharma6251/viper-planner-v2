---
version: 1
slug: "src-ui-pages-studentapp-tsx"
primary_target: "src/ui/pages/StudentApp.tsx"
related_targets: ["src/ui/components/ScheduleGrid.tsx","src/ui/components/SemesterCard.tsx","src/ui/components/CourseRow.tsx","src/ui/components/PlanSetup.tsx","src/ui/components/CourseDetailModal.tsx","src/ui/components/AddCourseModal.tsx","src/ui/components/RequirementTracker.tsx","src/llm/chat.tsx"]
---

# Surface: the planner (student + admin), src/ui/pages/StudentApp.tsx

Scope: the whole planning surface: setup, year-first grid, focus view, rail (audit, advisor notes, reference, legend), course and add-course modals, chat drawer, admin sandbox, print. Visitor mode: Operate.

Audience and job: a VIPER student editing their own four-year plan; an advisor reading the same plan from a share link or on paper. Task: place and move courses, see what each satisfies across BA, BSE, and the energy concentration, stay inside Penn's load rules, share the result. Proof/content: real catalog, real rules, the student's own plan. Constraints: keep the year-first grid (Year N → Fall | Spring | Summer), Penn Blue and Penn Red, off-white ground, the disclaimer, all product rules and share-link compatibility; no auth; print must stay clean.

Confirmed answers (2026-09-13): replace the visual world; priorities are desktop grid scanability and the setup/modal/add-course flows; nothing else pinned beyond the grid shape.

## Direction contract

THESIS: The plan is a substation one-line diagram: three buses (BA, BSE, Energy), eight feeders (terms), every course a breaker that ties to the buses it feeds. It refuses the kanban-of-cards planner with a sidebar of progress rings, and it refuses the incumbent paper ledger.

OWN-WORLD: One warm off-white sheet (#FAF9F6), no grain, no elevation on panels; 1px hairlines (#D9D6CF) rule every region; 0-radius everywhere. Ink #1A1A1A for all text (achromatic text field). Color only in bus identities and status: BA Penn Blue, BSE ink, Energy gold #B8860B; good green, caution amber #B45309, problem Penn Red, always with a printed word. Type: Barlow Semi Condensed 600 caps for titles and labels, Barlow 400/500 for text, Red Hat Mono for tags, CU, and readouts. One fixed column ruling (tag | title | ties | CU) for every course row on the sheet. Selection and drag invert fully to ink-on-sheet. Every load is a meter with its thresholds printed (5.5 rated · 6.5 overload · 7.5 trip). Icons are authored single-stroke SVG.

STORY: The student reads the sheet top-down: the title block says whose plan this is; the bus bars say whether the two degrees and the energy concentration are fed; the year rows say where the load sits; the rail says what an advisor will ask. They click a breaker (course) to retag, swap, move, or remove it; they drag to move; they share the sheet. An advisor reads the same sheet on a link or on paper and finds the alarms without the student present.

FIRST VIEWPORT (1440×900): A sticky 56px title block spans the top: planner name left in condensed caps; ruled cells for student (majors as inline selects), class of, curriculum; right cells hold Undo, Export, Chat, Share (Share is the one filled control, Penn Blue). Beneath, a 64px bus strip: three bus bars with meters and readouts (Total CU vs 40, Foundations, Distribution, Energy per the audit) plus the eight-term in-term load bars and the Grid | Focus switch. Then Year 1 as a ruled band (YEAR 1 · 2024–25 · 11.5 CU in term) over three panels: Fall | Spring | Summer; each panel a header (term, load readout, status word), a labeled meter, and course rows in the fixed ruling. The rail on the right (21rem) opens with BUS LOADING (the audit as meters) and ALARMS (advisor notes). Primary action per panel: "+ Add course" as an outlined breaker cell at the bottom of each panel.

SIGNATURE INTERACTION: Trace. Hovering or focusing a course lights the buses it feeds: the bus bars in the strip and the matching rows in BUS LOADING brighten (160ms ease-out) while the rest hold. Motion grammar: no entrance choreography; state flips are instant (≤120ms), meters fill in 280ms exponential ease-out, modals scale from 0.98 in 160ms; all under prefers-reduced-motion.

MOBILE: one column; title block collapses to name + icon controls; bus strip becomes a 3-cell readout; a sticky bottom bar carries year jump cells (Y1–Y4) and an AUDIT cell that scrolls to the rail.

FORM: One-Line Diagram, candidate 7 of 7 on my ordered list (engineering drawing sheet, periodic table, transit map, Gantt schedule, lab notebook, departure board, one-line diagram). Seed key 8172abf3. Code-led (no image generation in this harness). Raises kept from declined challengers: fixed column ruling; achromatic text field; labeled meters; full inversion on selection; keyboard-first with printed key hints.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
