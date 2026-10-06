---
name: VIPER Four-Year Planner
description: A four-year dual-degree plan drawn as a substation one-line diagram: three buses, eight feeders, every course a breaker.
colors:
  sheet: "#fafaf8"
  panel: "#ffffff"
  ink: "#1b2130"
  ink-2: "#4a5164"
  ink-3: "#697083"
  rule: "#dcdde2"
  rule-2: "#b5b9c3"
  penn-blue: "#011f5b"
  penn-blue-2: "#0b3a8c"
  penn-red: "#990000"
  energy: "#b8860b"
  energy-ink: "#7a5a05"
  good: "#1e7e34"
  caution: "#b45309"
  problem: "#990000"
  tint-blue: "#eef1f7"
  tint-energy: "#fbf3e0"
  tint-red: "#f9ecec"
  tint-good: "#eaf3ec"
  tint-caution: "#fcf1e6"
typography:
  # Penn web identity (2026-10): EB Garamond primary, Roboto secondary.
  # Garamond runs with font-size-adjust 0.47 so it sits at the sheet's optical size.
  display:
    fontFamily: "EB Garamond, Garamond, Times New Roman, serif"
    fontSize: "clamp(2rem, 2rem + 1vw, 2.5rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "EB Garamond, Garamond, Times New Roman, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "EB Garamond, Garamond, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "EB Garamond, Garamond, Times New Roman, serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "normal"
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.08em"
  tag:
    fontFamily: "Roboto Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
    fontFeature: "tnum"
  control:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.07em"
rounded:
  none: "0px"
spacing:
  hair: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "36px"
  row: "36px"
  titlebar: "56px"
  rail: "21rem"
  drawer: "26rem"
  sheet-max: "124rem"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  button-primary:
    backgroundColor: "{colors.penn-blue}"
    textColor: "{colors.panel}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.penn-blue-2}"
    textColor: "{colors.panel}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-quiet-hover:
    backgroundColor: "{colors.tint-blue}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.penn-red}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-danger-hover:
    backgroundColor: "{colors.penn-red}"
    textColor: "{colors.panel}"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.ink-3}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
  field-focus:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
  segment:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "7px 12px"
  segment-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px"
  course-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "6px 4px 6px 24px"
    height: "{spacing.row}"
  course-row-hover:
    backgroundColor: "{colors.tint-blue}"
    textColor: "{colors.ink}"
  course-row-inverted:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  meter:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.none}"
    height: "6px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  modal:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px"
    width: "32rem"
---

# Design System: VIPER Four-Year Planner

## Overview

**Creative North Star: "The One-Line Diagram"**

The plan is drawn the way a power engineer draws a substation: one warm off-white sheet, three buses (BA, BSE, Energy) along the top, eight feeders (the academic terms) hanging below them, and every course a breaker that ties to the buses it feeds. Nothing on the sheet is decorative. Every region is ruled by a hairline, every load is a meter with its thresholds printed beside it, every status is a colored word, and the only saturated color on the page is bus identity or a printed alarm. The text field is achromatic ink on sheet; when something goes wrong it says so in Penn Red, and when it is fine the sheet stays quiet.

The world is dense and flat. Panels carry no elevation; depth exists only for the things that float above the sheet for a moment (modals, menus, toasts, the phone chat drawer). Type is a drafting voice: condensed capitals for titles and column heads, a plain grotesque for course names and prose, and a monospaced face for equipment tags (course codes), CU readouts, and key hints. Selection and drag do not dim or tint; they invert the row fully to ink-on-sheet, the way a highlighter would on a print.

This world replaced the earlier "registrar ledger" identity (display serif, paper texture) and refuses the kanban-of-cards planner with progress rings. It was shipped 2026-09-13 with a finish disposition of ship.

