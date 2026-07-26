// Componentes UI base del panel (estetica calida crema + acento naranja).
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-400 text-ink hover:bg-brand-500 active:bg-brand-600 shadow-sm disabled:opacity-60',
  secondary:
    'bg-white text-ink border border-line hover:bg-cream disabled:opacity-60',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-cream',
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
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/70 shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200',
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

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-3xl bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]', className)}>
      {children}
    </div>
  )
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
          'rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200',
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
