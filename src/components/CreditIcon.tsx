type CreditIconProps = {
  className?: string
  /** Visual size of the badge (px via Tailwind). */
  size?: 'sm' | 'md'
}

/** Compact gold “C” badge for credits. */
export function CreditIcon({ className = '', size = 'sm' }: CreditIconProps) {
  const dim = size === 'md' ? 'h-5 w-5 text-[11px]' : 'h-4 w-4 text-[10px]'

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-gradient-to-b from-amber-300 to-amber-500',
        'font-bold leading-none text-amber-950',
        'ring-1 ring-amber-200/80 shadow-sm shadow-amber-900/20',
        dim,
        className,
      ].join(' ')}
      aria-hidden
    >
      C
    </span>
  )
}