**Key Characteristics:**
- One off-white sheet, hairline rules, square corners everywhere, no grain
- Achromatic text; color only for bus identity (Penn Blue, ink, energy gold) and status (green, amber, Penn Red) with a printed word
- Three faces with fixed jobs: Barlow Semi Condensed caps, Barlow text, Red Hat Mono readouts
- One fixed column ruling (tag | title | ties | CU) for every course row
- Labeled meters with printed thresholds (5.5 rated · 6.5 overload · 7.5 trip)
- Full inversion for selected and dragged rows; a hover "trace" that lights the buses a course feeds
- Authored single-stroke SVG icons; keyboard shortcuts printed in mono beside their controls
- No entrance choreography; state flips are instant, meters settle in 280ms

## Colors

An achromatic drawing with three bus identities and three status inks, each with a pale tint for lit or receiving regions.

### Primary
- **Penn Blue** (`{colors.penn-blue}`): the BA bus, the one filled control (Share plan), the focus ring, caret, selection highlight, checked boxes, and the normal-load meter fill. Also the hover step **Penn Blue Lit** (`{colors.penn-blue-2}`) for the filled button.
- **Energy Gold** (`{colors.energy}`): the Energy bus (VIPER concentration) bar, terminal, and tracker fill. **Energy Ink** (`{colors.energy-ink}`) is the deeper step reserved for gold-on-sheet text where it must clear AA.
- **Ink as bus** (`{colors.ink}`): the BSE bus is drawn in ink, not a third hue. Its lit tint is ink at 6% alpha (`bg-ink/6`), not a token.

### Secondary (status)
- **Good Green** (`{colors.good}`): satisfied trackers, the "graduates on time" notice, "copied" confirmation; always beside a check glyph or the word.
- **Caution Amber** (`{colors.caution}`): overload loads (5.5–6.5 CU) in meter fill, readout, and status word; warning-severity alarms.
- **Problem Red** (`{colors.problem}`, identical to Penn Red): over-cap loads, within-degree double-count marks (×2, ×3), error alarms, the danger button, and the admin sandbox's ruling. Penn Red appears nowhere as decoration.

### Neutral
- **Sheet** (`{colors.sheet}`): the page, every panel, modal, and menu surface.
- **Panel White** (`{colors.panel}`): input fields, meter tracks, and checkbox wells only; the one step brighter than the sheet so a well reads as recessed.
- **Ink** (`{colors.ink}`): all primary text, heavy rules (title bar bottom, year band, panel column-head rule), inverted rows, toasts, and the selected segment.
- **Ink 2** (`{colors.ink-2}`): secondary text, labels at rest, CU readouts on rows, quiet-button text.
- **Ink 3** (`{colors.ink-3}`): tertiary text, small column heads, placeholders, key hints, disabled controls, the dashed rated-load line.
- **Rule** (`{colors.rule}`): the hairline that rules every region and row.
- **Rule 2** (`{colors.rule-2}`): heavier hairline for field borders, dashed summer and add-cell borders, unlit tie terminals, scrollbar thumb.
- **Tints** (`{colors.tint-blue}`, `{colors.tint-energy}`, `{colors.tint-red}`, `{colors.tint-good}`, `{colors.tint-caution}`): flat pale grounds for hover, lit-bus trace, receiving drop targets, and status notices.

### Named Rules
**The Achromatic Field Rule.** Running text, titles, labels, and readouts are ink, ink-2, or ink-3. A hue on text means one of exactly two things: which bus (Penn Blue, energy gold) or which status (green, amber, Penn Red).

**The Printed Word Rule.** Status color never stands alone. Every amber or red load carries its word (overload, needs approval, over hard cap, over first-semester cap); every green carries a check or "satisfied".

**The One Filled Control Rule.** Penn Blue fills one control per surface (Share plan in the title block; the primary action inside a modal or notice). Everything else is outlined or quiet.

## Typography

**Display Font:** Barlow Semi Condensed (with Barlow, system-ui)
**Body Font:** Barlow (with system-ui)
**Label/Mono Font:** Red Hat Mono (with ui-monospace, SF Mono, Menlo)

