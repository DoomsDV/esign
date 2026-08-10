// Layout de autenticacion partido: formulario a la izquierda, panel visual a la derecha.
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { usePageTitle } from '@/lib/usePageTitle'
import { BrandLogo } from '@/components/BrandLogo'

function AuthPanelDecor() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Ondas superiores izquierda */}
      <svg
        className="auth-deco auth-deco-waves absolute left-[6%] top-[14%] h-14 w-32 text-brand-400/45 sm:left-[8%] sm:top-[16%] sm:h-16 sm:w-36"
        viewBox="0 0 144 64"
        fill="none"
        aria-hidden
      >
        <path
          d="M4 36 C28 12, 52 58, 76 34 S124 10, 140 30"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M4 50 C32 30, 56 54, 84 38 S118 24, 140 44"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>

      {/* Pelotitas flotantes superior derecha */}
      <svg
        className="auth-deco auth-deco-dots absolute right-[8%] top-[10%] h-24 w-24 text-brand-500/50 sm:right-[10%] sm:top-[12%]"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden
      >
        <circle className="auth-dot auth-dot-1 fill-brand-300/70" cx="18" cy="22" r="5" />
        <circle className="auth-dot auth-dot-2 fill-brand-400/55" cx="52" cy="14" r="3.5" />
        <circle className="auth-dot auth-dot-3 fill-brand-200/80" cx="78" cy="34" r="4.5" />
        <circle className="auth-dot auth-dot-4 fill-ok/30 stroke-ink/20" cx="34" cy="58" r="3" strokeWidth="1" />
      </svg>

      {/* Trazo tipo firma inferior derecha */}
      <svg
        className="auth-deco auth-deco-signature absolute bottom-[14%] right-[5%] z-20 h-16 w-40 text-brand-600/55 sm:bottom-[16%] sm:right-[7%] sm:h-[4.5rem] sm:w-44"
        viewBox="0 0 176 56"
        fill="none"
        aria-hidden
      >
        <path
          className="auth-signature-stroke"
          d="M6 38 C18 14, 30 46, 44 28 S62 10, 78 26 S94 44, 112 22 S132 8, 152 30 L168 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="auth-signature-stroke auth-signature-stroke-2"
          d="M28 48 C40 42, 52 50, 64 44"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>

      {/* Pelotitas secundarias superior izquierda del panel */}
      <svg
        className="auth-deco auth-deco-dots-b absolute left-[14%] top-[8%] h-12 w-16 text-brand-300/60 sm:left-[16%]"
        viewBox="0 0 64 48"
        fill="none"
        aria-hidden
      >
        <circle className="auth-dot auth-dot-5 fill-current" cx="12" cy="20" r="2.5" />
        <circle className="auth-dot auth-dot-6 fill-brand-400/40" cx="38" cy="12" r="2" />
        <circle className="auth-dot auth-dot-7 fill-brand-500/30" cx="52" cy="32" r="3" />
      </svg>
    </div>
  )
}

