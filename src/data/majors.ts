import type { ElectiveSlot, Major } from './types';

/**
 * Major definitions. Each major has:
 *   • school — 'SAS' or 'SEAS'
 *   • code, fullName, minCU
 *   • autoSector — sector automatically completed by declaring this major (null if none)
 *   • concentrations — dict of concentration objects
 *   • sharedCore — course codes always required
 *   • notes — advisory text
 *
 * Each concentration adds:
 *   • label, default (bool)
 *   • extraCore — additional required course codes
 *   • electiveSlots — slot definitions (each becomes an editable line)
 */
export const MAJORS: Record<string, Major> = {
  // =============================== SAS ===============================

  PHYS: {
    school: 'SAS', code: 'PHYS', fullName: 'Physics & Astronomy', minCU: 32, autoSector: 'VI',
    sharedCore: [
      'MATH 1400', 'MATH 1410', 'MATH 2400', 'MATH 2410',
      'PHYS 0150', 'PHYS 0151', 'PHYS 1230', 'PHYS 1250',
      'PHYS 3351', 'PHYS 3361', 'PHYS 3362',
    ],
    sampleSchedule: {
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'MATH 2400': 'fall-y2', 'MATH 2410': 'spring-y2',
      'PHYS 0150': 'fall-y1', 'PHYS 0151': 'spring-y1',
      'PHYS 1230': 'fall-y2', 'PHYS 1250': 'spring-y2',
      'PHYS 3361': 'fall-y3', 'PHYS 3351': 'spring-y3', 'PHYS 3362': 'spring-y3',
    },
    concentrations: {
      PTET: {
        label: 'Physical Theory & Experimental Technique',
        default: true,
        note: 'For students planning graduate study in Physics.',
        extraCore: ['PHYS 4401', 'PHYS 4411', 'PHYS 4412'],
        sampleSchedule: {
          'PHYS 4401': 'fall-y4', 'PHYS 4411': 'fall-y4', 'PHYS 4412': 'spring-y4',
        },
        electiveSlots: [
          { id: 'phys-lab',  label: 'Physics Lab Elective (APHL)', cu: 1, pool: ['PHYS 3364'] },
          { id: 'phys-adv',  label: 'PHYS/ASTR 3000-4000 Elective', cu: 1 },
        ],
      },
      ASTRO: {
        label: 'Astrophysics',
        note: 'For students planning graduate study in Astrophysics.',
        extraCore: ['PHYS 4411'],
        electiveSlots: [
          { id: 'astr-1', label: 'Astronomy Core', cu: 1 },
          { id: 'astr-2', label: 'Astronomy Core', cu: 1 },
          { id: 'astr-3', label: 'Astrophysics Elective', cu: 1 },
          { id: 'phys-lab', label: 'Physics Lab Elective', cu: 1 },
        ],
      },
      BIO: {
        label: 'Biological Physics',
        extraCore: ['PHYS 4411', 'PHYS 2280'],
        electiveSlots: [
          { id: 'bio-phys-1', label: 'Biology Elective', cu: 1 },
          { id: 'bio-phys-2', label: 'Physical Biology Elective', cu: 1 },
          { id: 'phys-lab', label: 'Physics Lab Elective', cu: 1 },
        ],
      },
      BIZ: {
        label: 'Business & Technology',
        note: 'Combines Physics with electronics and modern business.',
        extraCore: [],
        electiveSlots: [
          { id: 'biz-1', label: 'Business/Economics Elective', cu: 1 },
          { id: 'biz-2', label: 'Business/Economics Elective', cu: 1 },
          { id: 'phys-elec', label: 'Physics Elective', cu: 1 },
          { id: 'phys-lab', label: 'Physics Lab Elective', cu: 1 },
        ],
      },
      CHEM: {
        label: 'Chemical Principles',
        note: 'Appropriate for students going into health professions.',
        extraCore: ['CHEM 2411', 'CHEM 2421'],
        electiveSlots: [
          { id: 'chem-phys-1', label: 'Chemistry Elective', cu: 1 },
          { id: 'phys-lab', label: 'Physics Lab Elective', cu: 1 },
        ],
      },
      CS: {
        label: 'Computer Techniques',
        extraCore: ['CIS 1100', 'CIS 1200'],
        electiveSlots: [
          { id: 'cs-phys-1', label: 'CS Elective', cu: 1 },
          { id: 'cs-phys-2', label: 'CS Elective', cu: 1 },
          { id: 'phys-lab', label: 'Physics Lab Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'The Physics major auto-completes Sector VI (Physical World).',
      'MATH 2410 may be replaced by ENM 2510 or MATH 4250 (PDE).',
      'Honors track adds 2 CU of PHYS 4498 Senior Thesis (optional).',
    ],
  },

  CHEM: {
    school: 'SAS', code: 'CHEM', fullName: 'Chemistry', minCU: 32, autoSector: 'VI',
    sharedCore: [
      'MATH 1400', 'MATH 1410',
      'CHEM 1012', 'CHEM 1022', 'CHEM 1101', 'CHEM 1102',
      'CHEM 2411', 'CHEM 2421',
      'PHYS 0150', 'PHYS 0151',
      'CHEM 2210', 'CHEM 2220', 'CHEM 2230',
      'CHEM 2510', 'CHEM 2610', 'CHEM 2460',
    ],
    sampleSchedule: {
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'CHEM 1012': 'fall-y1', 'CHEM 1101': 'fall-y1',
      'CHEM 1022': 'spring-y1', 'CHEM 1102': 'spring-y1',
      'PHYS 0150': 'fall-y2', 'PHYS 0151': 'spring-y2',
      'CHEM 2411': 'fall-y2', 'CHEM 2421': 'spring-y2',
      'CHEM 2210': 'fall-y3', 'CHEM 2610': 'fall-y3', 'CHEM 2460': 'fall-y3',
      'CHEM 2220': 'spring-y3', 'CHEM 2230': 'spring-y3', 'CHEM 2510': 'spring-y3',
    },
    concentrations: {
      STANDARD: { label: 'Standard BA', default: true, extraCore: [], electiveSlots: [] },
    },
    substitutions: [
      { from: 'CHEM 2220', to: 'CBE 3530', context: 'CHEM-CBE combo', note: 'CBE 3530 may replace CHEM 2220' },
      { from: 'CHEM 2210', to: 'MSE 2210', context: 'CHEM-MSE combo', note: 'MSE 2210 may replace CHEM 2210' },
    ],
    notes: [
      'CHEM major auto-completes Sector VI (Physical World).',
      'AP Chemistry (EAS 0091) is NOT accepted — take Penn CHEM 1012 placement exam or CHEM 1012 at Penn.',
      'Complete the introductory sequences by end of sophomore year.',
      'Common VIPER substitutions: MSE 2210 → CHEM 2210 (CHEM-MSE), CBE 3530 → CHEM 2220 (CHEM-CBE).',
    ],
  },

  MATH: {
    school: 'SAS', code: 'MATH', fullName: 'Mathematics', minCU: 32, autoSector: 'VII',
    sharedCore: [
      'MATH 1400', 'MATH 1410', 'MATH 2400',
      'MATH 2020',  // seminar requirement
      'MATH 3140',  // advanced linear algebra
      'MATH 4100',  // complex analysis
      'MATH 2410',  // differential equations
    ],
    sampleSchedule: {
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'MATH 2400': 'fall-y2', 'MATH 2020': 'fall-y2',
      'MATH 2410': 'spring-y2',
      'MATH 3140': 'fall-y3', 'MATH 4100': 'spring-y3',
    },
    concentrations: {
      GENERAL: {
        label: 'General Mathematics',
        default: true,
        extraCore: ['MATH 3600', 'MATH 3610', 'MATH 3700', 'MATH 3710'],
        sampleSchedule: {
          'MATH 3600': 'fall-y3', 'MATH 3610': 'spring-y3',
          'MATH 3700': 'fall-y4', 'MATH 3710': 'spring-y4',
        },
        electiveSlots: [
          { id: 'math-elec-1', label: 'Math Elective (3000+)', cu: 1 },
          { id: 'math-elec-2', label: 'Math Elective (3000+)', cu: 1 },
          { id: 'math-elec-3', label: 'Math Elective or Cognate', cu: 1 },
        ],
      },
      APPLIED: {
        label: 'Applied Mathematics',
        extraCore: ['MATH 3600', 'MATH 4250'],
        electiveSlots: [
          { id: 'math-app-1', label: 'Applied Math Elective', cu: 1 },
          { id: 'math-app-2', label: 'Applied Math Elective', cu: 1 },
          { id: 'math-app-3', label: 'Math or Cognate', cu: 1 },
          { id: 'math-app-4', label: 'Math or Cognate', cu: 1 },
        ],
      },
      COMPUTE: {
        label: 'Computational Mathematics',
        extraCore: ['CIS 1100', 'CIS 1200'],
        electiveSlots: [
          { id: 'math-comp-1', label: 'Computational Math Elective', cu: 1 },
          { id: 'math-comp-2', label: 'Computational Math Elective', cu: 1 },
          { id: 'math-comp-3', label: 'CS or Applied Math Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'MATH major auto-completes Sector VII (Natural Science Across Disciplines).',
      'Must complete 1 proof-based course (MATH 2020/2030/1610/2600/3140) by end of sophomore year.',
      'MATH + CIS VIPER combo requires ONE additional thermodynamics course.',
      'Double majors: maintain 3.0+ cumulative GPA, 3.0+ math GPA, no math grade below B−.',
    ],
  },

  EESC: {
    school: 'SAS', code: 'EESC', fullName: 'Earth & Environmental Science', minCU: 32, autoSector: 'VII',
    sharedCore: [
      'EESC 1090', 'MATH 1400', 'MATH 1410',
      'CHEM 1012', 'CHEM 1022',
      'PHYS 0150', 'PHYS 0151',
      'EESC 2200', 'EESC 4200', 'EESC 2300',
      'STAT 4300',
    ],
    sampleSchedule: {
      'EESC 1090': 'fall-y1',
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'CHEM 1012': 'fall-y1', 'CHEM 1022': 'spring-y1',
      'PHYS 0150': 'fall-y2', 'PHYS 0151': 'spring-y2',
      'EESC 2200': 'fall-y2', 'EESC 2300': 'spring-y2',
      'EESC 4200': 'fall-y3', 'STAT 4300': 'spring-y3',
    },
    concentrations: {
      STANDARD: {
        label: 'Earth Science',
        default: true,
        extraCore: ['EESC 4700'],
        electiveSlots: [
          { id: 'eesc-deep', label: 'AERE Elective (Deep Time)', cu: 1, pool: ['EESC 1500', 'EESC 2500'] },
          { id: 'eesc-clim', label: 'AERE Elective (Climate)', cu: 1, energy: true, pool: ['EESC 3300', 'EESC 4336'] },
          { id: 'eesc-gen-1', label: 'AERE Elective', cu: 1 },
          { id: 'eesc-gen-2', label: 'AERE Elective', cu: 1 },
          { id: 'eesc-gen-3', label: 'AERE Elective', cu: 1 },
          { id: 'eesc-gen-4', label: 'AERE Elective', cu: 1 },
        ],
      },
      ENV: {
        label: 'Environmental Science',
        extraCore: ['BIOL 1121', 'ENVS 1000'],
        electiveSlots: [
          { id: 'env-1', label: 'Environmental Systems Elective', cu: 1 },
          { id: 'env-2', label: 'Environmental Policy/Ecology Elective', cu: 1 },
          { id: 'env-3', label: 'AERE Elective', cu: 1 },
          { id: 'env-4', label: 'AERE Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'EESC major auto-completes Sector VII (Natural Science Across Disciplines).',
      'EESC 2300 Global Climate Change counts as a VIPER energy course.',
      'Natural overlap with CBE/MSE energy concentrations — strong double-counting opportunities.',
    ],
  },

  // =============================== SEAS ===============================

  MSE: {
    school: 'SEAS', code: 'MSE', fullName: 'Materials Science & Engineering', minCU: 37,
    sharedCore: [
      'MSE 1010', 'MSE 2010', 'MSE 2020', 'MSE 2150',
      'MSE 2200', 'MSE 2210', 'MSE 2600',
      'MSE 3010', 'MSE 3300', 'MSE 3600', 'MSE 3930',
      'MSE 4050', 'MSE 4400', 'MSE 4600', 'MSE 4950', 'MSE 4960',
      'MATH 1400', 'MATH 1410', 'MATH 2400', 'MATH 2410',
      'PHYS 0150', 'PHYS 0151',
      'CHEM 1012', 'CHEM 1101', 'CHEM 1022',
      'ENGR 1050',
    ],
    sampleSchedule: {
      'MSE 1010': 'fall-y1',
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'CHEM 1012': 'fall-y1', 'CHEM 1101': 'fall-y1', 'CHEM 1022': 'spring-y1',
      'MSE 2150': 'spring-y1',
      'ENGR 1050': 'spring-y1',
      'PHYS 0150': 'fall-y2', 'PHYS 0151': 'spring-y2',
      'MATH 2400': 'fall-y2', 'MATH 2410': 'spring-y2',
      'MSE 2010': 'fall-y2', 'MSE 2200': 'fall-y2', 'MSE 2210': 'fall-y2',
      'MSE 2020': 'spring-y2', 'MSE 2600': 'spring-y2',
      'MSE 3010': 'fall-y3', 'MSE 3300': 'fall-y3', 'MSE 3600': 'fall-y3',
      'MSE 3930': 'spring-y3', 'MSE 4050': 'spring-y3', 'MSE 4400': 'spring-y3',
      'MSE 4600': 'fall-y4', 'MSE 4950': 'fall-y4', 'MSE 4960': 'spring-y4',
    },
    concentrations: {
      ENERGY: {
        label: 'Energy & Sustainability',
        default: true,
        note: 'Recommended for VIPER students.',
        extraCore: [],
        electiveSlots: [
          { id: 'mse-math', label: 'Math Elective', cu: 1, pool: ['MATH 3130', 'MATH 4100'] },
          { id: 'mse-energy-1', label: 'MSE Elective / Energy Course', cu: 1, energy: true, pool: ['MSE 4550'] },
          { id: 'mse-energy-2', label: 'MSE Elective / Energy Course', cu: 1, energy: true, pool: ['MSE 5450'] },
          { id: 'mse-tech-1', label: 'Tech Elective', cu: 1, note: 'Waived via PHYS 0150/0151 per VIPER' },
          { id: 'mse-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'mse-free', label: 'Free Elective', cu: 1 },
        ],
      },
      BIO: {
        label: 'Biomaterials & Biomimetics',
        extraCore: [],
        electiveSlots: [
          { id: 'mse-math', label: 'Math Elective', cu: 1 },
          { id: 'mse-bio-1', label: 'Biomaterials Elective', cu: 1 },
          { id: 'mse-bio-2', label: 'Biomaterials Elective', cu: 1 },
          { id: 'mse-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'mse-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'mse-free', label: 'Free Elective', cu: 1 },
        ],
      },
      ELEC: {
        label: 'Electronic & Optical Devices',
        extraCore: [],
        electiveSlots: [
          { id: 'mse-math', label: 'Math Elective', cu: 1 },
          { id: 'mse-elec-1', label: 'Devices Elective', cu: 1 },
          { id: 'mse-elec-2', label: 'Devices Elective', cu: 1 },
          { id: 'mse-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'mse-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'mse-free', label: 'Free Elective', cu: 1 },
        ],
      },
      NANO: {
        label: 'Nanotechnology',
        extraCore: [],
        electiveSlots: [
          { id: 'mse-math', label: 'Math Elective', cu: 1 },
          { id: 'mse-nano-1', label: 'Nano Elective', cu: 1 },
          { id: 'mse-nano-2', label: 'Nano Elective', cu: 1 },
          { id: 'mse-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'mse-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'mse-free', label: 'Free Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'VIPR 1200/1210 may replace EAS 2030 OR count as an engineering elective — choose one.',
      'MSE 2600 satisfies the thermodynamics requirement for MATH+CIS combos.',
      'VIPER-aligned energy electives: MSE 4550, MSE 5450, MSE 5550.',
      'MATH 2400 may be replaced by ENM 2400 or ESE 2030.',
    ],
  },

  CBE: {
    school: 'SEAS', code: 'CBE', fullName: 'Chemical & Biomolecular Engineering', minCU: 37,
    sharedCore: [
      'CBE 1600', 'CBE 2300', 'CBE 2310',
      'CBE 3500', 'CBE 3510', 'CBE 3530', 'CBE 3600', 'CBE 3710',
      'CBE 4000', 'CBE 4100', 'CBE 4510', 'CBE 4590',
      'ENGR 1050',
      'MATH 1400', 'MATH 1410', 'MATH 2400', 'MATH 2410',
      'PHYS 0150', 'PHYS 0151',
      'CHEM 1012', 'CHEM 1101', 'CHEM 1022', 'CHEM 1102',
      'CHEM 2411',
    ],
    sampleSchedule: {
      'CBE 1600': 'fall-y1',
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'CHEM 1012': 'fall-y1', 'CHEM 1101': 'fall-y1',
      'CHEM 1022': 'spring-y1', 'CHEM 1102': 'spring-y1',
      'ENGR 1050': 'spring-y1',
      'PHYS 0150': 'fall-y2', 'PHYS 0151': 'spring-y2',
      'MATH 2400': 'fall-y2', 'MATH 2410': 'spring-y2',
      'CBE 2300': 'fall-y2', 'CHEM 2411': 'fall-y2',
      'CBE 2310': 'spring-y2', 'CBE 3500': 'spring-y2',
      'CBE 3510': 'fall-y3', 'CBE 3600': 'fall-y3',
      'CBE 3530': 'spring-y3', 'CBE 3710': 'spring-y3',
      'CBE 4000': 'fall-y4', 'CBE 4100': 'fall-y4', 'CBE 4510': 'fall-y4',
      'CBE 4590': 'spring-y4',
    },
    concentrations: {
      ENERGY: {
        label: 'Energy & the Environment',
        default: true,
        note: 'VIPER-recommended concentration.',
        extraCore: [],
        electiveSlots: [
          { id: 'cbe-adv', label: 'Advanced Chem Elective', cu: 1, pool: ['CHEM 2421', 'CHEM 2210', 'MSE 2210'] },
          { id: 'cbe-lab', label: 'Lab Elective', cu: 1, note: 'CHEM 2411 + 2421 sequence covers this' },
          { id: 'cbe-elec', label: 'CBE Elective (3000+)', cu: 1 },
          { id: 'cbe-eng', label: 'Engineering Elective', cu: 1 },
          { id: 'cbe-msen-1', label: 'Math/NatSci/Eng Elective', cu: 1 },
          { id: 'cbe-msen-2', label: 'Math/NatSci/Eng Elective', cu: 1 },
          { id: 'cbe-conc-1', label: 'Concentration 1 / Energy', cu: 1, energy: true, pool: ['CBE 3250'] },
          { id: 'cbe-conc-2', label: 'Concentration 2 / Energy', cu: 1, energy: true, pool: ['CBE 5450'] },
          { id: 'cbe-conc-3', label: 'Concentration 3 / Energy', cu: 1, energy: true, pool: ['CBE 5050'] },
          { id: 'cbe-conc-4', label: 'Concentration 4 / Energy', cu: 1, energy: true, pool: ['MSE 4550', 'MSE 5450'] },
          { id: 'cbe-free', label: 'Free Elective', cu: 1 },
        ],
      },
      PHARMA: {
        label: 'Pharmaceutics & Biotechnology',
        extraCore: [],
        electiveSlots: [
          { id: 'cbe-adv', label: 'Advanced Chem Elective', cu: 1, pool: ['CHEM 2421', 'CHEM 2210'] },
          { id: 'cbe-lab', label: 'Lab Elective', cu: 1 },
          { id: 'cbe-elec', label: 'CBE Elective (3000+)', cu: 1 },
          { id: 'cbe-eng', label: 'Engineering Elective', cu: 1 },
          { id: 'cbe-msen-1', label: 'Math/NatSci/Eng Elective', cu: 1 },
          { id: 'cbe-msen-2', label: 'Math/NatSci/Eng Elective', cu: 1 },
          { id: 'cbe-conc-1', label: 'Biotech Concentration', cu: 1, pool: ['CBE 1500', 'CBE 4790'] },
          { id: 'cbe-conc-2', label: 'Biotech Concentration', cu: 1, pool: ['CBE 4800'] },
          { id: 'cbe-conc-3', label: 'Biotech Concentration', cu: 1 },
          { id: 'cbe-conc-4', label: 'Biotech Concentration', cu: 1 },
          { id: 'cbe-free', label: 'Free Elective', cu: 1 },
        ],
      },
      POLYMER: {
        label: 'Polymers & Soft Matter',
        extraCore: [],
        electiveSlots: [
          { id: 'cbe-adv', label: 'Advanced Chem Elective', cu: 1 },
          { id: 'cbe-lab', label: 'Lab Elective', cu: 1 },
          { id: 'cbe-elec', label: 'CBE Elective (3000+)', cu: 1 },
          { id: 'cbe-eng', label: 'Engineering Elective', cu: 1 },
          { id: 'cbe-msen-1', label: 'Math/NatSci/Eng Elective', cu: 1 },
          { id: 'cbe-msen-2', label: 'Math/NatSci/Eng Elective', cu: 1 },
          { id: 'cbe-conc-1', label: 'Polymers Concentration', cu: 1, pool: ['CBE 4300'] },
          { id: 'cbe-conc-2', label: 'Polymers Concentration', cu: 1 },
          { id: 'cbe-conc-3', label: 'Polymers Concentration', cu: 1 },
          { id: 'cbe-conc-4', label: 'Polymers Concentration', cu: 1 },
          { id: 'cbe-free', label: 'Free Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'CBE does NOT accept AP Chemistry (EAS 0091). Take Penn placement exam or CHEM 1012.',
      'CBE 3510 and CHEM 2220 often conflict in Junior Spring — delay CBE 3510 to senior year if doing CHEM dual.',
      'CBE 2310 satisfies the thermodynamics requirement for MATH+CIS combos.',
      '1 less Tech Elective required if PHYS 0150/0151 taken (VIPER students automatically qualify).',
    ],
  },

  MEAM: {
    school: 'SEAS', code: 'MEAM', fullName: 'Mechanical Engineering & Applied Mechanics', minCU: 37,
    sharedCore: [
      'MEAM 2020', 'MEAM 2030', 'MEAM 2100', 'MEAM 2110',
      'MEAM 2470', 'MEAM 2480', 'MEAM 3470', 'MEAM 3480',
      'MEAM 4450', 'MEAM 4460',
      'MATH 1400', 'MATH 1410', 'MATH 2400', 'ENM 2510',
      'PHYS 0150', 'PHYS 0151',
      'CHEM 1012', 'ENGR 1050',
    ],
    sampleSchedule: {
      'MATH 1400': 'fall-y1', 'MATH 1410': 'spring-y1',
      'CHEM 1012': 'fall-y1', 'ENGR 1050': 'spring-y1',
      'PHYS 0150': 'fall-y1', 'PHYS 0151': 'spring-y1',
      'MEAM 2030': 'fall-y2', 'MEAM 2100': 'fall-y2', 'MEAM 2470': 'fall-y2',
      'MATH 2400': 'fall-y2', 'ENM 2510': 'spring-y2',
      'MEAM 2020': 'spring-y2', 'MEAM 2110': 'spring-y2', 'MEAM 2480': 'spring-y2',
      'MEAM 3470': 'fall-y3',
      'MEAM 3480': 'spring-y3',
      'MEAM 4450': 'fall-y4', 'MEAM 4460': 'spring-y4',
    },
    concentrations: {
      ENERGY: {
        label: 'Energy, Fluids & Thermal Systems',
        default: true,
        note: 'Recommended for VIPER students.',
        extraCore: ['MEAM 3020', 'MEAM 3330'],
        electiveSlots: [
          { id: 'meam-math', label: 'Math Elective', cu: 1 },
          { id: 'meam-msn',  label: 'Math or Natural Science Elective', cu: 1 },
          { id: 'meam-breadth', label: 'MEAM 3000-level Breadth Elective', cu: 1, pool: ['MEAM 3210', 'MEAM 3540'] },
          { id: 'meam-upper-1', label: 'MEAM Upper Level (5000+)', cu: 1, energy: true, pool: ['MEAM 5020'] },
          { id: 'meam-upper-2', label: 'MEAM Upper Level (5000+) / Energy', cu: 1, energy: true, pool: ['MEAM 5030'] },
          { id: 'meam-tech-1', label: 'Tech Elective / Energy', cu: 1, energy: true, pool: ['MSE 4550', 'EAS 4010'] },
          { id: 'meam-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-3', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-4', label: 'Tech Elective', cu: 1 },
        ],
      },
      ROBOTICS: {
        label: 'Dynamics, Controls & Robotics',
        extraCore: ['MEAM 3200', 'MEAM 3210'],
        electiveSlots: [
          { id: 'meam-math', label: 'Math Elective', cu: 1 },
          { id: 'meam-msn',  label: 'Math or Natural Science Elective', cu: 1 },
          { id: 'meam-breadth', label: 'MEAM 3000-level Breadth', cu: 1, pool: ['MEAM 3020', 'MEAM 3540'] },
          { id: 'meam-upper-1', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-upper-2', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-3', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-4', label: 'Tech Elective', cu: 1 },
        ],
      },
      MECHANICS: {
        label: 'Mechanics of Materials, Structures & Design',
        extraCore: ['MEAM 3210', 'MEAM 3540'],
        electiveSlots: [
          { id: 'meam-math', label: 'Math Elective', cu: 1 },
          { id: 'meam-msn',  label: 'Math or Natural Science Elective', cu: 1 },
          { id: 'meam-breadth', label: 'MEAM 3000-level Breadth', cu: 1, pool: ['MEAM 3020'] },
          { id: 'meam-upper-1', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-upper-2', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-3', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-4', label: 'Tech Elective', cu: 1 },
        ],
      },
      GENERAL: {
        label: 'General Curriculum',
        extraCore: ['MEAM 3020', 'MEAM 3210', 'MEAM 3330', 'MEAM 3540'],
        electiveSlots: [
          { id: 'meam-math', label: 'Math Elective', cu: 1 },
          { id: 'meam-msn',  label: 'Math or Natural Science Elective', cu: 1 },
          { id: 'meam-upper-1', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-upper-2', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-upper-3', label: 'MEAM Upper Level (5000+)', cu: 1 },
          { id: 'meam-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'meam-tech-3', label: 'Tech Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'MEAM 2030 (Thermodynamics) satisfies the thermodynamics requirement for MATH+CIS combos.',
      'VIPR 1200/1210 may substitute for EAS 2030.',
      'Max 3 CUs of 1000-level engineering courses permitted.',
    ],
  },

  ESE: {
    school: 'SEAS', code: 'ESE', fullName: 'Electrical Engineering', minCU: 37,
    note: 'VIPER students typically pursue the EE BSE track.',
    sharedCore: [
      'CIS 1100', 'ESE 1110', 'CIS 1200',
      'ESE 2150', 'ESE 2180', 'ESE 2240',
      'ESE 2900', 'ESE 2910', 'ESE 4500', 'ESE 4510',
      'MATH 1400', 'MATH 1410', 'MATH 2400',
      'ESE 3010',
      'PHYS 0150', 'ESE 1120',
      'CHEM 1012',
    ],
    sampleSchedule: {
      'CIS 1100': 'fall-y1', 'ESE 1110': 'fall-y1',
      'MATH 1400': 'fall-y1', 'CHEM 1012': 'fall-y1',
      'CIS 1200': 'spring-y1', 'ESE 1120': 'spring-y1',
      'MATH 1410': 'spring-y1', 'PHYS 0150': 'spring-y1',
      'ESE 2150': 'fall-y2', 'MATH 2400': 'fall-y2',
      'ESE 2180': 'spring-y2', 'ESE 2240': 'spring-y2',
      'ESE 2900': 'fall-y3', 'ESE 3010': 'fall-y3',
      'ESE 2910': 'spring-y3',
      'ESE 4500': 'fall-y4', 'ESE 4510': 'spring-y4',
    },
    concentrations: {
      DATA: {
        label: 'Data Science', default: true,
        extraCore: [],
        electiveSlots: [
          { id: 'ese-int', label: 'Intermediate/Advanced ESE Elective', cu: 1 },
          { id: 'ese-adv-1', label: 'Advanced ESE Elective', cu: 1 },
          { id: 'ese-adv-2', label: 'Advanced ESE Elective', cu: 1 },
          { id: 'ese-adv-3', label: 'Advanced ESE / Energy', cu: 1, energy: true, pool: ['ESE 5210'] },
          { id: 'ese-adv-4', label: 'Advanced ESE / Energy', cu: 1, energy: true, pool: ['ESE 5800'] },
          { id: 'ese-math', label: 'Math Elective', cu: 1 },
          { id: 'ese-msn', label: 'Math or Natural Science', cu: 1 },
          { id: 'ese-prof-1', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-2', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-3', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-4', label: 'Professional Elective', cu: 1 },
        ],
      },
      NANO: {
        label: 'Microsystems & Nanotechnology',
        extraCore: [],
        electiveSlots: [
          { id: 'ese-int', label: 'Intermediate ESE Elective', cu: 1 },
          { id: 'ese-adv-1', label: 'Nanodevices Elective', cu: 1 },
          { id: 'ese-adv-2', label: 'Nanodevices Elective', cu: 1 },
          { id: 'ese-adv-3', label: 'Advanced ESE / Energy', cu: 1, energy: true },
          { id: 'ese-adv-4', label: 'Advanced ESE Elective', cu: 1 },
          { id: 'ese-math', label: 'Math Elective', cu: 1 },
          { id: 'ese-msn', label: 'Math or Natural Science', cu: 1 },
          { id: 'ese-prof-1', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-2', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-3', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-4', label: 'Professional Elective', cu: 1 },
        ],
      },
      PHOTON: {
        label: 'Photonics & Quantum',
        extraCore: [],
        electiveSlots: [
          { id: 'ese-int', label: 'Intermediate ESE Elective', cu: 1 },
          { id: 'ese-adv-1', label: 'Photonics Elective', cu: 1 },
          { id: 'ese-adv-2', label: 'Quantum Elective', cu: 1 },
          { id: 'ese-adv-3', label: 'Advanced ESE / Energy', cu: 1, energy: true },
          { id: 'ese-adv-4', label: 'Advanced ESE Elective', cu: 1 },
          { id: 'ese-math', label: 'Math Elective', cu: 1 },
          { id: 'ese-msn', label: 'Math or Natural Science', cu: 1 },
          { id: 'ese-prof-1', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-2', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-3', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-4', label: 'Professional Elective', cu: 1 },
        ],
      },
      ROBO: {
        label: 'Robotics',
        extraCore: [],
        electiveSlots: [
          { id: 'ese-int', label: 'Intermediate ESE Elective', cu: 1 },
          { id: 'ese-adv-1', label: 'Robotics/Controls Elective', cu: 1 },
          { id: 'ese-adv-2', label: 'Robotics/Controls Elective', cu: 1 },
          { id: 'ese-adv-3', label: 'Advanced ESE / Energy', cu: 1, energy: true },
          { id: 'ese-adv-4', label: 'Advanced ESE Elective', cu: 1 },
          { id: 'ese-math', label: 'Math Elective', cu: 1 },
          { id: 'ese-msn', label: 'Math or Natural Science', cu: 1 },
          { id: 'ese-prof-1', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-2', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-3', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-4', label: 'Professional Elective', cu: 1 },
        ],
      },
      SOC: {
        label: 'System-on-a-Chip Design',
        extraCore: [],
        electiveSlots: [
          { id: 'ese-int', label: 'Intermediate ESE Elective', cu: 1 },
          { id: 'ese-adv-1', label: 'SoC Design Elective', cu: 1 },
          { id: 'ese-adv-2', label: 'SoC Design Elective', cu: 1 },
          { id: 'ese-adv-3', label: 'Advanced ESE / Energy', cu: 1, energy: true },
          { id: 'ese-adv-4', label: 'Advanced ESE Elective', cu: 1 },
          { id: 'ese-math', label: 'Math Elective', cu: 1 },
          { id: 'ese-msn', label: 'Math or Natural Science', cu: 1 },
          { id: 'ese-prof-1', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-2', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-3', label: 'Math/Sci/Eng Elective', cu: 1 },
          { id: 'ese-prof-4', label: 'Professional Elective', cu: 1 },
        ],
      },
    },
    notes: [
      'ESE 3010 is REQUIRED — STAT 4300 cannot substitute.',
      'ESE 1120 replaces PHYS 0151 E&M content.',
      'VIPER-aligned energy electives: ESE 5210, ESE 5800.',
    ],
  },

  CIS: {
    school: 'SEAS', code: 'CIS', fullName: 'Computer Science', minCU: 37,
    sharedCore: [
      'CIS 1100', 'CIS 1200', 'CIS 1210',
      'CIS 1600', 'CIS 2400', 'CIS 2610', 'CIS 2620',
      'CIS 3200', 'CIS 4480', 'CIS 4710',
      'CIS 4000', 'CIS 4010',
      'MATH 1400', 'MATH 1410', 'MATH 2400',
      'PHYS 0150', 'PHYS 0151',
    ],
    sampleSchedule: {
      'CIS 1100': 'fall-y1', 'CIS 1200': 'fall-y1',
      'MATH 1400': 'fall-y1',
      'CIS 1210': 'spring-y1', 'CIS 1600': 'spring-y1',
      'MATH 1410': 'spring-y1',
      'CIS 2400': 'fall-y2', 'CIS 2610': 'fall-y2',
      'MATH 2400': 'fall-y2', 'PHYS 0150': 'fall-y2',
      'CIS 2620': 'spring-y2', 'CIS 3200': 'spring-y2',
      'PHYS 0151': 'spring-y2',
      'CIS 4710': 'fall-y3', 'CIS 4480': 'spring-y3',
      'CIS 4000': 'fall-y4', 'CIS 4010': 'spring-y4',
    },
    concentrations: {
      AI: {
        label: 'Artificial Intelligence', default: true,
        extraCore: [],
        electiveSlots: [
          { id: 'cis-msn', label: 'Math/Natural Science Elective', cu: 1 },
          { id: 'cis-elec-1', label: 'CIS Elective (AI focus)', cu: 1 },
          { id: 'cis-elec-2', label: 'CIS Elective (AI focus)', cu: 1 },
          { id: 'cis-elec-3', label: 'CIS Elective', cu: 1 },
          { id: 'cis-elec-4', label: 'CIS Elective', cu: 1 },
          { id: 'cis-tech-1', label: 'Tech Elective', cu: 1 },
          { id: 'cis-tech-2', label: 'Tech Elective', cu: 1 },
          { id: 'cis-tech-3', label: 'Tech Elective', cu: 1 },
          { id: 'cis-tech-4', label: 'Tech Elective', cu: 1 },
          { id: 'cis-tech-5', label: 'Tech Elective', cu: 1 },
          { id: 'cis-tech-6', label: 'Tech Elective', cu: 1 },
          { id: 'cis-free', label: 'Free Elective', cu: 1 },
        ],
      },
      DATA: { label: 'Data Science', extraCore: [], electiveSlots: [] },
      SYS:  { label: 'Systems', extraCore: [], electiveSlots: [] },
      CV:   { label: 'Computer Vision', extraCore: [], electiveSlots: [] },
      SF:   { label: 'Software Foundations', extraCore: [], electiveSlots: [] },
      CB:   { label: 'Computational Biology', extraCore: [], electiveSlots: [] },
      CS:   { label: 'Cognitive Science', extraCore: [], electiveSlots: [] },
    },
    notes: [
      'CIS + MATH VIPER combo REQUIRES an additional thermodynamics course.',
      'CIS electives must include a course from each of: Networking, Databases, Distributed Systems, ML/AI, Project.',
      'MATH 2400 may be replaced by MATH 3120, 3130, 3140, or ESE 2030.',
      'At most 1 CU of 1000-level coursework may be used as a CIS Elective.',
    ],
  },
};

// Clone CIS non-AI concentrations with the same slot structure as AI
{
  const cis = MAJORS['CIS'];
  const aiSlots = cis?.concentrations['AI']?.electiveSlots ?? [];
  (['DATA', 'SYS', 'CV', 'SF', 'CB', 'CS'] as const).forEach((k) => {
    const conc = cis?.concentrations[k];
    if (conc && conc.electiveSlots.length === 0) {
      conc.electiveSlots = aiSlots.map((s) => ({ ...s }));
    }
  });
}

// ---- Post-processing: inject "NONE" concentration for majors with ≥2 concentrations ----
// Gives users the option to plan with just the shared core + generic free electives,
// designing their own concentration-specific electives via the slot picker.
for (const major of Object.values(MAJORS)) {
  const concs = major.concentrations;
  const existingKeys = Object.keys(concs);
  if (existingKeys.length < 2) continue;  // single-concentration majors (CHEM) keep their one option
  // Slot count scales with major — engineering majors need more electives to hit 37 CU
  const freeSlotCount = major.school === 'SEAS' ? 7 : 4;
  const freeSlots: ElectiveSlot[] = [];
  for (let i = 1; i <= freeSlotCount; i++) {
    freeSlots.push({
      id: `none-free-${i}`,
      label: major.school === 'SEAS' ? 'Tech/Free Elective' : 'Free Elective',
      cu: 1,
      note: 'No concentration selected — pick any course that fits the major.',
    });
  }
  // Add at least one energy-tagged slot for VIPER compliance
  const firstSlot = freeSlots[0];
  if (major.school === 'SEAS' && firstSlot) {
    firstSlot.energy = true;
    firstSlot.label = 'Tech Elective / Energy';
  }
  concs['NONE'] = {
    label: 'No concentration (flexible)',
    extraCore: [],
    electiveSlots: freeSlots,
    note: 'Skip concentration-specific requirements. You customize electives yourself.',
  };
}

export const SAS_MAJORS: Record<string, Major> = Object.fromEntries(
  Object.entries(MAJORS).filter(([, m]) => m.school === 'SAS'),
);
export const SEAS_MAJORS: Record<string, Major> = Object.fromEntries(
  Object.entries(MAJORS).filter(([, m]) => m.school === 'SEAS'),
);
