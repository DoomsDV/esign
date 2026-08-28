// App shell del panel: sidebar colapsable + topbar + banner de ambiente.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { EnvToggle } from './EnvToggle'
import { ThemeToggle } from './ThemeToggle'
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

const CONFIG_PATHS = new Set(CONFIG.map((item) => item.to))

function IconMore() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="1.6" className="fill-current" />
      <circle cx="12" cy="12" r="1.6" className="fill-current" />
      <circle cx="18" cy="12" r="1.6" className="fill-current" />
    </svg>
  )
}

interface MobileNavItem {
  label: string
  to?: string
  icon: ReactNode
  action?: 'menu'
}

const MOBILE_NAV: MobileNavItem[] = [
  { label: 'Inicio', to: '/', icon: <IconDash /> },
  { label: 'Documentos', to: '/documentos', icon: <IconDocs /> },
  { label: 'Locales', to: '/establecimientos', icon: <IconStore /> },
  { label: 'Más', icon: <IconMore />, action: 'menu' },
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

function MobileBottomNav({
  onToggleMenu,
  menuOpen,
  moreButtonRef,
}: {
  onToggleMenu: () => void
  menuOpen: boolean
  moreButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const { pathname } = useLocation()
  const onConfigRoute = CONFIG_PATHS.has(pathname)

  return (
    <nav
      inert={menuOpen ? true : undefined}
      className={cn(
        'mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 md:hidden',
        'transition-transform duration-200 ease-out',
        menuOpen && 'pointer-events-none translate-y-full',
      )}
      aria-label="Navegación principal"
      aria-hidden={menuOpen ? true : undefined}
    >
      <div className="mobile-bottom-nav__surface border-t border-line/70 bg-surface/92 backdrop-blur-xl">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5">
          {MOBILE_NAV.map((item) => {
            const isMenu = item.action === 'menu'

            const itemClass = (active: boolean) =>
              cn(
                'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1',
                'text-[10px] font-semibold tracking-wide transition-[color,transform,background-color] duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2',
                active
                  ? 'text-brand-700'
                  : 'text-muted active:scale-[0.97] active:text-ink',
              )

            const iconWrap = (active: boolean) =>
              cn(
                'grid h-8 w-8 place-items-center rounded-xl transition-colors duration-200',
                active && 'bg-brand-100 text-brand-700',
              )

            if (isMenu) {
              const isHighlighted = onConfigRoute || menuOpen
              return (
                <li key={item.label} className="flex min-w-0 flex-1">
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={onToggleMenu}
                    className={itemClass(isHighlighted)}
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? 'Cerrar menú de configuración' : 'Abrir menú de configuración'}
                  >
                    <span className={iconWrap(isHighlighted)}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              )
            }

            return (
              <li key={item.to} className="flex min-w-0 flex-1">
                <NavLink
                  to={item.to!}
                  end={item.to === '/'}
                  className={({ isActive }) => itemClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <span className={iconWrap(isActive)}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
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
  const mobileMoreButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    localStorage.setItem('esign.sidebarCollapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      if (mq.matches) setMobileOpen(false)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Bloquea scroll del body cuando el bottom sheet móvil está abierto.
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
    requestAnimationFrame(() => mobileMoreButtonRef.current?.focus())
  }

  function openMobileMenu() {
    setMobileOpen(true)
  }

  function toggleMobileMenu() {
    if (mobileOpen) closeMobileMenu()
    else openMobileMenu()
  }

  function toggleDesktopSidebar() {
    setCollapsed((v) => !v)
  }

  const isTest = environment === 'TEST'

  usePageTitle(title)

  // Contenido del sidebar desktop (ancho fijo 16rem).
  const sidebarContent = (isCollapsed: boolean, includePrimary = true) => (
    <div className="flex h-full w-full flex-col overflow-y-auto px-3 py-5">
      <BrandLogo asLink collapsed={isCollapsed} className="mb-6" />

      {includePrimary && (
        <div className="mb-5">
          <NavList items={PRIMARY} collapsed={isCollapsed} onNavigate={closeMobileMenu} />
        </div>
      )}

      {includePrimary && isCollapsed ? (
        <div className="mx-auto mb-2 h-px w-8 bg-line" />
      ) : (
        !isCollapsed && (
          <p className="mb-2 h-4 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wider text-ink/55">
            Configuración
          </p>
        )
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

  const mobileConfigSheet = (
    <div className="flex flex-col px-3 pb-2">
      <NavList items={CONFIG} collapsed={false} onNavigate={closeMobileMenu} />
      <div className="mt-3 border-t border-line pt-3">
        <button
          onClick={handleLogout}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-cream',
            isTest ? 'hover:text-danger' : 'hover:text-ok-strong',
          )}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center">
            <IconLogout />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  // Sidebar desktop: solo animamos el width del <aside>. El contenido interno
  // vive con w-64 fijo; overflow-hidden lo recorta al colapsar.
  const desktopSidebar = (
    <aside
      className={cn(
        'hidden h-full shrink-0 overflow-hidden border-r border-line bg-surface md:block',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
      aria-label="Menú lateral"
    >
      {sidebarContent(collapsed)}
    </aside>
  )

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-surface', !isTest && 'env-prod')}>
      {desktopSidebar}

      {/* Bottom sheet móvil — configuración */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          onClick={closeMobileMenu}
          className={cn(
            'absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ease-out',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
        <aside
          role="dialog"
          aria-modal={mobileOpen ? true : undefined}
          inert={!mobileOpen ? true : undefined}
          aria-label="Configuración"
          className={cn(
            'mobile-config-sheet absolute inset-x-0 bottom-0 flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] flex-col bg-surface shadow-2xl',
            'rounded-t-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            mobileOpen ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden />
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-base font-bold text-ink">Configuración</h2>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-cream hover:text-ink active:scale-[0.97]"
              aria-label="Cerrar configuración"
            >
              <IconMenu isX />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
            {mobileConfigSheet}
          </div>
        </aside>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Franja de ambiente: cue visual sin ocupar una fila de contenido */}
        <div
          className={cn('h-1 w-full shrink-0', isTest ? 'bg-brand-400' : 'bg-ok')}
          aria-hidden
        />
        <header className="shrink-0 border-b border-line bg-surface">
          <div className="flex items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={toggleDesktopSidebar}
                className={cn(
                  'hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink md:grid',
                  'transition-colors duration-150 hover:bg-cream active:bg-cream',
                  collapsed && 'border-brand-300 bg-brand-50 text-brand-700',
                )}
                aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                aria-expanded={!collapsed}
              >
                <IconMenu isX={false} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-bold text-ink sm:text-lg">{title}</h1>
                <p className="truncate text-[11px] text-muted sm:text-xs">{session?.businessName}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              {actions && <div className="hidden sm:block">{actions}</div>}
              <EnvToggle />
              <ThemeToggle />
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold tracking-wide text-brand-700 sm:h-9 sm:w-9 sm:text-[11px]"
                title={session?.businessName ?? 'Cuenta'}
                aria-label={session?.businessName ? `Cuenta: ${session.businessName}` : 'Cuenta'}
              >
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

        <main className="min-h-0 flex-1 overflow-auto bg-cream-soft p-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-6 md:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav
        onToggleMenu={toggleMobileMenu}
        menuOpen={mobileOpen}
        moreButtonRef={mobileMoreButtonRef}
      />
    </div>
  )
}
