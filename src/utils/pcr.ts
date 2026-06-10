// ---- Penn Course Review deep-link helper ----

/** Minimal shape pcrUrlFor needs — any planned course (or placeholder) qualifies. */
export interface PcrCourseRef {
  code?: string | null;
  isPlaceholder?: boolean;
}

// Given a course object, return a PCR URL if this is a real Penn course.
// Returns null for placeholders, free electives, VIPR courses (not on PCR),
// or anything whose code doesn't match the expected "DEPT NNNN" shape.
// PCR's URL format is /course/DEPT-NNNN (dash-joined, no space).
export function pcrUrlFor(course: PcrCourseRef | null | undefined): string | null {
  if (!course || !course.code) return null;
  const code = course.code;
  // Placeholder slots use em-dash
  if (code === '—' || course.isPlaceholder) return null;
  // Free-elective placeholders: "FREE 1", "FREE 2", etc.
  if (/^FREE\b/.test(code)) return null;
  // VIPR courses aren't rated on PCR
  if (/^VIPR\b/.test(code)) return null;
  // Match "DEPT NNNN" (e.g., "CIS 1200", "MEAM 2100", "CHEM 1012")
  const m = code.match(/^([A-Z]{2,5})\s+(\d{3,4}[A-Z]?)$/);
  if (!m) return null;
  const [, dept, num] = m;
  if (!dept || !num) return null;
  return `https://penncoursereview.com/course/${dept}-${num}`;
}
