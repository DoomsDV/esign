// Componentes UI base del panel (estetica calida crema + acento naranja).
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'success'
  | 'success-outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-400 text-ink hover:bg-brand-500 active:bg-brand-600 shadow-sm disabled:opacity-60',
  secondary:
    'bg-white text-ink border border-line hover:bg-cream disabled:opacity-60',
  soft: 'bg-cream text-ink hover:bg-line/70 disabled:opacity-60',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-cream',
  danger:
    'bg-danger text-white hover:bg-danger-strong active:bg-danger-strong shadow-sm disabled:opacity-60',
  'danger-outline':
    'bg-white text-danger border border-danger/40 hover:bg-danger/5 active:bg-danger/10 disabled:opacity-60',
  success:
    'bg-ok text-white hover:bg-ok-strong active:bg-ok-strong shadow-sm disabled:opacity-60',
  'success-outline':
    'bg-white text-ok-strong border border-ok/40 hover:bg-ok/5 active:bg-ok/10 disabled:opacity-60',
}

export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
        variantClasses[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}

/** Disco / guardar — trazo uniforme para botones de persistencia. */
export function IconSave({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
        className="stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 21v-8H7v8M7 3v5h8"
        className="stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: ReactNode
  error?: string
  requiredMark?: boolean
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, hint, error, requiredMark, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
          {requiredMark && <span className="ml-0.5 text-danger/45">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/55 placeholder:italic shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/50',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className,
        )}
        {...rest}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  )
})

/** Superficie blanca "flotante" estilo Vercel/Stripe: borde sutil + sombra ligera.
 *  Reutilizable en páginas que no usan el componente `Card` directamente. */
export const panelClass =
  'rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.16)]'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(panelClass, className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  action,
  className,
  compactOnMobile,
}: {
  title: ReactNode
  description?: string
  action?: ReactNode
  className?: string
  /** Oculta la descripción en mobile y muestra InfoTip junto al título. */
  compactOnMobile?: boolean
}) {
  const titleIsPlain = typeof title === 'string'

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        {titleIsPlain ? (
          <h2 className="inline-flex max-w-full items-center gap-1.5 text-lg font-semibold tracking-tight text-ink">
            <span className="truncate">{title}</span>
            {description && compactOnMobile ? <InfoTip text={description} className="sm:hidden" /> : null}
          </h2>
        ) : (
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        )}
        {description && (
          <p
            className={cn(
              'mt-1 max-w-2xl text-sm leading-relaxed text-muted',
              compactOnMobile && 'hidden sm:block',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action ? <div className="shrink-0 max-sm:w-full">{action}</div> : null}
    </div>
  )
}

/** Título de sección/panel: texto completo en desktop, InfoTip inline en mobile. */
export function SectionHint({
  as: Tag = 'h3',
  title,
  tip,
  className,
  titleClassName,
}: {
  as?: 'h2' | 'h3' | 'h4'
  title: ReactNode
  tip?: string
  className?: string
  titleClassName?: string
}) {
  return (
    <div className={className}>
      <Tag
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 tracking-tight text-ink',
          titleClassName ?? 'text-[15px] font-semibold',
        )}
      >
        <span className="min-w-0">{title}</span>
        {tip ? <InfoTip text={tip} className="sm:hidden" /> : null}
      </Tag>
      {tip ? <p className="mt-1 hidden text-sm leading-relaxed text-muted sm:block">{tip}</p> : null}
    </div>
  )
}

export function InfoTip({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  return (
    <span ref={rootRef} className={cn('group/info relative inline-flex shrink-0 align-middle', className)}>
      <button
        type="button"
        aria-label="Más información"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted/80 transition-colors hover:bg-cream hover:text-ink sm:h-5 sm:w-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" className="stroke-current" strokeWidth="1.8" />
          <path d="M12 11v5M12 8h.01" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'absolute left-0 top-[calc(100%+6px)] z-50 w-[min(18rem,calc(100vw-2.5rem))] rounded-xl bg-ink px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white shadow-lg',
          open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0',
          'sm:left-1/2 sm:w-64 sm:-translate-x-1/2',
          'sm:group-hover/info:visible sm:group-hover/info:pointer-events-auto sm:group-hover/info:opacity-100',
        )}
      >
        {text}
      </span>
    </span>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      {children}
    </div>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {children}
    </span>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, className, children, id, ...rest }: SelectProps) {
  const selectId = id ?? rest.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/50',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  )
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok"
    >
      {children}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div id={titleId} className="text-lg font-bold text-ink">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Panel lateral que entra desde la derecha (side drawer). */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  widthClass = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}) {
  return (
    <div
      className={cn('fixed inset-0 z-50', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal={open}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
          widthClass,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="text-lg font-bold text-ink">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line bg-white px-5 py-4 sm:px-6">{footer}</div>
        )}
      </aside>
    </div>
  )
}

