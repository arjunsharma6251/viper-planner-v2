import type { FaRequirement, GenEdSlot, Sector } from './types';

// ---- Generic gen-ed slots (users pick courses themselves via the swap picker) ----
// Each slot declares WHAT it fulfills via `intent`. The scheduler credits the
// intent toward FA/Sector requirements so the tracker shows green even before
// the user picks a specific course. Labels are kept open-ended like the VIPER
// template spreadsheet — "Sector III: Arts & Letters" rather than "ENGL 0040".
// Users click any slot to pick their own course from the swap modal.
// VIPER students carry dual-degree work — every semester is full. Penn's
// single-degree templates can afford to back-load gen-eds (Years 3-4) because
// single-degree students have slack. VIPER students don't. So we distribute
// gen-eds across Years 2-3 (when major prereqs are heaviest but uniformly so)
// and finish by Fall Y4 — leaving Year 4 lighter for senior design, capstone
// work, advanced electives, and research time.
//
// Year 1: 1 gen-ed (WRIT in Spring — Fall is already CHEM-heavy)
// Year 2: 2 gen-eds (one per semester)
// Year 3: 3 gen-eds (Fall lighter on majors, Spring heavier — distribute accordingly)
// Year 4: 2 gen-eds (one per semester, alongside senior design)
//
// This default can be overridden via the 'genedDistribution' option to
// buildPlan, with value 'penn' restoring Penn's back-loaded distribution.
export const GENED_SLOTS: readonly GenEdSlot[] = [
  { id: 'gened-writ', label: 'Writing Seminar',
    cu: 1, semPref: 'spring-y1',
    intent: { fa: 'WRIT' },
    fulfillsDesc: 'FA: Writing Seminar · SEAS Writing',
    suggests: ['WRIT 0130'],
    note: 'Pick any WRIT 01xx seminar on a topic that interests you.' },

  { id: 'gened-cca', label: 'Cross-Cultural Analysis (FA)',
    cu: 1, semPref: 'fall-y2',
    intent: { fa: 'CCA' },
    fulfillsDesc: 'FA: Cross-Cultural Analysis · SEAS SS/H',
    suggests: ['SAST 0004', 'CIMS 1004', 'ANTH 1040'],
    note: 'Any course tagged "Cross-Cultural Analysis" in Path@Penn.' },

  { id: 'gened-cdus', label: 'Cultural Diversity in US (FA)',
    cu: 1, semPref: 'spring-y2',
    intent: { fa: 'CDUS' },
    fulfillsDesc: 'FA: Cultural Diversity in US · SEAS SS/H',
    suggests: ['SOCI 0006', 'AFRC 0002', 'ASAM 0001'],
    note: 'Any course tagged "Cultural Diversity in the US".' },

  { id: 'gened-sec1', label: 'Sector I: Society',
    cu: 1, semPref: 'fall-y3',
    intent: { sec: 'I' },
    fulfillsDesc: 'Sector I (Society) · SEAS SS',
    suggests: ['ECON 0100', 'SOCI 0001', 'PSCI 1800'],
    note: 'Any Sector I course. Popular: ECON, PSCI, SOCI.' },

  { id: 'gened-sec2', label: 'Sector II: History & Tradition',
    cu: 1, semPref: 'fall-y3',
    intent: { sec: 'II' },
    fulfillsDesc: 'Sector II (History & Tradition) · SEAS H',
    suggests: ['HIST 1708', 'CLST 1303', 'RELS 1500'],
    note: 'Any Sector II course. Popular: HIST, CLST, RELS.' },

  { id: 'gened-sec3', label: 'Sector III: Arts & Letters',
    cu: 1, semPref: 'spring-y3',
    intent: { sec: 'III' },
    fulfillsDesc: 'Sector III (Arts & Letters) · SEAS H',
    suggests: ['ENGL 0040', 'ARTH 1010', 'MUSC 0170'],
    note: 'Any Sector III course. Popular: ENGL, ARTH, MUSC, CIMS.' },

  { id: 'gened-sec4', label: 'Sector IV: Humanities & Social Sci',
    cu: 1, semPref: 'fall-y4',
    intent: { sec: 'IV' },
    fulfillsDesc: 'Sector IV (Humanities & Social Sci) · SEAS SS/H',
    suggests: ['STSC 1880', 'PHIL 0001', 'LING 0001'],
    note: 'Any Sector IV course. Popular: STSC, PHIL, LING.' },

  { id: 'gened-sec5', label: 'Sector V: Living World',
    cu: 1, semPref: 'spring-y4',
    intent: { sec: 'V' },
    fulfillsDesc: 'Sector V (Living World) · SEAS Natural Sci',
    suggests: ['PSYC 0001', 'BIOL 1101', 'BIOL 1121'],
    note: 'Any Sector V (Living World) course. PSYC 0001 is popular for VIPER students.' },
];

// ---- Legacy name kept for scheduler compatibility ----
export const GENED_POOL = GENED_SLOTS;

// ---- Sector VI fallback (for MATH/CIS/ESE combos without a Physics/Chem major) ----
export const SECTOR_VI_FALLBACK: readonly string[] = ['PHYS 0150', 'CHEM 1012'];

// ---- College foundational approaches ----
export const FA_REQUIREMENTS: readonly FaRequirement[] = [
  { id: 'WRIT', label: 'Writing Seminar', cu: 1 },
  { id: 'FL',   label: 'Foreign Language', cu: 0, note: 'Fulfilled by 4 semesters, placement, or AP/fluency.' },
  { id: 'FRA',  label: 'Formal Reasoning & Analysis', cu: 1 },
  { id: 'QDA',  label: 'Quantitative Data Analysis', cu: 1 },
  { id: 'CCA',  label: 'Cross-Cultural Analysis', cu: 1 },
  { id: 'CDUS', label: 'Cultural Diversity in the US', cu: 1 },
];

// ---- College sectors ----
export const SECTORS: readonly Sector[] = [
  { id: 'I',   label: 'I. Society' },
  { id: 'II',  label: 'II. History & Tradition' },
  { id: 'III', label: 'III. Arts & Letters' },
  { id: 'IV',  label: 'IV. Humanities & Social Science' },
  { id: 'V',   label: 'V. The Living World' },
  { id: 'VI',  label: 'VI. The Physical World' },
  { id: 'VII', label: 'VII. Natural Science Across Disciplines' },
];

// ---- VIPER-approved energy courses (for elective swaps) ----
export const ENERGY_COURSES: readonly string[] = [
  'MSE 4550', 'MSE 5450', 'MSE 5550',
  'CBE 3250', 'CBE 3750', 'CBE 5050', 'CBE 5440', 'CBE 5450', 'CBE 5460',
  'EAS 3010', 'EAS 4010', 'EAS 4020', 'EAS 4030',
  'MEAM 5020', 'MEAM 5030', 'MEAM 2250',
  'ESE 5210', 'ESE 5800',
  'ENGR 2500', 'EESC 2300', 'EESC 3300', 'ENVS 1000',
];