**Character:** Drafting lettering. Condensed capitals with wide tracking do the naming; a plain grotesque carries the course titles and prose; a monospaced face with tabular figures prints every tag, CU, threshold, and key hint so columns of numbers align. There is no serif and no italic.

Root size is fluid: `clamp(15px, 13.4px + 0.2vw, 17px)`, dropping to 11px in print.

### Hierarchy
- **Display** (700, 2rem to 2.5rem, line-height 1, tracking 0.02em, uppercase): the setup sheet's title only.
- **Headline** (700, 1.125rem, line-height 1, tracking 0.04em, uppercase): year bands (YEAR 1 · 2024–25). The title-block wordmark is the same voice at 1.0625rem with 0.06em tracking, "Four-Year Planner" in Penn Blue.
- **Title** (600, 0.9375rem, line-height 1, tracking 0.04em, uppercase): feeder panel headers (FALL 2024), setup section heads, the commencement cell. Modal titles use the same face at 1.125rem, 600, 0.02em, sentence case, tight leading; the chat greeting at 1.375rem.
- **Body** (400, 0.8125rem, leading-snug): course titles, tracker labels, setup options, chat. Hints and alarm text step down to 0.75rem; footnotes and the disclaimer to 0.6875rem. Prose never exceeds 60ch (setup lead).
- **Label** (600 condensed, 0.6875rem, tracking 0.07em, uppercase, ink-2): panel titles, column heads, status words, control captions. A 0.625rem variant in ink-3 is used for column heads inside panels, unit suffixes, and title-block cell captions.
- **Tag** (Red Hat Mono 500, 0.6875rem, tracking -0.01em, tabular numerals): course codes, CU readouts, threshold numerals, dates, the model name. Key hints (`kbd`) are the same face at 0.625rem at 60% opacity.
- **Control** (600 condensed, 0.75rem, tracking 0.06em, uppercase): every button; segments use the label size.

### Named Rules
**The Three Voices Rule.** Condensed caps name things, Barlow describes things, mono measures things. A number that will be compared (CU, counts, thresholds) is always mono and tabular.

**The Printed Key Rule.** A keyboard shortcut is printed in `kbd` mono beside the control it drives (Cmd Z, C, S, V, esc), never hidden in a tooltip.

## Layout

The sheet is a centered column with a maximum width of 124rem and fluid gutters `clamp(1rem, 3vw, 3rem)`. The title block is a sticky 56px bar ruled by a 1px ink line at its foot; its cells are separated by hairlines and each carries a 0.625rem caption over its value. Beneath it the bus strip is ruled above and below in ink and divided into three bus cells, a figures cell, the in-term load bars, and the Grid | Focus switch; on desktop it is a six-column grid (`repeat(3, minmax(11.5rem, 1fr)) minmax(0, auto) auto auto`), on tablets three columns, on phones one.

Below, a two-column grid places the plan (`minmax(0, 1fr)`) beside a 21rem rail with a 32px gutter (`lg:grid-cols-[minmax(0,1fr)_21rem]`, `gap-8`). Year sections stack with 36px between them (`gap-9`); each year opens with a 2px ink rule under its headline and lays three feeder panels in `1fr 1fr minmax(15rem, 0.55fr)` at ≥1280px (summer is the narrow third), two columns at ≥768px, one below. Panels sit 16px apart (`gap-4`).

Inside a panel: 12px horizontal padding, header on 12px top padding, a 6px meter with 12px of threshold numerals below, a column-head row ruled by 1px ink, then rows at a 36px minimum height with 6px vertical padding, each ruled by a hairline. Every course row obeys one column ruling: `4.5rem | minmax(0,1fr) | 2.75rem | 2rem` (tag | title | ties | CU) with 8px column gap and 24px left inset for the grip; summer panels use the compact ruling `4.25rem | minmax(0,1fr) | 2rem` (no ties). The add cell is an 8px-margin dashed rectangle. Rail panels use 8px horizontal padding and 8px row padding; tracker rows are `minmax(0,1fr) | 3.5rem | 3.25rem | 1rem`.

