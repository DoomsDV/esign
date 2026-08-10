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

export function InfoTip({
  text,
  className,
  align = 'start',
  side = 'bottom',
}: {
  text: string
  className?: string
  /** Alineación horizontal del popover en mobile (tap). */
  align?: 'start' | 'end'
  /** Lado vertical del popover en mobile (tap). */
  side?: 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    width: number
    openUp: boolean
  } | null>(null)
  const id = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)

  const placePanel = () => {
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 12
    const width = Math.min(288, window.innerWidth - margin * 2)
    let left = align === 'end' ? rect.right - width : rect.left
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - width))

    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin
    const spaceAbove = rect.top - gap - margin
    const openUp =
      side === 'top' || (side === 'bottom' && spaceBelow < 72 && spaceAbove > spaceBelow)

    setCoords({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left,
      width,
      openUp,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    placePanel()
  }, [open, align, side])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onReposition = () => placePanel()
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, align, side])

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
      {/* Desktop: hover */}
      {!open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 hidden w-64 -translate-x-1/2 rounded-xl bg-ink px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg invisible sm:block',
            'sm:group-hover/info:visible sm:group-hover/info:opacity-100',
          )}
        >
          {text}
        </span>
      )}
      {/* Tap (mobile/tablet): portal fijo para no quedar recortado por overflow de padres */}
      {open &&
        coords &&
        createPortal(
          <span
            ref={panelRef}
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUp ? 'translateY(-100%)' : undefined,
              zIndex: 80,
            }}
            className="rounded-xl bg-ink px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="modal-backdrop-enter absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'modal-sheet-enter relative z-10 flex w-full max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] flex-col bg-white shadow-2xl outline-none',
          'rounded-t-2xl pb-[max(0px,env(safe-area-inset-bottom))]',
          'sm:max-h-[90vh] sm:max-w-2xl sm:overflow-auto sm:rounded-3xl sm:p-6 sm:pb-6',
        )}
      >
        <div className="relative shrink-0 px-5 pt-3 sm:px-0 sm:pt-0">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4 sm:mb-4">
            <div id={titleId} className="text-lg font-bold text-ink">
              {title}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:overflow-visible sm:px-0 sm:pb-0">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Convierte clases max-w-* para aplicarlas solo desde sm+ (side drawer desktop). */
function smWidthClass(widthClass: string): string {
  return widthClass
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => (c.startsWith('max-w-') ? `sm:${c}` : c))
    .join(' ')
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
    >
      <div
        className={cn(
          'absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal={open}
        inert={!open ? true : undefined}
        className={cn(
          'absolute flex w-full max-w-none flex-col bg-white shadow-2xl',
          'inset-x-0 bottom-0 top-auto max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] rounded-t-2xl pb-[max(0px,env(safe-area-inset-bottom))]',
          'transition-transform duration-200 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          'sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:top-0 sm:bottom-0 sm:h-full sm:max-h-none sm:rounded-none sm:pb-0',
          open ? 'sm:translate-x-0 sm:translate-y-0' : 'sm:translate-x-full sm:translate-y-0',
          smWidthClass(widthClass),
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:mt-0 sm:px-6">
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
          'flex w-full min-w-0 items-start justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-brand-300 ring-2 ring-brand-200',
          error && 'border-danger',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 text-left leading-snug break-words whitespace-normal',
            current ? 'text-ink' : 'text-muted/70',
          )}
        >
          {current?.label ?? placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={cn('mt-0.5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
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
                    'flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-cream',
                    value === o.value && 'bg-cream font-medium',
                  )}
                >
                  <span className="min-w-0 flex-1 leading-snug break-words">{o.label}</span>
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
