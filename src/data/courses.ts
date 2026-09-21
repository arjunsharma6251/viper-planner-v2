import { FALL, SPRING, BOTH } from './types';
import type { Course, CourseEntry } from './types';

/**
 * Central course registry. Every course that appears in a plan must have
 * an entry here — attributes (sector, FA, energy, offering) are looked up
 * from this single source, not duplicated in per-major definitions.
 */
export const COURSES = {
  // ===== Math =====
  'MATH 1400': { title: 'Calculus, Part I', cu: 1, off: FALL, fa: 'FRA' },
  'MATH 1410': { title: 'Calculus, Part II', cu: 1, off: BOTH, prereqs: ['MATH 1400'], fa: 'QDA' },
  'MATH 1510': { title: 'Calculus II with Probability and Matrices', cu: 1, off: BOTH, prereqs: ['MATH 1400'] },
  'MATH 1610': { title: 'Honors Calculus', cu: 1, off: FALL },
  'MATH 2020': { title: 'Proving Things: Analysis', cu: 1, off: FALL, note: 'Seminar requirement for Math majors' },
  'MATH 2030': { title: 'Proving Things: Algebra', cu: 1, off: SPRING },
  'MATH 2400': { title: 'Calculus, Part III', cu: 1, off: BOTH, prereqs: ['MATH 1410'] },
  'MATH 2410': { title: 'Calculus, Part IV', cu: 1, off: SPRING, prereqs: ['MATH 2400'] },
  // Summer 2026: MATH 2200 replaces 2400 and MATH 2300 replaces 2410 (math.upenn.edu).
  'MATH 2200': { title: 'Linear Algebra', cu: 1, off: BOTH, prereqs: ['MATH 1410'] },
  'MATH 2300': { title: 'Introduction to Differential Equations', cu: 1, off: BOTH, prereqs: ['MATH 2200'] },
  'MATH 2600': { title: 'Honors Calculus, Part II', cu: 1, off: SPRING, prereqs: ['MATH 1610'] },
  'MATH 3120': { title: 'Linear Algebra', cu: 1, off: BOTH, prereqs: ['MATH 2400'] },
  'MATH 3130': { title: 'Computational Linear Algebra', cu: 1, off: BOTH, prereqs: ['MATH 2400'] },
  'MATH 3140': { title: 'Advanced Linear Algebra', cu: 1, off: FALL, prereqs: ['MATH 2400', 'MATH 2020'] },
  'MATH 3600': { title: 'Advanced Calculus I', cu: 1, off: FALL, prereqs: ['MATH 2400', 'MATH 3140'] },
  'MATH 3610': { title: 'Advanced Calculus II', cu: 1, off: SPRING, prereqs: ['MATH 3600'] },
  'MATH 3700': { title: 'Algebra I', cu: 1, off: FALL, prereqs: ['MATH 2400', 'MATH 3140'] },
  'MATH 3710': { title: 'Algebra II', cu: 1, off: SPRING, prereqs: ['MATH 3700'] },
  'MATH 4100': { title: 'Complex Analysis', cu: 1, off: FALL, prereqs: ['MATH 2400'] },
  'MATH 4250': { title: 'Partial Differential Equations', cu: 1, off: SPRING, prereqs: ['MATH 2410'] },
  'MATH 4300': { title: 'Differential Geometry', cu: 1, off: SPRING },
  'ENM 2510':  { title: 'Analytical Methods for Engineering', cu: 1, off: SPRING, prereqs: ['MATH 2400'], note: 'Substitutes for MATH 2410' },
  'ESE 2030':  { title: 'Linear Algebra with Applications to Engineering', cu: 1, off: SPRING, prereqs: ['MATH 2400'] },
  'ESE 3010':  { title: 'Engineering Probability', cu: 1, off: FALL, prereqs: ['MATH 2400'], fa: 'QDA' },
  'STAT 4300': { title: 'Probability', cu: 1, off: BOTH, prereqs: ['MATH 2400'], fa: 'QDA' },

  // ===== Physics =====
  'PHYS 0140': { title: 'Principles of Physics I (no lab)', cu: 1, off: FALL },
  'PHYS 0141': { title: 'Principles of Physics II (no lab)', cu: 1, off: SPRING, prereqs: ['PHYS 0140'] },
  'PHYS 0150': { title: 'Principles of Physics I: Mechanics', cu: 1.5, off: FALL, sec: 'VI' },
  'PHYS 0151': { title: 'Principles of Physics II: E&M', cu: 1.5, off: SPRING, prereqs: ['PHYS 0150'], sec: 'VI' },
  'PHYS 0170': { title: 'Honors Physics I: Mechanics', cu: 1.5, off: FALL, sec: 'VI' },
  'PHYS 0171': { title: 'Honors Physics II: E&M', cu: 1.5, off: SPRING, prereqs: ['PHYS 0170'], sec: 'VI' },
  'PHYS 1230': { title: 'Physics III: Waves & Thermal Physics', cu: 1, off: FALL, prereqs: ['PHYS 0151'], isThermo: true },
  'PHYS 1250': { title: 'Physics IV: Modern Physics', cu: 1.5, off: SPRING, prereqs: ['PHYS 1230'] },
  'PHYS 2280': { title: 'Physical Models of Biological Systems', cu: 1, off: BOTH },
  'PHYS 3351': { title: 'Analytical Mechanics', cu: 1, off: SPRING, prereqs: ['PHYS 0150', 'MATH 2410'] },
  'PHYS 3361': { title: 'Electromagnetism I', cu: 1, off: FALL, prereqs: ['PHYS 0151', 'MATH 2410'] },
  'PHYS 3362': { title: 'Electromagnetism II', cu: 1, off: SPRING, prereqs: ['PHYS 3361'] },
  'PHYS 3364': { title: 'Laboratory Electronics', cu: 1, off: SPRING },
  'PHYS 4401': { title: 'Thermodynamics & Statistical Mechanics', cu: 1, off: FALL, prereqs: ['PHYS 1250', 'MATH 2410'] },
  'PHYS 4411': { title: 'Quantum Mechanics I', cu: 1, off: FALL, prereqs: ['PHYS 1250', 'MATH 2410'] },
  'PHYS 4412': { title: 'Quantum Mechanics II', cu: 1, off: SPRING, prereqs: ['PHYS 4411'] },
  'PHYS 4498': { title: 'Senior Honors Thesis', cu: 1, off: BOTH },

  // ===== Chemistry =====
  'CHEM 1011': { title: 'Introduction to General Chemistry I', cu: 1, off: FALL, sec: 'VI' },
  'CHEM 1012': { title: 'General Chemistry I', cu: 1, off: FALL, sec: 'VI' },
  'CHEM 1021': { title: 'Introduction to General Chemistry II', cu: 1, off: SPRING, prereqs: ['CHEM 1011'], sec: 'VI' },
  'CHEM 1022': { title: 'General Chemistry II', cu: 1, off: SPRING, prereqs: ['CHEM 1012'], sec: 'VI' },
  'CHEM 1101': { title: 'General Chemistry Lab I', cu: 0.5, off: FALL, coreqs: ['CHEM 1012'] },
  'CHEM 1102': { title: 'General Chemistry Lab II', cu: 0.5, off: SPRING, coreqs: ['CHEM 1022'] },
  'CHEM 1151': { title: 'Honors Chemistry I', cu: 1, off: FALL, sec: 'VI' },
  'CHEM 1161': { title: 'Honors Chemistry II', cu: 1, off: SPRING, prereqs: ['CHEM 1151'], sec: 'VI' },
  'CHEM 2210': { title: 'Physical Chemistry I', cu: 1, off: FALL, prereqs: ['CHEM 1022', 'MATH 1410', 'PHYS 0151'] },
  'CHEM 2220': { title: 'Physical Chemistry II', cu: 1, off: SPRING, prereqs: ['CHEM 2210'], isThermo: true },
  'CHEM 2230': { title: 'Experimental Physical Chemistry I', cu: 1, off: SPRING, prereqs: ['CHEM 2210'] },
  'CHEM 2410': { title: 'Organic Chemistry I', cu: 1, off: FALL, prereqs: ['CHEM 1022'] },
  'CHEM 2411': { title: 'Organic Chemistry I w/ Lab', cu: 1.5, off: FALL, prereqs: ['CHEM 1022'] },
  'CHEM 2420': { title: 'Organic Chemistry II', cu: 1, off: SPRING, prereqs: ['CHEM 2410'] },
  'CHEM 2421': { title: 'Organic Chemistry II w/ Lab', cu: 1.5, off: SPRING, prereqs: ['CHEM 2411'] },
  'CHEM 2460': { title: 'Advanced Synthesis & Spectroscopy Lab', cu: 1, off: FALL, prereqs: ['CHEM 2421'] },
  'CHEM 2510': { title: 'Principles of Biological Chemistry', cu: 1, off: SPRING, prereqs: ['CHEM 2411'] },
  'CHEM 2610': { title: 'Inorganic Chemistry I', cu: 1, off: FALL, prereqs: ['CHEM 2210'] },
  'CHEM 3999': { title: 'Independent Research', cu: 1, off: BOTH },

  // ===== MSE =====
  'MSE 1010': { title: 'Intro to Materials Science & Engineering', cu: 1, off: FALL },
  'MSE 2010': { title: 'Materials Lab I', cu: 0.5, off: FALL, prereqs: ['MSE 1010'] },
  'MSE 2020': { title: 'Materials Lab II', cu: 0.5, off: SPRING, prereqs: ['MSE 2010'] },
  'MSE 2150': { title: 'Intro to Functional Materials', cu: 1, off: SPRING, prereqs: ['MSE 1010'], energy: true },
  'MSE 2200': { title: 'Fundamentals of Materials Sci & Eng', cu: 1, off: FALL, prereqs: ['MSE 1010'] },
  'MSE 2210': { title: 'Quantum Physics of Materials', cu: 1, off: FALL, prereqs: ['PHYS 0151', 'MATH 2410'] },
  'MSE 2600': { title: 'Energetics of Macro/Nano-scale Materials', cu: 1, off: SPRING, prereqs: ['CHEM 1012', 'MATH 1410'], energy: true, isThermo: true },
  'MSE 3010': { title: 'Materials Lab III', cu: 0.5, off: FALL, prereqs: ['MSE 2020'] },
  'MSE 3300': { title: 'Self-Assembly of Soft Materials', cu: 1, off: FALL, prereqs: ['MSE 2200'] },
  'MSE 3600': { title: 'Structure at the Nanoscale', cu: 1, off: FALL, prereqs: ['MSE 2200'] },
  'MSE 3930': { title: 'Materials Selection', cu: 1, off: SPRING, prereqs: ['MSE 2200'] },
  'MSE 4050': { title: 'Mechanical Properties', cu: 1, off: SPRING, prereqs: ['MSE 2200'] },
  'MSE 4400': { title: 'Phase Transformations', cu: 1, off: SPRING, prereqs: ['MSE 2600', 'MSE 2200'] },
  'MSE 4550': { title: 'Electrochemical Engineering of Materials', cu: 1, off: BOTH, energy: true },
  'MSE 4600': { title: 'Computational Materials Science', cu: 1, off: FALL, prereqs: ['MSE 2210'] },
  'MSE 4950': { title: 'Senior Design I', cu: 1, off: FALL, prereqs: ['MSE 3300'] },
  'MSE 4960': { title: 'Senior Design II', cu: 1, off: SPRING, prereqs: ['MSE 4950'] },
  'MSE 5450': { title: 'Materials for Energy & Sustainability', cu: 1, off: BOTH, energy: true },
  'MSE 5550': { title: 'Electrochemical Engineering of Materials (grad)', cu: 1, off: SPRING, energy: true },

  // ===== CBE =====
  'CBE 1500': { title: 'Introduction to Biotechnology', cu: 1, off: BOTH },
  'CBE 1600': { title: 'Introduction to Chemical Engineering', cu: 1, off: FALL },
  'CBE 2300': { title: 'Material and Energy Balances', cu: 1, off: FALL, prereqs: ['CBE 1600', 'CHEM 1012'] },
  'CBE 2310': { title: 'Thermodynamics of Fluids', cu: 1, off: SPRING, prereqs: ['CBE 2300'], isThermo: true },
  'CBE 3250': { title: 'Renewable Energy', cu: 1, off: SPRING, energy: true },
  'CBE 3500': { title: 'Fluid Mechanics', cu: 1, off: SPRING, prereqs: ['CBE 2310', 'MATH 2410'] },
  'CBE 3510': { title: 'Heat and Mass Transport', cu: 1, off: FALL, prereqs: ['CBE 3500'] },
  'CBE 3530': { title: 'Molecular Thermo & Chemical Kinetics', cu: 1, off: SPRING, prereqs: ['CBE 2310'] },
  'CBE 3600': { title: 'Chemical Process Control', cu: 1, off: FALL, prereqs: ['CBE 3500'] },
  'CBE 3710': { title: 'Separation Processes', cu: 1, off: SPRING, prereqs: ['CBE 3510'] },
  'CBE 3750': { title: 'Engineering and the Environment', cu: 1, off: BOTH, energy: true },
  'CBE 4000': { title: 'Intro to Product & Process Design', cu: 1, off: FALL, prereqs: ['CBE 3710', 'CBE 3600'] },
  'CBE 4100': { title: 'Chemical Engineering Laboratory', cu: 1, off: FALL, prereqs: ['CBE 3510'] },
  'CBE 4300': { title: 'Introduction to Polymers', cu: 1, off: BOTH },
  'CBE 4510': { title: 'Chemical Reactor Design', cu: 1, off: FALL, prereqs: ['CBE 3530'] },
  'CBE 4590': { title: 'Product & Process Design Projects', cu: 1, off: SPRING, prereqs: ['CBE 4000'] },
  'CBE 4790': { title: 'Biotechnology and Biochemical Engineering', cu: 1, off: BOTH },
  'CBE 4800': { title: 'Laboratory in Biotechnology', cu: 1, off: BOTH },
  'CBE 5050': { title: 'Carbon Capture', cu: 1, off: BOTH, energy: true },
  'CBE 5440': { title: 'Computational Science of Energy', cu: 1, off: BOTH, energy: true },
  'CBE 5450': { title: 'Electrochemical Energy Conversion & Storage', cu: 1, off: BOTH, energy: true },
  'CBE 5460': { title: 'Industrial Catalytic Processes', cu: 1, off: BOTH, energy: true },

  // ===== MEAM =====
  'MEAM 1010': { title: 'Intro to Mechanical Design', cu: 1, off: BOTH },
  'MEAM 1100': { title: 'Introduction to Mechanics', cu: 1, off: FALL, sec: 'VI' },
  'MEAM 1470': { title: 'Introduction to Mechanics Lab', cu: 0.5, off: FALL, coreqs: ['MEAM 1100'] },
  'MEAM 2020': { title: 'Intro to Thermal-Fluids Engineering', cu: 1, off: SPRING, prereqs: ['PHYS 0151', 'MATH 1410'] },
  'MEAM 2030': { title: 'Thermodynamics', cu: 1, off: FALL, prereqs: ['PHYS 0150'], isThermo: true },
  'MEAM 2100': { title: 'Statics and Strength of Materials', cu: 1, off: FALL, prereqs: ['PHYS 0150', 'MATH 1410'] },
  'MEAM 2110': { title: 'Engineering Mechanics: Dynamics', cu: 1, off: SPRING, prereqs: ['MEAM 2100'] },
  'MEAM 2250': { title: 'Engineering in the Environment', cu: 1, off: BOTH, energy: true },
  'MEAM 2470': { title: 'ME Laboratory I', cu: 0.5, off: FALL },
  'MEAM 2480': { title: 'ME Laboratory I', cu: 0.5, off: SPRING, prereqs: ['MEAM 2470'] },
  'MEAM 3020': { title: 'Fluid Mechanics', cu: 1, off: FALL, prereqs: ['MEAM 2020', 'MATH 2410'] },
  'MEAM 3200': { title: 'Mechatronic Systems', cu: 1, off: FALL, prereqs: ['MEAM 2110'] },
  'MEAM 3210': { title: 'Dynamic Systems and Control', cu: 1, off: SPRING, prereqs: ['MEAM 2110'] },
  'MEAM 3330': { title: 'Heat and Mass Transfer', cu: 1, off: SPRING, prereqs: ['MEAM 3020'] },
  'MEAM 3470': { title: 'ME Design Laboratory', cu: 1, off: FALL, prereqs: ['MEAM 2480'] },
  'MEAM 3480': { title: 'ME Design Laboratory', cu: 1, off: SPRING, prereqs: ['MEAM 3470'] },
  'MEAM 3540': { title: 'Mechanics of Solids', cu: 1, off: FALL, prereqs: ['MEAM 2100'] },
  'MEAM 4450': { title: 'ME Design Projects', cu: 1, off: FALL, prereqs: ['MEAM 3480'] },
  'MEAM 4460': { title: 'ME Design Projects', cu: 1, off: SPRING, prereqs: ['MEAM 4450'] },
  'MEAM 5020': { title: 'Energy Engineering in Power Plants & Transport', cu: 1, off: BOTH, energy: true },
  'MEAM 5030': { title: 'Direct Energy Conversion: Macro to Nano', cu: 1, off: BOTH, energy: true },

  // ===== ESE (EE track) =====
  'ESE 1110': { title: 'Atoms, Bits, Circuits and Systems', cu: 1, off: FALL },
  'ESE 1120': { title: 'Engineering Electromagnetics', cu: 1.5, off: SPRING, prereqs: ['PHYS 0150', 'MATH 1410'] },
  'ESE 2150': { title: 'Electrical Circuits and Systems', cu: 1.5, off: FALL, prereqs: ['ESE 1110', 'MATH 1410'] },
  'ESE 2180': { title: 'Electronic, Photonic, EM Devices', cu: 1.5, off: SPRING, prereqs: ['ESE 2150'] },
  'ESE 2240': { title: 'Signal and Information Processing', cu: 1.5, off: SPRING, prereqs: ['ESE 2150'] },
  'ESE 2900': { title: 'Intro to ESE Research Methodology', cu: 0.5, off: FALL, prereqs: ['ESE 2150'] },
  'ESE 2910': { title: 'Intro to ESE Research and Design', cu: 1, off: SPRING, prereqs: ['ESE 2900'] },
  'ESE 3500': { title: 'Embedded Systems/Microcontroller Lab', cu: 1, off: BOTH },
  'ESE 4500': { title: 'Senior Design Project I', cu: 1, off: FALL, prereqs: ['ESE 2240'] },
  'ESE 4510': { title: 'Senior Design Project II', cu: 1, off: SPRING, prereqs: ['ESE 4500'] },
  'ESE 5210': { title: 'Physics of Solid State Energy Devices', cu: 1, off: BOTH, energy: true },
  'ESE 5800': { title: 'Power Electronics', cu: 1, off: BOTH, energy: true },

  // ===== CIS =====
  'CIS 1100': { title: 'Intro to Computer Programming', cu: 1, off: FALL },
  'CIS 1200': { title: 'Programming Languages & Techniques I', cu: 1, off: BOTH, prereqs: ['CIS 1100'] },
  'CIS 1210': { title: 'Programming Languages & Techniques II', cu: 1, off: BOTH, prereqs: ['CIS 1200'] },
  'CIS 1600': { title: 'Math Foundations of CS', cu: 1, off: BOTH },
  'CIS 2400': { title: 'Intro to Computer Systems', cu: 1, off: BOTH, prereqs: ['CIS 1210'] },
  'CIS 2610': { title: 'Discrete Probability & Statistics', cu: 1, off: BOTH, prereqs: ['CIS 1600'], fa: 'QDA' },
  'CIS 2620': { title: 'Automata, Computability & Complexity', cu: 1, off: BOTH, prereqs: ['CIS 1600'] },
  'CIS 3200': { title: 'Intro to Algorithms', cu: 1, off: BOTH, prereqs: ['CIS 1210', 'CIS 2620'] },
  'CIS 4000': { title: 'Senior Project', cu: 1, off: FALL, prereqs: ['CIS 3200'] },
  'CIS 4010': { title: 'Senior Project', cu: 1, off: SPRING, prereqs: ['CIS 4000'] },
  'CIS 4480': { title: 'Operating Systems Design', cu: 1, off: BOTH, prereqs: ['CIS 2400'] },
  'CIS 4710': { title: 'Computer Organization & Design', cu: 1, off: BOTH, prereqs: ['CIS 2400'] },

  // ===== EESC =====
  'EESC 1060': { title: 'Natural Disturbances & Disasters', cu: 1, off: FALL, sec: 'VII' },
  'EESC 1090': { title: 'Earth Systems Science', cu: 1, off: FALL, sec: 'VII' },
  'EESC 1500': { title: 'Paleontology', cu: 1, off: FALL, sec: 'VII' },
  'EESC 2200': { title: 'Intro to Mineralogy', cu: 1, off: FALL, prereqs: ['EESC 1090'] },
  'EESC 2300': { title: 'Global Climate Change', cu: 1, off: SPRING, energy: true, sec: 'VII' },
  'EESC 2500': { title: 'Earth and Life Through Time', cu: 1, off: SPRING },
  'EESC 3300': { title: 'Glaciers, Ice & Climate', cu: 1, off: SPRING, energy: true },
  'EESC 4200': { title: 'Geochemistry', cu: 1, off: FALL, prereqs: ['CHEM 1022', 'EESC 1090'] },
  'EESC 4336': { title: 'Ocean-Atmosphere Dynamics', cu: 1, off: SPRING, energy: true },
  'EESC 4700': { title: 'Remote Sensing', cu: 1, off: FALL, prereqs: ['MATH 1410'] },
  'EESC 4800': { title: 'Introduction to Geophysics', cu: 1, off: SPRING },

  // ===== EAS (Engineering & Applied Sciences — cross-cutting) =====
  'EAS 0091': { title: 'Chemistry AP Credit (Engineering)', cu: 1, off: BOTH, note: 'Not accepted by CHEM/CBE majors' },
  'EAS 2030': { title: 'Engineering Ethics', cu: 1, off: BOTH },
  'EAS 3010': { title: 'Climate Policy and Technology', cu: 1, off: BOTH, energy: true },
  'EAS 4010': { title: 'Energy & Its Impacts', cu: 1, off: BOTH, energy: true },
  'EAS 4020': { title: 'Renewable Energy & Its Impacts', cu: 1, off: BOTH, energy: true },
  'EAS 4030': { title: 'Energy Systems and Policy', cu: 1, off: BOTH, energy: true },
  'EAS 5450': { title: 'Engineering Entrepreneurship I', cu: 1, off: FALL },
  'EAS 5460': { title: 'Engineering Entrepreneurship II', cu: 1, off: SPRING },
  'EAS 5470': { title: 'Technology, Innovation & Entrepreneurship', cu: 1, off: SPRING },
  'ENGR 1050': { title: 'Intro to Scientific Computing', cu: 1, off: SPRING },
  'ENGR 2500': { title: 'Energy Systems, Resources and Technology', cu: 1, off: BOTH, energy: true },
  'ENVS 1000': { title: 'Intro to Environmental Science', cu: 1, off: BOTH, sec: 'V' },

  // ===== Popular SAS gen-ed double-counters =====
  'WRIT 0130': { title: 'Critical Writing Seminar', cu: 1, off: BOTH, fa: 'WRIT', isWritSem: true },
  'SAST 0004': { title: 'Intro to South Asian Cultures', cu: 1, off: FALL, fa: 'CCA', sec: 'III' },
  'SOCI 0006': { title: 'Race & Ethnic Relations', cu: 1, off: SPRING, fa: 'CDUS', sec: 'I' },
  'STSC 1880': { title: 'Energy & Society', cu: 1, off: SPRING, sec: 'IV' },
  'PSYC 0001': { title: 'Intro Psychology', cu: 1, off: FALL, sec: 'V' },
  'CIMS 1004': { title: 'World Film History', cu: 1, off: FALL, sec: 'II' },
  'LGST 1000': { title: 'Ethics & Social Responsibility', cu: 1, off: SPRING },
  'ECON 0100': { title: 'Intro to Microeconomics', cu: 1, off: BOTH, sec: 'I' },
  'HIST 1708': { title: 'History of American Capitalism', cu: 1, off: BOTH, sec: 'II' },
  'ENGL 0040': { title: 'Intro to Literary Study', cu: 1, off: BOTH, sec: 'III' },
  'ANTH 0030': { title: 'Human Origins, Evolution and Diversity', cu: 1, off: BOTH },
  'BIOL 1101': { title: 'Intro Biology A', cu: 1, off: FALL, sec: 'V' },
  'BIOL 1102': { title: 'Intro Biology B', cu: 1, off: SPRING, sec: 'V' },
  'BIOL 1121': { title: 'Intro Biology — Molecular', cu: 1, off: FALL, sec: 'V' },
} satisfies Record<string, Course>;

/** A course code known to the catalog. */
export type CourseCode = keyof typeof COURSES;

/**
 * Look up a course's full metadata. Returns null if unknown.
 */
export function lookupCourse(code: string): Course | null {
  return (COURSES as Record<string, Course>)[code] ?? null;
}

/**
 * Expand a course code into a placement-ready entry with default values.
 */
export function courseEntry(code: string, overrides: Partial<CourseEntry> = {}): CourseEntry {
  const base = lookupCourse(code);
  if (!base) {
    console.warn(`Unknown course: ${code}`);
    return {
      code,
      title: code,
      cu: 1,
      off: BOTH,
      prereqs: [],
      coreqs: [],
      fa: null,
      sec: null,
      energy: false,
      isThermo: false,
      isWritSem: false,
      note: null,
      ...overrides,
    };
  }
  return {
    code,
    title: base.title,
    cu: base.cu,
    off: base.off,
    prereqs: base.prereqs || [],
    coreqs: base.coreqs || [],
    fa: base.fa || null,
    sec: base.sec || null,
    energy: !!base.energy,
    isThermo: !!base.isThermo,
    isWritSem: !!base.isWritSem,
    note: base.note || null,
    ...overrides,
  };
}
