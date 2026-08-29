// App shell del panel: sidebar colapsable + topbar + banner de ambiente.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { Menu } from '@/components/ui'
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
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" className="stroke-current" strokeWidth="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" className="stroke-current" strokeWidth="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" className="stroke-current" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" className="stroke-current" strokeWidth="1.8" />
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
    <nav className={cn('flex flex-col gap-0.5', collapsed && 'items-center')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex h-10 items-center rounded-xl text-sm font-medium',
              'transition-[color,background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50',
              collapsed ? 'w-10 justify-center px-0' : 'w-full gap-3 px-3',
              isActive
                ? 'text-brand-700'
                : 'text-muted hover:bg-cream/80 hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className={cn(
                    'absolute rounded-full bg-brand-500',
                    collapsed
                      ? 'bottom-1 left-1/2 h-0.5 w-3.5 -translate-x-1/2'
                      : 'left-0 top-1/2 h-5 w-[3px] -translate-y-1/2',
                  )}
                  aria-hidden
                />
              )}
              <span className="grid h-5 w-5 shrink-0 place-items-center">{item.icon}</span>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function HeaderSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [modKey, setModKey] = useState('Ctrl')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setModKey(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl')
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      className="header-search flex w-full"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const term = q.trim()
        navigate(term ? `/documentos?q=${encodeURIComponent(term)}` : '/documentos')
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden>
        <circle cx="11" cy="11" r="6.5" className="stroke-current" strokeWidth="1.6" />
        <path d="m20 20-3.4-3.4" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar documentos, CDC o receptor"
        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        aria-label="Buscar documentos"
      />
      <button type="submit" className="sr-only">
        Buscar
      </button>
      <kbd className="hidden lg:inline" aria-hidden>
        {modKey === '⌘' ? '⌘K' : 'Ctrl K'}
      </kbd>
    </form>
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

  const itemShell = (active: boolean) =>
    cn(
      'relative flex min-h-[3.1rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[0.95rem] px-1.5 py-1',
      'transition-[transform,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      active ? 'text-brand-700' : 'text-muted active:scale-[0.96] active:text-ink',
    )

  const labelClass = (active: boolean) =>
    cn(
      'relative z-10 max-w-full truncate text-[10px] tracking-[0.02em]',
      active ? 'font-semibold' : 'font-medium',
    )

  function NavItemContent({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
    return (
      <>
        {active && (
          <span
            aria-hidden
            className="absolute inset-x-1 inset-y-0.5 rounded-[0.9rem] bg-brand-50/95 dark:bg-brand-100/25"
          />
        )}
        <span
          className={cn(
            'relative z-10 grid h-7 w-7 place-items-center transition-[transform,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            active ? 'scale-[1.08] text-brand-700' : 'text-muted',
          )}
        >
          {icon}
        </span>
        <span className={cn(labelClass(active), !active && 'opacity-75')}>{label}</span>
      </>
    )
  }

  return (
    <nav
      inert={menuOpen ? true : undefined}
      className={cn(
        'mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 md:hidden',
        'px-3 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]',
        'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        menuOpen && 'pointer-events-none translate-y-[calc(100%+0.75rem)]',
      )}
      aria-label="Navegación principal"
      aria-hidden={menuOpen ? true : undefined}
    >
      <div className="mobile-bottom-nav__island mx-auto max-w-md">
        <ul className="flex items-stretch justify-around gap-1 px-1.5 py-1.5">
          {MOBILE_NAV.map((item) => {
            const isMenu = item.action === 'menu'

            if (isMenu) {
              const isHighlighted = onConfigRoute || menuOpen
              return (
                <li key={item.label} className="flex min-w-0 flex-1">
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={onToggleMenu}
                    className={itemShell(isHighlighted)}
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? 'Cerrar menú de configuración' : 'Abrir menú de configuración'}
                  >
                    <NavItemContent active={isHighlighted} icon={item.icon} label={item.label} />
                  </button>
                </li>
              )
            }

            return (
              <li key={item.to} className="flex min-w-0 flex-1">
                <NavLink
                  to={item.to!}
                  end={item.to === '/'}
                  className={({ isActive }) => itemShell(isActive)}
                >
                  {({ isActive }) => (
                    <NavItemContent active={isActive} icon={item.icon} label={item.label} />
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

  const accountInitials =
    (session?.businessName ?? 'ES')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'E'

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
          <p className="mb-1.5 h-4 whitespace-nowrap px-3 text-[11px] font-medium tracking-wide text-muted">
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
        'hidden h-full shrink-0 overflow-hidden bg-surface md:block',
        'transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
      aria-label="Menú lateral"
    >
      {sidebarContent(collapsed)}
    </aside>
  )

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-cream-soft', !isTest && 'env-prod')}>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
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
            'absolute inset-0 bg-black/30 transition-opacity duration-200 ease-out dark:bg-black/45',
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
        <div
          className={cn('hidden h-1 w-full shrink-0 md:block', isTest ? 'bg-brand-400' : 'bg-ok')}
          aria-hidden
        />
        <header className="shrink-0 bg-surface md:bg-surface/90 md:backdrop-blur-xl">
          {/* Mobile: logo + ambiente + cuenta en una sola fila */}
          <div className="md:hidden">
            <div
              className={cn('h-0.5 w-full shrink-0', isTest ? 'bg-brand-400/90' : 'bg-ok/90')}
              aria-hidden
            />
            <div className="flex items-center gap-2 px-3 py-2.5">
              <BrandLogo asLink className="min-w-0 shrink-0 px-0" />
              <h1 className="sr-only">{title}</h1>
              <div className="ml-auto flex shrink-0 select-none items-center gap-1">
                <EnvToggle />
                <ThemeToggle className="shell-icon-btn grid bg-cream-soft ring-1 ring-line/70 hover:bg-cream" />
                <Menu
                  label={session?.businessName ? `Cuenta: ${session.businessName}` : 'Menú de cuenta'}
                  align="right"
                  trigger={accountInitials}
                  triggerClassName={cn(
                    'grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[0.7rem]',
                    'bg-brand-100 text-[11px] font-semibold tracking-wide text-brand-700',
                    'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    'hover:scale-[0.98] active:scale-95',
                  )}
                  items={[
                    {
                      label: 'Cerrar sesión',
                      onClick: handleLogout,
                      icon: <IconLogout />,
                      danger: isTest,
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 md:flex">
            <div className="app-header-title flex min-w-0 flex-1 items-center gap-2">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={toggleDesktopSidebar}
                className={cn(
                  'shell-icon-btn grid',
                  collapsed && 'bg-brand-50 text-brand-700',
                )}
                aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                aria-expanded={!collapsed}
              >
                <IconMenu isX={false} />
              </button>
              <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-ink sm:text-base">
                {title}
              </h1>
            </div>

            <div className="app-header-search flex flex-1 justify-center">
              <div className="mx-auto w-full min-w-0 max-w-xl">
                <HeaderSearch />
              </div>
            </div>

            <div className="flex shrink-0 select-none items-center gap-1 sm:gap-2">
              {actions && <div className="hidden sm:block">{actions}</div>}
              <EnvToggle />
              <ThemeToggle className="shell-icon-btn grid bg-cream-soft ring-1 ring-line/70 hover:bg-cream" />
              <Menu
                label={session?.businessName ? `Cuenta: ${session.businessName}` : 'Menú de cuenta'}
                align="right"
                trigger={accountInitials}
                triggerClassName={cn(
                  'grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[0.7rem]',
                  'bg-brand-100 text-[11px] font-semibold tracking-wide text-brand-700',
                  'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'hover:scale-[0.98] active:scale-95',
                )}
                items={[
                  {
                    label: 'Cerrar sesión',
                    onClick: handleLogout,
                    icon: <IconLogout />,
                    danger: isTest,
                  },
                ]}
              />
            </div>
          </div>

          {actions && (
            <div className="border-t border-line/70 px-4 py-2.5 sm:hidden [&_button]:w-full">
              {actions}
            </div>
          )}
        </header>

        <main
          id="contenido"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-cream-soft p-3 pb-[calc(5.15rem+env(safe-area-inset-bottom,0px))] sm:p-4 sm:px-6 sm:pt-6 md:pb-6"
        >
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
