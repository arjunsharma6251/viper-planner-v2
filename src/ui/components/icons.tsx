import type { SVGProps } from 'react'

/**
 * The drawing's icon set: one stroke, one weight, 16px box. Every glyph
 * the interface uses is drawn here; no Unicode stand-ins anywhere.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </Svg>
)

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6l5 5 5-5" />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3l5 5-5 5" />
  </Svg>
)

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3L5 8l5 5" />
  </Svg>
)

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3H3v10h10V9M9 3h4v4M13 3L7 9" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10l3.5 3.5" />
  </Svg>
)

export const IconUndo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4L3 7l3 3" />
    <path d="M3 7h6.5a3.5 3.5 0 010 7H7" />
  </Svg>
)

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="7.5" width="9" height="6" />
    <path d="M5.5 7.5V5a2.5 2.5 0 015 0v2.5" />
  </Svg>
)

/** An open breaker: the contact blade lifted off its terminal. */
export const IconOpenBreaker = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 8h3M11 8h3" />
    <path d="M5 8l5-4" />
    <circle cx="5" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="8" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconGrip = (p: IconProps) => (
  <Svg {...p} strokeWidth="0">
    <circle cx="6" cy="4" r="1.1" fill="currentColor" />
    <circle cx="10" cy="4" r="1.1" fill="currentColor" />
    <circle cx="6" cy="8" r="1.1" fill="currentColor" />
    <circle cx="10" cy="8" r="1.1" fill="currentColor" />
    <circle cx="6" cy="12" r="1.1" fill="currentColor" />
    <circle cx="10" cy="12" r="1.1" fill="currentColor" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5l3 3 7-7" />
  </Svg>
)

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.5l6 11H2z" />
    <path d="M8 6.5v3M8 11.5v.5" />
  </Svg>
)

export const IconStop = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="10" height="10" />
    <path d="M6 8h4" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
)

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </Svg>
)

export const IconSquare = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="9" height="9" />
  </Svg>
)

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
  </Svg>
)

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 3h11v8h-6l-3 2.5V11h-2z" />
  </Svg>
)

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 9.5l3-3" />
    <path d="M7 5.5L9 3.5a2.1 2.1 0 013 3l-2 2M9 10.5l-2 2a2.1 2.1 0 01-3-3l2-2" />
  </Svg>
)

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />
  </Svg>
)

export const IconPrint = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 6V2.5h7V6M3 6h10v5h-2v2.5H5V11H3z" />
  </Svg>
)
