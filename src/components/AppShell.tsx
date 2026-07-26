// App shell del panel: sidebar izquierdo + topbar (busqueda, toggle TEST/PROD, usuario).
// Estetica clara con tarjetas redondeadas y color de acento, segun las referencias.
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { EnvToggle } from './EnvToggle'

interface NavItem {
  label: string
  to: string
  soon?: boolean
}

const MAIN: NavItem[] = [
  { label: 'Dashboard', to: '/' },
  { label: 'Documentos', to: '/documentos' },
  { label: 'Establecimientos', to: '/establecimientos', soon: true },
]
const CONFIG: NavItem[] = [
  { label: 'API keys', to: '/api-keys', soon: true },
  { label: 'Certificado', to: '/certificado', soon: true },
  { label: 'Ambientes', to: '/ambientes', soon: true },
  { label: 'Equipo', to: '/equipo', soon: true },
]

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-6">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted/70">{title}</p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-400 text-ink shadow-sm' : 'text-muted hover:bg-cream hover:text-ink',
              )
            }
          >
            {item.label}
            {item.soon && (
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-muted">
                pronto
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-cream-soft">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 text-xl font-extrabold tracking-tight text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400 text-ink">e</span>
          esign
        </div>
        <NavGroup title="Main" items={MAIN} />
        <NavGroup title="Configuracion" items={CONFIG} />
        <div className="mt-auto px-2">
          <button onClick={handleLogout} className="text-sm font-medium text-muted hover:text-danger">
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-ink">{title}</h1>
            <p className="text-xs text-muted">{session?.businessName}</p>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <EnvToggle />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {session?.businessName?.[0]?.toUpperCase() ?? 'E'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
