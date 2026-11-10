// Open slots: listed for the audit, offered when an added course fills one (2026-11).
import { beforeAll, describe, expect, it } from 'vitest'
import { installNccModule } from '../ncc/scheduler-module'
import { seedPlan } from '../ui/store/use-plan-store'
import { augmentPlan } from './augment'
import { applyMutations } from './mutations'
import { fillTargetsFor, listOpenSlots } from './open-slot'

beforeAll(() => installNccModule())

const legacySeed = () =>
  seedPlan({ sasMajorKey: 'CHEM', sasConcKey: 'STANDARD', seasMajorKey: 'CBE', seasConcKey: 'ENERGY', apCreditIds: [], gradYear: 2028, curriculumMode: 'legacy' })!

describe('open slots', () => {
  it('lists every open slot in term order', () => {
    const slots = listOpenSlots(augmentPlan(legacySeed())!)
    expect(slots.length).toBeGreaterThan(3)
    expect(slots.every((s) => s.code.startsWith('—'))).toBe(true)
    expect(slots.some((s) => s.label.startsWith('Sector I'))).toBe(true)
  })

  it('offers the slots a catalog course carries the requirement for', () => {
    const aug = augmentPlan(legacySeed())!
    const labels = fillTargetsFor(aug, 'SOCI 0006').map((t) => t.label) // Sector I + CDUS
    expect(labels).toEqual(expect.arrayContaining(['Sector I: Society', 'Cultural Diversity in US (FA)']))
    expect(labels.some((l) => l.startsWith('Sector II'))).toBe(false)
    expect(fillTargetsFor(aug, 'CHEM 1012')).toEqual([]) // Sector VI is already covered by the major; no open VI slot
    expect(fillTargetsFor(aug, 'XYZ 9999')).toEqual([]) // no catalog data, no listed option
  })

  it('fills the slot in place and moves it to the chosen term as one edit', () => {
    const plan = legacySeed()
    const aug = augmentPlan(plan)!
    const target = fillTargetsFor(aug, 'SOCI 0006').find((t) => t.label === 'Sector I: Society')!
    const to = target.semKey === 'spring-y2' ? 'fall-y2' : 'spring-y2'
    const res = applyMutations(plan, [
      { kind: 'rename_course', courseId: target.code, newCode: 'SOCI 0006', newTitle: 'Race & Ethnic Relations' },
      { kind: 'move_course', from: target.semKey, to, courseId: 'SOCI 0006' },
    ])
    expect(res.ok).toBe(true)
    const after = augmentPlan(res.plan)!
    const filled = after.semesters[to]!.find((c) => c.code === 'SOCI 0006')!
    expect(filled).toMatchObject({ slotId: 'gened-sec1', isPlaceholder: false })
    expect(Object.values(after.semesters).flat().filter((c) => c.code === 'SOCI 0006')).toHaveLength(1)
    expect(listOpenSlots(after)).toHaveLength(listOpenSlots(aug).length - 1)
    expect(after.summary.fulfilledSec).toContain('I')
  })

  it('a seeded elective line ("— <slot>") fills like any open slot', () => {
    const plan = legacySeed()
    const slot = listOpenSlots(augmentPlan(plan)!).find((s) => !s.code.includes('gened'))!
    const res = applyMutations(plan, [{ kind: 'rename_course', courseId: slot.code, newCode: 'CBE 5460' }])
    expect(res.ok).toBe(true)
    const filled = Object.values(res.plan.semesters).flat().find((c) => c.code === 'CBE 5460')!
    expect(filled.isPlaceholder).toBe(false)
    expect(filled.isRenamed).toBe(false)
  })
})

describe('common double-counts on an open slot', () => {
  it('offers the double-counts that fill the slot, minus planned courses', async () => {
    const { doubleCountPicksFor } = await import('./open-slot')
    const aug = augmentPlan(legacySeed())!
    const all = Object.values(aug.semesters).flat()
    const sec1 = all.find((c) => c.slotId === 'gened-sec1')!
    expect(doubleCountPicksFor(sec1).map((d) => d.code)).toEqual(expect.arrayContaining(['SOCI 0006', 'ECON 0100']))
    expect(doubleCountPicksFor(sec1).map((d) => d.code)).not.toContain('HIST 1708')
    expect(doubleCountPicksFor(sec1, new Set(['SOCI 0006'])).map((d) => d.code)).not.toContain('SOCI 0006')
    const writ = all.find((c) => c.slotId === 'gened-writ')!
    expect(doubleCountPicksFor(writ).map((d) => d.code)).toEqual(['WRIT 0130'])
  })
})
