// Layout de las pantallas de autenticacion (login/registro). Estetica calida de la
// referencia: fondo crema, doodles (squiggles + bloques punteados), card central,
// topbar con logo y accion secundaria.
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

function Squiggle({ className }: { className?: string }) {
  return (
    <svg className={className} width="120" height="28" viewBox="0 0 120 28" fill="none" aria-hidden>
      <path
        d="M2 14c8-14 16 14 24 0s16-14 24 0 16 14 24 0 16-14 24 0 16 14 20 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DottedBlock({ className }: { className?: string }) {
  return (
    <svg className={className} width="90" height="150" viewBox="0 0 90 150" fill="none" aria-hidden>
      <rect x="1" y="1" width="88" height="148" rx="10" className="fill-brand-200/70" />
      <g className="fill-ink/70">
        {Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 4 }).map((__, c) => (
            <circle key={`${r}-${c}`} cx={16 + c * 20} cy={20 + r * 22} r="2.4" />
          )),
        )}
      </g>
    </svg>
  )
}

function OutlineSquare({ className }: { className?: string }) {
  return (
    <svg className={className} width="86" height="86" viewBox="0 0 86 86" fill="none" aria-hidden>
      <rect x="2" y="2" width="82" height="82" rx="12" stroke="currentColor" strokeWidth="2.5" />
      <path d="M30 52 L56 30 M56 30 h-16 M56 30 v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AuthLayout({
  children,
  altText,
  altHref,
  altLabel,
}: {
  children: ReactNode
  altText: string
  altHref: string
  altLabel: string
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Topbar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400 text-ink">e</span>
          esign
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="hidden sm:inline">{altText}</span>
          <Link
            to={altHref}
            className="rounded-lg bg-white px-4 py-2 font-semibold text-ink shadow-sm transition-colors hover:bg-cream-soft"
          >
            {altLabel}
          </Link>
        </div>
      </header>

      {/* Decoraciones */}
      <Squiggle className="pointer-events-none absolute left-10 top-40 text-ink/40" />
      <Squiggle className="pointer-events-none absolute right-16 top-28 text-ink/30" />
      <Squiggle className="pointer-events-none absolute bottom-24 left-1/3 text-ink/20" />
      <DottedBlock className="pointer-events-none absolute bottom-10 left-10 hidden md:block" />
      <DottedBlock className="pointer-events-none absolute bottom-16 right-12 hidden md:block" />
      <OutlineSquare className="pointer-events-none absolute bottom-28 left-1/2 hidden text-ink/60 lg:block" />
      <div className="pointer-events-none absolute right-1/3 top-52 hidden h-3 w-3 rounded-full border-2 border-ink/40 lg:block" />
      <div className="pointer-events-none absolute left-1/4 top-64 hidden h-2 w-2 rounded-full bg-ink/30 lg:block" />

      {/* Contenido central */}
      <main className="relative z-10 flex items-center justify-center px-4 pb-24 pt-6">
        {children}
      </main>
    </div>
  )
}
