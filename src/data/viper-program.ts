import type { ViperProgram } from './types';

// ---- VIPER fixed program requirements ----
// VIPR 1300 spans 5 semesters in-term (Spring Y2 → Spring Y4) plus 3 summers
// (Y1, Y2, Y3). Per program director:
//   - Summer Y1 is mandatory (everyone takes it)
//   - Summer Y2 is the norm (most students)
//   - Summer Y3 is taken by a portion of students
// Default: pre-populate all three summers. Students can delete the ones they
// don't plan to do via the course detail modal.
export const VIPER_PROGRAM: ViperProgram = {
  fixedCourses: [
    { code: 'VIPR 1200', title: 'Intro to Energy Research I',  cu: 0.5, semKey: 'spring-y1', fixed: true, note: 'Required Freshman Spring. Counts for Sector VII; may replace EAS 2030.' },
    { code: 'VIPR 1210', title: 'Intro to Energy Research II', cu: 0.5, semKey: 'fall-y2',   fixed: true, note: 'Required Sophomore Fall. Counts for Sector VII.' },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'summer-y1', fixed: true,  note: 'Mandatory summer research after freshman year.' },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'spring-y2', fixed: true },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'summer-y2', fixed: false, note: 'Typical summer research (most students). Delete if not continuing into summer.' },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'fall-y3',   fixed: true },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'spring-y3', fixed: true },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'summer-y3', fixed: false, note: 'A portion of VIPER students. Delete if not planning summer research after junior year.' },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'fall-y4',   fixed: true },
    { code: 'VIPR 1300', title: 'Energy Research & Leadership', cu: 0.5, semKey: 'spring-y4', fixed: true },
  ],
  minTotalCU: 46,
  minEnergyCourses: 3,
  minSummerResearch: 2,
  thermoOptions: ['MEAM 2030', 'MSE 2600', 'PHYS 1230', 'CHEM 2220'],
};
