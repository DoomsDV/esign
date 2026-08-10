// App shell del panel: sidebar colapsable + topbar + banner de ambiente.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { EnvToggle } from './EnvToggle'
import { BrandLogo } from './BrandLogo'
import { usePageTitle } from '@/lib/usePageTitle'

interface NavItem {
  label: string
  to: string
  icon: ReactNode
}

function IconDash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="2" className="stroke-current" strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="5" rx="2" className="stroke-current" strokeWidth="1.8" />
      <rect x="13" y="10" width="8" height="11" rx="2" className="stroke-current" strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" className="stroke-current" strokeWidth="1.8" />
    </svg>
  )
}
function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" className="stroke-current" strokeWidth="1.8" />
      <path d="M14 3v5h5M9 13h6M9 17h4" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconStore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10h16l-1.2 9.2A2 2 0 0 1 16.8 21H7.2a2 2 0 0 1-2-1.8L4 10Z" className="stroke-current" strokeWidth="1.8" />
      <path d="M4 10 6 4h12l2 6M9 14v4M15 14v4" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M14 21h6V10h-6M8 8h3M8 12h3M8 16h3" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconKey() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="7.5" cy="12" r="3.5" className="stroke-current" strokeWidth="1.8" />
      <path
        d="M11 12h9.5M17.5 12v2.5M20.5 12v2.5"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IconPalette() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.2-1.85-.25-.5-.05-1.1.45-1.35A2 2 0 0 1 15 19h1.5A4.5 4.5 0 0 0 21 14.5C21 8.15 17.1 3 12 3Z"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="11.5" r="1.3" className="fill-current" />
      <circle cx="10.5" cy="7.5" r="1.3" className="fill-current" />
      <circle cx="15" cy="8" r="1.3" className="fill-current" />
    </svg>
  )
}
function IconCert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="5" className="stroke-current" strokeWidth="1.8" />
      <path d="m9 13.5 1.5 7 1.5-3 1.5 3L15 13.5" className="stroke-current" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