The right edge holds one thing at a time. With the chat drawer open (26rem, fixed, ruled left in ink) the sheet pads to 27rem on the right and the rail drops below the plan as a two-column block. On phones the title block collapses to wordmark and icon controls, the bus strip becomes stacked readouts, and a sticky bottom term bar (Y1–Y4 cells plus an Audit cell in Penn Blue) rules the viewport's foot. Toasts sit bottom-right (24px inset on desktop, above the term bar on phones). Print drops the title block, controls, add cells, and the reference panels, issues a print title block under a 2px ink rule, and keeps panels unbroken.

Breakpoints are Tailwind's defaults: 640, 768, 1024, 1280, 1536px.

## Elevation & Depth

Flat by default. Panels, the bus strip, the rail, and the title block sit on the sheet with hairline or ink rules and no shadow; depth is conveyed entirely by rule weight (hairline for regions and rows, 1px ink for the strip and section heads, 2px ink for year bands and the print title block) and by the one step from sheet to panel white inside wells (fields, meter tracks, checkboxes). The only things that cast a shadow are those that float for a moment: modals, dropdown menus, the share popover, toasts, and the phone chat drawer. The modal scrim is ink at 40% alpha.

### Shadow Vocabulary
- **Pop** (`box-shadow: 0 2px 6px rgba(26, 26, 26, 0.08), 0 14px 32px -10px rgba(26, 26, 26, 0.28)`): modals, export menu, share popover, toasts, and the chat drawer on phones. Always paired with a 1px ink border.

### Named Rules
**The Sheet Is Flat Rule.** Nothing that lives on the sheet has a shadow. Pop is reserved for surfaces that will close.

## Shapes

Square everywhere: the radius scale has one step, `0px`. Regions are rectangles ruled by 1px hairlines; the heavier ink rule marks a structural edge (title block foot, bus strip, year band, column heads, modal header). Dashed 1px rule-2 borders mean "not yet" or "outside the ladder": summer panels (policy CU, not in-term load), the add-course cell, the commencement cell, the custom-course prompt. The 2px ink bar is the drop indicator. Meters are 6px rectangles (5px in the rail) with 1px ink ticks crossing them at the thresholds. Tie terminals are 7px filled squares or 6px outlined squares on a 34×10 grid, joined by a 12×2 bar for cross-degree overlap. Cluster keys are 3px vertical bars at a row's left edge. Checkboxes are 14px squares drawn by the app; the checked state is a Penn Blue fill with a two-stroke white check. Icons are a 16px box, 1.5px stroke, square caps and miter joins.

## Components

### Buttons
Switches on a drawing: condensed capitals inside a 1px rectangle. All variants share the control voice, 10px × 14px padding, an 8px icon gap, and an 80ms ease-out flip; pressing nudges the button down 1px.
- **Shape:** square (0px)
- **Outline** (default `.btn`): 1px ink border, ink text, transparent. Hover inverts to ink fill with sheet text.
- **Primary** (`.btn-primary`): Penn Blue fill and border, white text. Hover steps to Penn Blue Lit. One per surface (Share plan; Rebuild plan; Add custom course; Send).
- **Quiet** (`.btn-quiet`): transparent border, ink-2 text. Hover: tint-blue ground, ink text. Title-block utilities, modal close, chat controls. A pressed quiet button (Chat open) inverts to ink.
- **Danger** (`.btn-danger`): Penn Red border and text; hover fills Penn Red with white text. Delete only.
- **Disabled:** rule-2 border, ink-3 text, no pointer.
- **Focus:** the global 2px Penn Blue outline, 2px offset.
- **Key hint:** `kbd` mono at 0.625rem, 60% opacity, trailing the label.