export interface MenuItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  danger?: boolean
}

/** Menú de acciones "kebab" (tres puntos). El popover se renderiza en un portal
 *  con position:fixed para no quedar recortado por overflow de tablas/tarjetas. */
export function Menu({
  items,
  label = 'Más acciones',
  align = 'right',
}: {
  items: MenuItem[]
  label?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemCount = items.length

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    const btn = triggerRef.current
    if (!btn) return
    const place = () => {
      const rect = btn.getBoundingClientRect()
      const menuWidth = 192
      const gap = 6
      const left =
        align === 'right'
          ? Math.max(8, rect.right - menuWidth)
          : Math.min(window.innerWidth - menuWidth - 8, rect.left)
      const spaceBelow = window.innerHeight - rect.bottom
      const estimatedHeight = 8 + itemCount * 40
      const openUp = spaceBelow < estimatedHeight + gap && rect.top > spaceBelow
      const top = openUp ? rect.top - gap - estimatedHeight : rect.bottom + gap
      setCoords({ top: Math.max(8, top), left })
    }
    place()
  }, [open, align, itemCount])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onReposition = () => {
      const btn = triggerRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const menuWidth = 192
      const gap = 6
      const left =
        align === 'right'
          ? Math.max(8, rect.right - menuWidth)
          : Math.min(window.innerWidth - menuWidth - 8, rect.left)
      const spaceBelow = window.innerHeight - rect.bottom
      const estimatedHeight = 8 + itemCount * 40
      const openUp = spaceBelow < estimatedHeight + gap && rect.top > spaceBelow
      const top = openUp ? rect.top - gap - estimatedHeight : rect.bottom + gap
      setCoords({ top: Math.max(8, top), left })
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, align, itemCount])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-cream hover:text-ink',
          open && 'bg-cream text-ink',
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="5" r="1.6" className="fill-current" />
          <circle cx="12" cy="12" r="1.6" className="fill-current" />
          <circle cx="12" cy="19" r="1.6" className="fill-current" />
        </svg>
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 80 }}
            className="w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  item.danger
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-ink hover:bg-cream',
                )}
              >
                {item.icon && (
                  <span className="grid h-4 w-4 shrink-0 place-items-center">{item.icon}</span>
                )}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

export interface SearchSelectOption {
  value: string
  label: string
}

/** Select con búsqueda interna; útil para catálogos largos (geo, etc.).
 *  El panel se renderiza en portal (fixed) para no quedar recortado por overflow. */
export function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  searchable = true,
  requiredMark,
  error,
  disabled,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: SearchSelectOption[]
  placeholder?: string
  searchable?: boolean
  requiredMark?: boolean
  error?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [coords, setCoords] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
    openUp: boolean
  } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const placePanel = () => {
    const btn = triggerRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8
    const spaceAbove = rect.top - gap - 8
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow
    const available = Math.max(120, openUp ? spaceAbove : spaceBelow)
    const maxHeight = Math.min(280, available)
    setCoords({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUp,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    placePanel()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
      setQ('')
    }
    const onReposition = () => placePanel()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const current = options.find((o) => o.value === value)
  const filtered =
    searchable && q
      ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
      : options

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {requiredMark && <span className="ml-0.5 text-danger/45">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-brand-300 ring-2 ring-brand-200',
          error && 'border-danger',
        )}
      >
        <span className={cn('truncate text-left', current ? 'text-ink' : 'text-muted/70')}>
          {current?.label ?? placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        >
          <path
            d="m6 9 6 6 6-6"
            className="stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              transform: coords.openUp ? 'translateY(-100%)' : undefined,
              zIndex: 80,
            }}
            className="flex flex-col rounded-xl border border-line bg-white p-1.5 shadow-xl"
          >
            {searchable && (
              <div className="mb-1.5 flex shrink-0 items-center gap-2 rounded-lg bg-cream px-2.5 py-1.5 text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="7" className="stroke-current" strokeWidth="1.8" />
                  <path
                    d="m20 20-3.2-3.2"
                    className="stroke-current"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar…"
                  autoFocus
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
                />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                    setQ('')
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-cream',
                    value === o.value && 'bg-cream font-medium',
                  )}
                >
                  <span>{o.label}</span>
                  {value === o.value && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="shrink-0 text-brand-600"
                      aria-hidden
                    >
                      <path
                        d="m5 13 4 4L19 7"
                        className="stroke-current"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-2.5 py-3 text-center text-xs text-muted">Sin resultados</p>
              )}
            </div>
          </div>,
          document.body,
        )}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </div>
  )
}