function IconEnv() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18h16M7 18V8l5-4 5 4v10" className="stroke-current" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18v-4h4v4" className="stroke-current" strokeWidth="1.8" />
    </svg>
  )
}
function IconTeam() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" className="stroke-current" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.5" className="stroke-current" strokeWidth="1.8" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19M14 14.5c1.8.2 3.4 1.2 4.5 3.5" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h9" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
// IconMenu: hamburguesa ↔ X con trazo vectorial uniforme (evita líneas gruesas por subpíxeles).
function IconMenu({ isX }: { isX: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={isX ? 'M6 6l12 12M18 6L6 18' : 'M5 7h14M5 12h14M5 17h14'}
        className="stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const PRIMARY: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <IconDash /> },
  { label: 'Documentos', to: '/documentos', icon: <IconDocs /> },
  { label: 'Establecimientos', to: '/establecimientos', icon: <IconStore /> },
]
const CONFIG: NavItem[] = [
  { label: 'Empresa', to: '/empresa', icon: <IconBuilding /> },
  { label: 'Diseño KuDE', to: '/diseno-kude', icon: <IconPalette /> },
  { label: 'API keys', to: '/api-keys', icon: <IconKey /> },
  { label: 'Certificado', to: '/certificado', icon: <IconCert /> },
  { label: 'Ambientes', to: '/ambientes', icon: <IconEnv /> },
  { label: 'Equipo', to: '/equipo', icon: <IconTeam /> },
]

function NavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className={cn('flex flex-col gap-1', collapsed && 'items-center')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex h-10 items-center rounded-xl text-sm font-medium transition-colors',
              collapsed ? 'w-10 justify-center px-0' : 'w-full gap-3 px-3',
              isActive
                ? 'bg-brand-400 text-ink shadow-sm'
                : 'text-muted hover:bg-cream hover:text-ink',
            )
          }
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center">{item.icon}</span>
          {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  const { session, logout, environment } = useAuth()
  const navigate = useNavigate()

  // Persistido: cada ruta monta su propio AppShell, así que sin esto el estado
  // colapsado se perdería al navegar (volvería a expandirse).
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('esign.sidebarCollapsed') === '1',
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )

  useEffect(() => {
    localStorage.setItem('esign.sidebarCollapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      setIsDesktop(mq.matches)
      if (mq.matches) setMobileOpen(false)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Bloquea scroll del body cuando el drawer móvil está abierto.
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function closeMobileMenu() {
    setMobileOpen(false)
    requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  function toggleMenu() {
    if (isDesktop) {
      setCollapsed((v) => !v)
    } else if (mobileOpen) {
      closeMobileMenu()
    } else {
      setMobileOpen(true)
    }
  }

  // Desktop: siempre hamburguesa (colapsar/expandir). X solo en móvil con drawer abierto
  // — una X junto a una vista principal se lee como "cerrar modal" y confunde.
  const menuOpen = isDesktop ? false : mobileOpen
  const menuHighlighted = isDesktop ? collapsed : mobileOpen

  const isTest = environment === 'TEST'

  usePageTitle(title)

  // Contenido del sidebar con ancho fijo (16rem). El aside padre lo recorta
  // vía overflow-hidden cuando colapsa: no animamos textos individuales, así
  // evitamos layout thrash y lag.
  const sidebarContent = (isCollapsed: boolean) => (
    <div className="flex h-full w-full flex-col overflow-y-auto px-3 py-5">
      <BrandLogo asLink collapsed={isCollapsed} className="mb-6" />

      <div className="mb-5">
        <NavList items={PRIMARY} collapsed={isCollapsed} onNavigate={closeMobileMenu} />
      </div>

      {isCollapsed ? (
        <div className="mx-auto mb-2 h-px w-8 bg-line" />
      ) : (
        <p className="mb-2 h-4 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wider text-ink/55">
          Configuración
        </p>
      )}
      <NavList items={CONFIG} collapsed={isCollapsed} onNavigate={closeMobileMenu} />

      <div className={cn('mt-auto flex pt-4', isCollapsed && 'justify-center')}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex h-10 items-center rounded-xl text-sm font-medium text-muted transition-colors hover:bg-cream',
            isTest ? 'hover:text-danger' : 'hover:text-ok-strong',
            isCollapsed ? 'w-10 justify-center px-0' : 'w-full gap-3 px-3',
          )}
          title="Cerrar sesión"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center">
            <IconLogout />
          </span>
          {!isCollapsed && <span className="whitespace-nowrap">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  )

  // Sidebar desktop: solo animamos el width del <aside>. El contenido interno
  // vive con w-64 fijo; overflow-hidden lo recorta al colapsar.
  const desktopSidebar = (
    <aside
      className={cn(
        'hidden h-full shrink-0 overflow-hidden border-r border-line bg-white md:block',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
      aria-label="Menú lateral"
    >
      {sidebarContent(collapsed)}
    </aside>
  )

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-white', !isTest && 'env-prod')}>
      {desktopSidebar}

      {/* Drawer móvil — inert al cerrar; no aria-hidden en ancestro con foco */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          onClick={closeMobileMenu}
          className={cn(
            'absolute inset-0 bg-ink/40 transition-opacity duration-200 ease-out',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
        <aside
          inert={!mobileOpen ? true : undefined}
          aria-label="Menú de navegación"
          className={cn(
            'absolute inset-y-0 left-0 w-64 bg-white shadow-2xl',
            'transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarContent(false)}
        </aside>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Franja de ambiente: cue visual sin ocupar una fila de contenido */}
        <div
          className={cn('h-1 w-full shrink-0', isTest ? 'bg-brand-400' : 'bg-ok')}
          aria-hidden
        />
        <header className="shrink-0 border-b border-line bg-white">
          <div className="flex items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={toggleMenu}
                className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink',
                  'transition-colors duration-150 hover:bg-cream active:bg-cream',
                  menuHighlighted && 'border-brand-300 bg-brand-50 text-brand-700',
                )}
                aria-label={
                  isDesktop
                    ? collapsed
                      ? 'Expandir menú'
                      : 'Colapsar menú'
                    : mobileOpen
                      ? 'Cerrar menú'
                      : 'Abrir menú'
                }
                aria-expanded={isDesktop ? !collapsed : mobileOpen}
              >
                <IconMenu isX={menuOpen} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-bold text-ink sm:text-lg">{title}</h1>
                <p className="hidden truncate text-xs text-muted sm:block">{session?.businessName}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {actions && <div className="hidden sm:block">{actions}</div>}
              <EnvToggle />
              <div className="hidden h-9 w-9 place-items-center rounded-full bg-brand-100 text-[11px] font-bold tracking-wide text-brand-700 sm:grid">
                {(session?.businessName ?? 'ES')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? '')
                  .join('') || 'E'}
              </div>
            </div>
          </div>

          {actions && (
            <div className="border-t border-line/70 px-4 py-2.5 sm:hidden [&_button]:w-full">
              {actions}
            </div>
          )}
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-cream-soft p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
