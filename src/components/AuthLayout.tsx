// Shell de autenticación Night Ledger: formulario editorial + KUDE con sello fiscal.
import { Link } from 'react-router-dom'
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { usePageTitle } from '@/lib/usePageTitle'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui'

const SEAL_TICKS = Array.from({ length: 48 }, (_, i) => i)

function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M7 17L17 7M10 7h7v7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FiscalSeal({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  const pathId = `auth-seal-legend-${uid}`

  return (
    <svg className={cn('auth-seal', className)} viewBox="0 0 200 200" fill="none" aria-hidden>
      <defs>
        <path id={pathId} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>
      <circle cx="100" cy="100" r="96" stroke="#C4A574" strokeOpacity="0.22" strokeWidth="1" />
      <circle cx="100" cy="100" r="58" stroke="#E07D24" strokeOpacity="0.55" strokeWidth="1.15" />
      <circle cx="100" cy="100" r="52" stroke="#C4A574" strokeOpacity="0.3" strokeWidth="0.75" />

      <g className="auth-seal-ring">
        {SEAL_TICKS.map((i) => {
          const angle = (i / SEAL_TICKS.length) * Math.PI * 2 - Math.PI / 2
          const long = i % 4 === 0
          const inner = long ? 86 : 90
          const outer = 96
          return (
            <line
              key={i}
              x1={100 + Math.cos(angle) * inner}
              y1={100 + Math.sin(angle) * inner}
              x2={100 + Math.cos(angle) * outer}
              y2={100 + Math.sin(angle) * outer}
              stroke={long ? '#E07D24' : '#C4A574'}
              strokeOpacity={long ? 0.85 : 0.4}
              strokeWidth={long ? 1.2 : 0.7}
              strokeLinecap="round"
            />
          )
        })}
        <text fill="#C4A574" fontSize="8.4" letterSpacing="3.4" fontFamily="Geist, sans-serif">
          <textPath href={`#${pathId}`} startOffset="0">
            DOCUMENTO ELECTRÓNICO · SIFEN · PARAGUAY · KUDE ·
          </textPath>
        </text>
      </g>

      <text
        x="100"
        y="112"
        textAnchor="middle"
        fill="#F3EDE3"
        fontSize="46"
        fontFamily="Yellowtail, cursive"
      >
        e
      </text>
    </svg>
  )
}

function KudeArtifact() {
  return (
    <div className="auth-kude relative w-full max-w-[28rem]">
      <div className="auth-kude-shell rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/[0.08]">
        <article className="auth-kude-core relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#F3EDE3] px-6 py-6 text-[#0E141B] shadow-[inset_0_1px_1px_rgba(255,255,255,0.55)] sm:px-7 sm:py-7">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8B93A1]">
                Factura electrónica
              </p>
              <p className="mt-1 font-mono text-[11px] tracking-wide text-[#0E141B]/70">001-001-0001847</p>
            </div>
            <span className="rounded-full bg-[#0E141B] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#F3EDE3]">
              KUDE
            </span>
          </header>

          <div className="mt-6 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-y border-[#0E141B]/10 py-4 text-[12px]">
            <span className="text-[#8B93A1]">Emisor</span>
            <span className="text-right font-medium">Taller Norte SAE</span>
            <span className="text-[#8B93A1]">RUC</span>
            <span className="text-right font-mono text-[11px]">80012345-6</span>
            <span className="text-[#8B93A1]">Fecha</span>
            <span className="text-right">27 ago 2026</span>
          </div>

          <ul className="mt-4 space-y-2.5 text-[12px]">
            <li className="flex justify-between gap-4">
              <span>Servicio de facturación electrónica</span>
              <span className="font-mono tabular-nums">Gs. 320.000</span>
            </li>
            <li className="flex justify-between gap-4 text-[#8B93A1]">
              <span>IVA 10%</span>
              <span className="font-mono tabular-nums">Gs. 32.000</span>
            </li>
          </ul>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="auth-kude-qr grid grid-cols-5 gap-[3px]" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <span
                  key={i}
                  className="h-[7px] w-[7px] rounded-[1px] bg-[#0E141B]"
                  style={{ opacity: [0, 4, 6, 8, 12, 16, 18, 20, 24].includes(i) || i % 3 === 0 ? 1 : 0.18 }}
                />
              ))}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B93A1]">Total</p>
              <p className="font-mono text-[15px] font-medium tabular-nums">Gs. 352.000</p>
            </div>
          </div>

          <p className="mt-5 break-all font-mono text-[9px] leading-relaxed tracking-[0.08em] text-[#0E141B]/45">
            CDC 01800012345001001000018472026082715123456789012
          </p>
        </article>
      </div>

      <div className="auth-seal-wrap pointer-events-none absolute -bottom-10 -right-6 h-40 w-40 sm:-bottom-12 sm:-right-8 sm:h-48 sm:w-48">
        <FiscalSeal className="h-full w-full drop-shadow-[0_18px_40px_rgba(14,20,27,0.35)]" />
      </div>
    </div>
  )
}

