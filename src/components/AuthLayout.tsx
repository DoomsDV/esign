// Layout de autenticacion partido (referencia tipo Hotelook): card grande con
// form a la izquierda y panel estetico a la derecha, sobre fondo crema.
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

function QuoteMarks({ className }: { className?: string }) {
  return (
    <svg className={className} width="44" height="32" viewBox="0 0 44 32" fill="none" aria-hidden>
      <path
        d="M0 32V18.4C0 8.2 5.4 2.1 16.2 0l2.4 4.6C12.8 6.2 9.6 9.6 9.4 15.2H16V32H0Zm24 0V18.4C24 8.2 29.4 2.1 40.2 0l2.4 4.6C36.8 6.2 33.6 9.6 33.4 15.2H40V32H24Z"
        className="fill-brand-500"
      />
    </svg>
  )
}

function DocIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 220" fill="none" aria-hidden>
      {/* Edificios / docs estilizados */}
      <rect x="28" y="70" width="70" height="130" rx="8" className="fill-brand-100 stroke-ink" strokeWidth="2" />
      <rect x="42" y="88" width="42" height="8" rx="2" className="fill-ink/20" />
      <rect x="42" y="106" width="42" height="8" rx="2" className="fill-ink/15" />
      <rect x="42" y="124" width="28" height="8" rx="2" className="fill-brand-400/60" />

      <rect x="110" y="40" width="88" height="160" rx="10" className="fill-white stroke-ink" strokeWidth="2" />
      <rect x="126" y="62" width="56" height="10" rx="2" className="fill-ink/25" />
      <rect x="126" y="84" width="56" height="8" rx="2" className="fill-ink/15" />
      <rect x="126" y="102" width="40" height="8" rx="2" className="fill-ink/15" />
      <rect x="126" y="148" width="56" height="28" rx="6" className="fill-brand-200" />
      <path d="M140 162h28" className="stroke-brand-700" strokeWidth="2" strokeLinecap="round" />

      <rect x="212" y="58" width="78" height="142" rx="10" className="fill-brand-50 stroke-ink" strokeWidth="2" />
      <circle cx="251" cy="100" r="18" className="fill-brand-300/50 stroke-ink" strokeWidth="2" />
      <path d="M244 100l5 5 10-12" className="stroke-ink" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="228" y="136" width="46" height="8" rx="2" className="fill-ink/15" />
      <rect x="228" y="154" width="34" height="8" rx="2" className="fill-ink/10" />

      <rect x="304" y="86" width="88" height="114" rx="10" className="fill-white stroke-ink" strokeWidth="2" />
      <rect x="320" y="108" width="56" height="8" rx="2" className="fill-ink/20" />
      <rect x="320" y="126" width="56" height="8" rx="2" className="fill-ink/12" />
      <rect x="320" y="144" width="40" height="8" rx="2" className="fill-brand-400/50" />

      {/* Arboles / acentos */}
      <circle cx="52" cy="188" r="14" className="fill-ok/25 stroke-ink" strokeWidth="1.5" />
      <circle cx="78" cy="192" r="10" className="fill-ok/20 stroke-ink" strokeWidth="1.5" />
      <circle cx="360" cy="192" r="12" className="fill-brand-300/40 stroke-ink" strokeWidth="1.5" />
      <path d="M20 200 H400" className="stroke-ink/30" strokeWidth="2" strokeLinecap="round" />
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
  panelQuote = 'Emitir, firmar y consultar documentos electrónicos SIFEN desde un solo lugar. Claro, rápido y listo para tu negocio.',
  panelAuthor = 'esign',
  panelRole = 'Facturación electrónica Paraguay',
}: {
  children: ReactNode
  title: string
  subtitle: string
  altText: string
  altHref: string
  altLabel: string
  panelQuote?: string
  panelAuthor?: string
  panelRole?: string
}) {
  return (
    <div className="grid min-h-screen bg-cream-soft md:grid-cols-2">
      {/* Izquierda: form */}
      <section className="flex min-h-screen flex-col px-7 py-8 sm:px-12 sm:py-10 md:px-14 md:py-12 lg:px-20">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 self-start text-lg font-extrabold tracking-tight text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400 text-ink">e</span>
          esign
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-7">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-[2rem]">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          </div>

          <div className="flex flex-col">{children}</div>

          <p className="mt-8 text-sm text-muted">
            {altText}{' '}
            <Link to={altHref} className="font-semibold text-brand-600 hover:text-brand-700">
              {altLabel}
            </Link>
          </p>
        </div>
      </section>

      {/* Derecha: panel estetico a pantalla completa */}
      <aside className="relative hidden min-h-screen flex-col justify-between border-l border-line bg-cream px-10 py-12 md:flex lg:px-16 lg:py-14">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ink/[0.03] to-transparent" />

        <div className="relative mx-auto w-full max-w-lg">
          <QuoteMarks className="mb-5" />
          <blockquote className="text-[1.15rem] font-medium leading-relaxed text-ink lg:text-xl">
            {panelQuote}
          </blockquote>
          <QuoteMarks className="mt-4 ml-auto rotate-180 opacity-80" />

          <div className="mt-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-400 text-sm font-bold text-ink">
              {panelAuthor.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{panelAuthor}</p>
              <p className="text-xs text-muted">{panelRole}</p>
            </div>
          </div>
        </div>

        <DocIllustration className="relative mx-auto mt-10 w-full max-w-lg" />
      </aside>
    </div>
  )
}
