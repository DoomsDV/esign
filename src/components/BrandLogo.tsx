// Wordmark etick — tipografía script sin icono naranja.
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

type BrandLogoProps = {
  /** Sidebar colapsado: solo la “e” script. */
  collapsed?: boolean
  className?: string
  /** Enlaza al inicio (sidebar y auth). */
  asLink?: boolean
  /** Wordmark claro sobre fondos oscuros (shell de autenticación). */
  inverted?: boolean
}

export function BrandLogo({ collapsed = false, className, asLink = false, inverted = false }: BrandLogoProps) {
  const label = collapsed ? 'e' : 'etick'

  const wordmarkClass = cn(
    'font-display leading-none select-none',
    inverted ? 'text-[#F3EDE3]' : 'text-ink',
    collapsed ? 'text-[1.75rem]' : 'text-[1.85rem] sm:text-[2rem]',
  )

  const wordmark = (
    <span className={wordmarkClass} aria-hidden={collapsed && asLink ? true : undefined}>
      {label}
    </span>
  )

  const layoutClass = cn(
    'flex shrink-0 items-center overflow-visible py-0.5',
    collapsed ? 'min-h-10 justify-center' : 'min-h-9 px-2',
  )

  if (asLink) {
    return (
      <Link
        to="/"
        className={cn(
          layoutClass,
          'transition-opacity hover:opacity-85',
          className,
        )}
        aria-label={collapsed ? 'etick, página de inicio' : undefined}
        title={collapsed ? 'etick' : undefined}
      >
        {wordmark}
      </Link>
    )
  }

  return (
    <div
      className={cn(layoutClass, className)}
      aria-hidden={collapsed ? true : undefined}
      {...(collapsed ? ({ title: 'etick' } as const) : {})}
    >
      {wordmark}
    </div>
  )
}
