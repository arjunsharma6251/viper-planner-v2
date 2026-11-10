// Major data checks pinned to a source (audit, catalog, or program office).
import { describe, expect, it } from 'vitest';
import { MAJORS } from './majors';
import { lookupCourse } from './courses';

describe('Physics · Computer Techniques (Class of 2027 Path@Penn audit)', () => {
  const conc = MAJORS['PHYS']!.concentrations['CS']!;
  it('requires PHYS 4411 and PHYS 4401 alongside the shared PHYS 1250 / 3351', () => {
    expect(conc.extraCore).toEqual(expect.arrayContaining(['PHYS 4401', 'PHYS 4411']));
    expect(MAJORS['PHYS']!.sharedCore).toEqual(expect.arrayContaining(['PHYS 1250', 'PHYS 3351']));
    expect(conc.extraCore).not.toContain('CIS 1200');
  });
  it('has 3 CU of Computer Techniques Electives and a Physics Lab Elective', () => {
    expect(conc.electiveSlots.filter((s) => s.label === 'Computer Techniques Elective')).toHaveLength(3);
    expect(conc.electiveSlots.find((s) => s.id === 'phys-lab')?.pool).toContain('ESE 2150');
  });
});

describe('every course code named in MAJORS is in the catalog', () => {
  it('core, schedules and pools', () => {
    const missing = new Set<string>();
    for (const m of Object.values(MAJORS)) {
      const codes = [...m.sharedCore, ...Object.keys(m.sampleSchedule ?? {})];
      for (const c of Object.values(m.concentrations)) {
        codes.push(...c.extraCore, ...Object.keys(c.sampleSchedule ?? {}));
        for (const s of c.electiveSlots) codes.push(...(s.pool ?? []));
      }
      for (const code of codes) if (!lookupCourse(code)) missing.add(code);
    }
    expect([...missing]).toEqual([]);
  });
});
