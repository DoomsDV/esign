// Componentes UI base del panel (estetica calida crema + acento naranja).
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
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

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
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
    <div className="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok">{children}</div>
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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-lg font-bold text-ink">{title}</div>
          <button
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

/** Menú de acciones "kebab" (tres puntos). Popover alineado a la derecha con
 *  cierre por click-afuera; pensado para acciones a nivel de fila en tablas. */
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
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
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-1.5 w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
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
              {item.icon && <span className="grid h-4 w-4 shrink-0 place-items-center">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export interface SearchSelectOption {
  value: string
  label: string
}

/** Select con búsqueda interna; útil para catálogos largos (geo, etc.). */
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = options.find((o) => o.value === value)
  const filtered =
    searchable && q
      ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
      : options

  return (
    <div className="relative w-full" ref={ref}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {requiredMark && <span className="ml-0.5 text-danger/45">*</span>}
        </label>
      )}
      <button
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden>
          <path d="m6 9 6 6 6-6" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full rounded-xl border border-line bg-white p-1.5 shadow-xl">
          {searchable && (
            <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-cream px-2.5 py-1.5 text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" className="stroke-current" strokeWidth="1.8" />
                <path d="m20 20-3.2-3.2" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
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
          <div className="max-h-56 overflow-auto">
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-brand-600" aria-hidden>
                    <path d="m5 13 4 4L19 7" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-muted">Sin resultados</p>
            )}
          </div>
        </div>
      )}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </div>
  )
}
