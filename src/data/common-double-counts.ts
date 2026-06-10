import type { DoubleCountRef } from './types';

// ---- Common double-count courses (displayed for reference) ----
export const COMMON_DOUBLE_COUNTS: readonly DoubleCountRef[] = [
  { code: 'PSYC 0001', fulfills: ['Sector V', 'SEAS SS/H'] },
  { code: 'STSC 1880', fulfills: ['Sector IV', 'SEAS SS/H', 'Energy-adj'] },
  { code: 'SOCI 0006', fulfills: ['Sector I', 'FA: CDUS', 'SEAS SS/H'] },
  { code: 'SAST 0004', fulfills: ['Sector III', 'FA: CCA', 'SEAS H'] },
  { code: 'HIST 1708', fulfills: ['Sector II', 'SEAS H'] },
  { code: 'ENGL 0040', fulfills: ['Sector III', 'SEAS H'] },
  { code: 'ECON 0100', fulfills: ['Sector I', 'SEAS SS'] },
  { code: 'LGST 1000', fulfills: ['Ethics', 'SEAS SS'] },
  { code: 'CIMS 1004', fulfills: ['Sector II', 'FA: CCA', 'SEAS H'] },
  { code: 'WRIT 0130', fulfills: ['FA: Writing', 'SEAS Writing'] },
  { code: 'EAS 4010',  fulfills: ['SEAS Tech', 'VIPER Energy'] },
  { code: 'EESC 2300', fulfills: ['Sector VII', 'VIPER Energy', 'SEAS Tech'] },
];