function DocIllustration({ className }: { className?: string }) {
  return (
    <svg className={cn('auth-doc-illustration', className)} viewBox="0 0 420 220" fill="none" aria-hidden>
      <path d="M20 200 H400" className="auth-doc-ground stroke-ink/30" strokeWidth="2" strokeLinecap="round" />

      <g className="auth-doc-card auth-doc-card-1">
        <rect x="28" y="70" width="70" height="130" rx="8" className="fill-brand-100 stroke-ink" strokeWidth="2" />
        <rect x="42" y="88" width="42" height="8" rx="2" className="fill-ink/20" />
        <rect x="42" y="106" width="42" height="8" rx="2" className="fill-ink/15" />
        <rect x="42" y="124" width="28" height="8" rx="2" className="fill-brand-400/60" />
        <circle cx="52" cy="188" r="14" className="fill-ok/25 stroke-ink" strokeWidth="1.5" />
        <circle cx="78" cy="192" r="10" className="fill-ok/20 stroke-ink" strokeWidth="1.5" />
      </g>

      <g className="auth-doc-card auth-doc-card-2">
        <rect x="110" y="40" width="88" height="160" rx="10" className="fill-white stroke-ink" strokeWidth="2" />
        <rect x="126" y="62" width="56" height="10" rx="2" className="fill-ink/25" />
        <rect x="126" y="84" width="56" height="8" rx="2" className="fill-ink/15" />
        <rect x="126" y="102" width="40" height="8" rx="2" className="fill-ink/15" />
        <rect x="126" y="148" width="56" height="28" rx="6" className="fill-brand-200" />
        <path d="M140 162h28" className="stroke-brand-700" strokeWidth="2" strokeLinecap="round" />
      </g>

      <g className="auth-doc-card auth-doc-card-3">
        <rect x="212" y="58" width="78" height="142" rx="10" className="fill-brand-50 stroke-ink" strokeWidth="2" />
        <g className="auth-doc-check">
          <circle cx="251" cy="100" r="18" className="fill-brand-300/50 stroke-ink" strokeWidth="2" />
          <path d="M244 100l5 5 10-12" className="stroke-ink" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="228" y="136" width="46" height="8" rx="2" className="fill-ink/15" />
        <rect x="228" y="154" width="34" height="8" rx="2" className="fill-ink/10" />
      </g>

      <g className="auth-doc-card auth-doc-card-4">
        <rect x="304" y="86" width="88" height="114" rx="10" className="fill-white stroke-ink" strokeWidth="2" />
        <rect x="320" y="108" width="56" height="8" rx="2" className="fill-ink/20" />
        <rect x="320" y="126" width="56" height="8" rx="2" className="fill-ink/12" />
        <rect x="320" y="144" width="40" height="8" rx="2" className="fill-brand-400/50" />
        <circle cx="360" cy="192" r="12" className="fill-brand-300/40 stroke-ink" strokeWidth="1.5" />
      </g>
    </svg>
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
}: {
  children: ReactNode
  title: string
  subtitle: string
  altText: string
  altHref: string
  altLabel: string
  compact?: boolean
}) {
  usePageTitle(title)

  return (
    <div className="grid h-[100dvh] max-h-[100dvh] overflow-hidden bg-white md:grid-cols-2">
      <section
        className={cn(
          'relative flex h-full min-h-0 flex-col overflow-hidden px-7 sm:px-12 md:px-14 lg:px-20',
          compact ? 'py-5 sm:py-6 md:py-7' : 'py-8 sm:py-10 md:py-12',
        )}
      >
        <BrandLogo
          asLink
          className={cn('self-start', compact ? 'mb-5' : 'mb-10')}
        />

        <div
          className={cn(
            'mx-auto flex w-full max-w-[22rem] flex-1 flex-col justify-center sm:max-w-md',
            compact && 'auth-compact min-h-0 [&_input]:py-2 [&_label]:text-[13px]',
          )}
        >
          <div className={cn(compact ? 'mb-4' : 'mb-8')}>
            <h1
              className={cn(
                'font-extrabold tracking-tight text-ink',
                compact ? 'text-[1.625rem] sm:text-[1.75rem]' : 'text-[1.75rem] sm:text-[2rem]',
              )}
            >
              {title}
            </h1>
            <p className={cn('max-w-[36ch] leading-relaxed text-muted', compact ? 'mt-1.5 text-[13px]' : 'mt-2.5 text-sm')}>
              {subtitle}
            </p>
          </div>

          <div className="flex min-h-0 flex-col">{children}</div>

          <p className={cn('shrink-0 text-sm text-muted', compact ? 'mt-5' : 'mt-8')}>
            {altText}{' '}
            <Link to={altHref} className="font-semibold text-brand-700 transition-colors hover:text-brand-600">
              {altLabel}
            </Link>
          </p>
        </div>
      </section>

      <div
        className="relative hidden h-full min-h-0 overflow-hidden md:flex md:items-center md:justify-center"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream-soft to-brand-50/60" />
        <div className="auth-orb auth-orb-a pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-200/25 blur-3xl" />
        <div className="auth-orb auth-orb-b pointer-events-none absolute -bottom-12 left-6 h-56 w-56 rounded-full bg-brand-100/35 blur-3xl" />
        <div className="auth-panel-grid pointer-events-none absolute inset-0 opacity-[0.22]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-line/80" />

        <AuthPanelDecor />

        <div className="relative z-10 w-full max-w-md px-10 lg:max-w-lg lg:px-14">
          <DocIllustration className="w-full drop-shadow-[0_24px_48px_rgba(26,29,35,0.06)]" />
        </div>
      </div>
    </div>
  )
}