### Segmented switch
An inline row of label-voice buttons inside one 1px ink rectangle, cells divided by 1px ink. Selected inverts to ink with sheet text; unselected hover takes tint-blue. Used for Grid | Focus, modal tabs (Tags | Pick course | Actions), graduating class, and curriculum.

### Cards / Containers (feeder panels and rail panels)
- **Corner Style:** square
- **Background:** sheet (panels do not lighten); receiving a drag turns the panel tint-blue
- **Shadow Strategy:** none (see Elevation)
- **Border:** 1px rule; summer and commencement panels 1px dashed rule-2; the admin sandbox is ruled and titled in Penn Red so proposals never read as policy
- **Internal Padding:** 12px in feeder panels, 8px in rail panels; rail panels open with a label-voice title ruled below by 1px ink
- **Status notice:** a 1px status-colored border on the matching tint, text in the status color (green "graduates on time" notice)

### Inputs / Fields
- **Style:** 1px rule-2 border, panel white ground, ink text, 8px × 10px padding, 0.8125rem, square. Selects draw their own 10×6 chevron in ink.
- **Hover:** border to ink-3.
- **Focus:** border to Penn Blue plus a 1px inset Penn Blue ring; the outline is suppressed in favor of the ring.
- **Placeholder:** ink-3.
- **Ghost selects** (title block majors): borderless, transparent, styled as body text with a caption in bus color (BA in Penn Blue, BSE in ink).
- **Checkbox** (`.box`): 14px square, ink-3 border, panel white; checked is Penn Blue with a white check; 80ms flip.

### Navigation
- **Title block:** sticky 56px, sheet ground, 1px ink foot rule; wordmark in condensed caps left; ruled cells (Student plan, Class of, Curriculum, Edit setup) with 0.625rem ink-3 captions; utilities right as quiet buttons; Share plan as the one primary. With the chat open the cells hide.
- **Phone term bar:** fixed bottom, sheet ground, 1px ink top rule; five label-voice cells ruled by hairlines, Y1–Y4 in ink and Audit in Penn Blue.
- **Menus** (Export): 1px ink border, sheet, pop shadow, body-size items that take tint-blue on hover.

### Course row (breaker)
The row is the signature unit. It is the whole click target and the drag handle; a grip glyph appears at the left inset on hover. Cells follow the fixed ruling: code in tag mono (ink), title in body (two-line clamp), tie glyph, CU in tag mono (ink-2, right-aligned). Open slots print an open-breaker glyph and the word "open" in ink-3 and their title in ink-2; the ties cell prints "choose" in Penn Blue on hover. Fixed courses carry a 12px lock. A user cluster color is a 3px key at the left edge (six keys available: Penn Blue, Penn Red, green, gold, teal `#0f6b66`, violet `#5b3a86`).
- **Rest:** transparent, hairline below.
- **Hover / focus:** tint-blue ground and the trace lights the buses the course feeds (160ms). Focus-visible also shows the global ring.
- **Selected / dragging:** full inversion to ink ground and sheet text; the BSE terminal prints in sheet and the BA terminal in tint-blue so ties stay legible. No half-opacity states.
- **Drop indicator:** a 2px ink bar between rows.

### Meter
A 6px panel-white track with a 1px rule border; the fill scales from the left in 280ms with the expo ease and recolors in 160ms. Fill color is the bus (Penn Blue, ink, gold) for bus meters and the status (Penn Blue normal, amber caution, Penn Red problem) for load meters. Load meters print 1px ink ticks at 5.5 and 6.5 (first semester: 5.5 only) with the numerals and the 7.5 cap in 0.625rem mono beneath. In-term load bars in the strip are 9px columns with a dashed ink-3 rated line.

### Tracker row (bus loading)
Label, 5px meter in the bus color, mono readout (done/total with a CU suffix), and a 12px chevron or green check. Hover tint-blue; the row takes its bus tint when a course traces it. Expansion is an indented list ruled left by rule-2.

