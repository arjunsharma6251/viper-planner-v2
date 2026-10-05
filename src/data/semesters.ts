// ---- Utility: semester key order & labels ----
// Regular semesters are the primary planning surface. Summer semesters are
// shown in margins only when they have courses (or when explicitly added).
export const SEMESTER_KEYS = [
  'fall-y1', 'spring-y1',
  'fall-y2', 'spring-y2',
  'fall-y3', 'spring-y3',
  'fall-y4', 'spring-y4',
] as const;

export const SUMMER_KEYS = ['summer-y1', 'summer-y2', 'summer-y3'] as const;

export const ALL_SEMESTER_KEYS = [
  'fall-y1', 'spring-y1', 'summer-y1',
  'fall-y2', 'spring-y2', 'summer-y2',
  'fall-y3', 'spring-y3', 'summer-y3',
  'fall-y4', 'spring-y4',
] as const;

export type SemesterKey = (typeof ALL_SEMESTER_KEYS)[number];

export const isFallSem = (key: string): boolean => key.startsWith('fall');
export const isSummerSem = (key: string): boolean => key.startsWith('summer');

/** Class-year names, Year 1 → 4. */
export const YEAR_NAMES = ['Freshman', 'Sophomore', 'Junior', 'Senior'] as const;

/** "Freshman" … "Senior" for a 1-based year number. */
export function yearName(yearNum: number): string {
  return YEAR_NAMES[yearNum - 1] ?? `Year ${yearNum}`;
}

/** Return shape of {@link semesterLabel}. */
export interface SemesterLabel {
  year: string;
  season: string;
  short: string;
}

/**
 * Compute human-readable labels for each semester.
 * If gradYear is supplied, returns real calendar labels like "Fall 2024".
 * Otherwise returns generic "Freshman Fall" style. `year` is the class-year
 * name (Freshman … Senior).
 */
export function semesterLabel(semKey: SemesterKey, gradYear?: number | null): SemesterLabel {
  const [season = '', yr = ''] = semKey.split('-');
  const yearNum = parseInt(yr.slice(1));
  const seasonLabel = season === 'fall' ? 'Fall' : season === 'spring' ? 'Spring' : 'Summer';
  if (gradYear && gradYear >= 2020 && gradYear <= 2040) {
    // Fall Yn = Sep, Spring Yn = Jan of next cal year, Summer Yn = Jun of same cal year as fall+1
    const fallCalYear = gradYear - 4 + yearNum - 1;
    let calYear = fallCalYear;
    if (season === 'spring' || season === 'summer') calYear = fallCalYear + 1;
    const short = season === 'summer'
      ? `Su '${String(calYear).slice(2)}`
      : `${seasonLabel.slice(0, 2)} '${String(calYear).slice(2)}`;
    return { year: yearName(yearNum), season: `${seasonLabel} ${calYear}`, short };
  }
  return { year: yearName(yearNum), season: seasonLabel, short: `Y${yearNum}${seasonLabel.charAt(0)}` };
}