export function AuthCta({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <Button
      type="submit"
      className={cn('auth-cta group w-auto self-start gap-3 px-5 py-3 text-[15px]', className)}
      {...rest}
    >
      <span>{children}</span>
      <span className="auth-cta-icon grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0E141B]/10">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Button>
  )
}

export function AuthLayout({
  children,
  title,
  subtitle,
  altText,
  altHref,
  altLabel,
  compact = false,
  eyebrow = 'Acceso',
  pageTitle,
}: {
  children: ReactNode
  title: ReactNode
  subtitle: string
  altText: string
  altHref: string
  altLabel: string
  compact?: boolean
  eyebrow?: string
  pageTitle?: string
}) {
  usePageTitle(pageTitle ?? (typeof title === 'string' ? title : 'Acceso'))

  return (
    <div className="auth-stage relative min-h-[100dvh]">
      <div className="auth-grain pointer-events-none fixed inset-0" aria-hidden />

      <nav className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 pt-6 sm:px-8 lg:px-10">
        <div className="auth-logo-pill pointer-events-auto">
          <BrandLogo asLink inverted className="px-4 py-1.5" />
        </div>
        <Link to={altHref} className="auth-nav-cta group pointer-events-auto">
          <span>{altLabel}</span>
          <span className="auth-nav-cta-icon grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </nav>

      <div className="relative z-[1] grid min-h-[100dvh] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section
          className={cn(
            'relative flex min-h-[100dvh] flex-col overflow-y-auto px-4 pb-12 pt-28 sm:px-10 md:px-12 lg:px-16',
            compact ? 'md:pt-24' : 'md:pt-28',
          )}
        >
          <FiscalSeal className="pointer-events-none absolute -right-8 top-24 h-56 w-56 opacity-[0.07] md:hidden" />

          <div
            className={cn(
              'auth-rise mx-auto flex w-full max-w-[22rem] flex-1 flex-col justify-center sm:max-w-md',
              compact && 'auth-compact min-h-0 [&_input]:py-2.5 [&_label]:text-[13px]',
            )}
          >
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1
              className={cn(
                'mt-3 font-semibold tracking-tight text-[#F3EDE3]',
                compact
                  ? 'text-[1.75rem] sm:text-[1.95rem]'
                  : 'text-[2rem] sm:text-[2.35rem] lg:text-[2.5rem]',
              )}
            >
              {title}
            </h1>
            <p
              className={cn(
                'max-w-[34ch] text-[#8B93A1]',
                compact ? 'mt-3 text-[13px] leading-relaxed' : 'mt-4 text-[15px] leading-relaxed',
              )}
            >
              {subtitle}
            </p>

            <div className={cn('flex min-h-0 flex-col', compact ? 'mt-6' : 'mt-9')}>{children}</div>

            <p className="mt-8 text-sm text-[#8B93A1] md:hidden">
              {altText}{' '}
              <Link
                to={altHref}
                className="font-medium text-[#F3EDE3] underline decoration-[#E07D24]/70 decoration-1 underline-offset-4 transition-[opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-80"
              >
                {altLabel}
              </Link>
            </p>
          </div>
        </section>

        <aside
          className="auth-fiscal relative hidden min-h-[100dvh] overflow-hidden md:sticky md:top-0 md:flex md:h-[100dvh] md:items-center md:justify-center"
          aria-hidden
        >
          <div className="auth-ember pointer-events-none absolute inset-0" />
          <div className="auth-kude-enter relative z-[1] w-full max-w-lg px-10 lg:px-14">
            <KudeArtifact />
          </div>
        </aside>
      </div>
    </div>
  )
}
