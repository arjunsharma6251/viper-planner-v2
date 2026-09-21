import type { AugmentedCourse } from '../../plan/types'
import { IconBolt } from './icons'

/**
 * The count marks: how many requirements a course satisfies, and whether
 * it is an energy course. `×2` means double-counting (two requirements
 * across or within the degrees), `×3` triple or more; a bolt marks a VIPER
 * energy-designated course. A course that counts once prints nothing.
 */
export function Ties({ course, inverted }: { course: AugmentedCourse; inverted?: boolean }) {
  const n = Math.min(course.requirementCount, 3)
  const multi = n >= 2
  const energy = !!course.isEnergy
  if (!multi && !energy) return <span aria-hidden />
  const text = [
    multi ? (n >= 3 ? 'counts toward three or more requirements' : 'counts toward two requirements') : '',
    energy ? 'energy course' : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={text} title={text}>
      {multi && (
        <span
          className={['tag !text-[0.6875rem]', inverted ? 'text-sheet' : n >= 3 ? 'text-penn-red' : 'text-penn-blue'].join(' ')}
          aria-hidden="true"
        >
          ×{n}
        </span>
      )}
      {energy && (
        <span className={inverted ? 'text-sheet' : 'text-energy'} aria-hidden="true">
          <IconBolt size={13} />
        </span>
      )}
    </span>
  )
}