### Modal
A 1px ink rectangle on sheet with pop shadow, max 32rem (wide: 42rem), header ruled by 1px ink with the title, a meta line of tag readouts, and a quiet close with "esc" printed. It settles in (scale 0.985 to 1, 160ms expo) over an ink-40% scrim that fades in 120ms. On phones it becomes a full-width bottom sheet at 92vh. Never a modal from a modal; second decisions are tabs.

### Toast
Ink ground, sheet text, 0.8125rem, 10px × 14px padding, pop shadow; an "Undo" label in sheet underlined that turns energy gold on hover; a 12px close glyph. Settles in; holds while hovered; dismisses at 5s.

### Icons
One authored set (`icons.tsx`): 16px box, 1.5px `currentColor` stroke, square caps, miter joins, sized 12 or 14px inline. Includes the open-breaker glyph, lock, grip, chevrons, check, alert, chat, undo, external link, search, plus, close. No Unicode stand-ins, no icon fonts.

### Motion
One grammar: no entrance choreography on load; state flips in 80–120ms ease-out; meters settle in 280ms `cubic-bezier(0.16, 1, 0.3, 1)`; trace lighting in 150–160ms; modals and popovers `settle` (opacity + scale 0.985, 160ms expo); scrims and drawers `fade` (120ms). Under `prefers-reduced-motion` the keyframes are removed and every transition collapses to 0.01ms.

## Do's and Don'ts

### Do:
- **Do** rule every region with a 1px hairline (`{colors.rule}`) and reserve 1px ink for structural edges and 2px ink for year bands and drop indicators.
- **Do** keep every course row on the fixed ruling `4.5rem | minmax(0,1fr) | 2.75rem | 2rem` (compact `4.25rem | minmax(0,1fr) | 2rem` for summers) so codes, ties, and CU align down the whole sheet.
- **Do** print the word with the color: a status hue on a load, tracker, or alarm always carries its status word or a check glyph.
- **Do** set every comparable number (CU, counts, thresholds, dates, key hints) in Red Hat Mono with tabular figures.
- **Do** invert fully (ink ground, sheet text) for selected and dragged rows and the selected segment; hover takes the flat tint-blue.
- **Do** give loads a labeled meter with the thresholds printed (5.5 · 6.5 · 7.5; first semester 5.5 only) rather than a bare number or a ring.
- **Do** author new icons in the single-stroke 16px set (1.5px, square caps, miter joins) and size them 12–14px inline.
- **Do** keep the right edge to one occupant: the rail or the chat drawer, never both.
- **Do** print a control's keyboard shortcut in `kbd` beside it and keep all motion under `prefers-reduced-motion`.

### Don't:
- **Don't** round a corner. The radius scale is `0px`; the only ruled shapes are rectangles, dashed rectangles, and squares.
- **Don't** put a shadow on anything that lives on the sheet. Pop belongs to modals, menus, popovers, toasts, and the phone chat drawer only.
- **Don't** color text for emphasis. Hue on text means bus (Penn Blue, gold) or status (green, amber, Penn Red); everything else is ink, ink-2, or ink-3.
- **Don't** use Penn Red as decoration or a second accent; it is problem status, the danger button, ×n double-count marks, and the admin sandbox's ruling.
- **Don't** introduce a fourth typeface, a serif, an italic, or a weight outside Barlow 400/500/600, Barlow Semi Condensed 500/600/700, Red Hat Mono 400/500/600.
- **Don't** dim or fade a row to show state (no half-opacity ghosts); invert it.
- **Don't** add paper grain, notebook lines, gradients, or any texture to the sheet.
- **Don't** choreograph entrances on load or exceed the 280ms meter settle; state flips stay at or under 120ms.
- **Don't** open a modal from a modal; second-level decisions are tabs inside the first.
