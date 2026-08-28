// Toggle global TEST/PROD — segment control moderno (pill + thumb deslizante).
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { Environment } from '@/lib/env'

const OPTIONS: Environment[] = ['TEST', 'PROD']

const META: Record<Environment, { title: string }> = {
  TEST: { title: 'Ambiente de pruebas (sifen-test · sin valor fiscal)' },
  PROD: { title: 'Producción (emisión real bloqueada en el motor)' },
}

export function EnvToggle() {
  const { environment, setEnvironment } = useAuth()
  const trackRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Partial<Record<Environment, HTMLButtonElement | null>>>({})
  const indicatorRef = useRef({ left: 0, width: 0 })
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    function syncIndicator() {
      const active = buttonRefs.current[environment]
      if (!active) return
      const next = { left: active.offsetLeft, width: active.offsetWidth }
      const prev = indicatorRef.current
      if (prev.left === next.left && prev.width === next.width) return
      indicatorRef.current = next
      setIndicator(next)
    }

    syncIndicator()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncIndicator) : null
    ro?.observe(track)
    window.addEventListener('resize', syncIndicator)

    let cancelled = false
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void document.fonts.ready.then(() => {
        if (!cancelled) syncIndicator()
      })
    }

    return () => {
      cancelled = true
      ro?.disconnect()
      window.removeEventListener('resize', syncIndicator)
    }
  }, [environment])

  function selectEnvironment(next: Environment) {
    if (next === environment) return
    setEnvironment(next)
    buttonRefs.current[next]?.focus()
  }

  function handleRadioKeyDown(e: KeyboardEvent<HTMLButtonElement>, opt: Environment) {
    const idx = OPTIONS.indexOf(opt)
    let next: Environment | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      next = OPTIONS[(idx + 1) % OPTIONS.length]!
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      next = OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length]!
    } else if (e.key === 'Home') {
      e.preventDefault()
      next = OPTIONS[0]!
    } else if (e.key === 'End') {
      e.preventDefault()
      next = OPTIONS[OPTIONS.length - 1]!
    }
    if (!next) return
    selectEnvironment(next)
  }

  const indicatorReady = indicator.width > 0

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label="Ambiente de trabajo"
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full bg-cream-soft p-1',
        'ring-1 ring-line/70',
        'focus-within:has-[:focus-visible]:ring-2 focus-within:has-[:focus-visible]:ring-brand-500/50 focus-within:has-[:focus-visible]:ring-offset-1',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 rounded-full bg-surface',
          'shadow-[0_1px_2px_rgba(15,23,42,0.07),0_2px_8px_rgba(15,23,42,0.05)]',
          'transition-[left,width,opacity] duration-200 ease-out motion-reduce:transition-none',
          indicatorReady ? 'opacity-100' : 'opacity-0',
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />
      {OPTIONS.map((opt) => {
        const active = environment === opt
        return (
          <button
            key={opt}
            ref={(el) => {
              buttonRefs.current[opt] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            title={META[opt].title}
            tabIndex={active ? 0 : -1}
            onClick={() => selectEnvironment(opt)}
            onKeyDown={(e) => handleRadioKeyDown(e, opt)}
            className={cn(
              'relative z-10 min-h-10 min-w-[3.25rem] rounded-full px-3 py-1.5 sm:min-h-9',
              'text-[10px] font-semibold uppercase tracking-[0.08em] sm:min-w-[3.5rem] sm:text-[11px]',
              'transition-colors duration-150 motion-reduce:transition-none',
              'outline-none focus:outline-none focus-visible:outline-none',
              'forced-colors:outline-2 forced-colors:outline-[Highlight]',
              active && opt === 'TEST' && 'text-brand-700',
              active && opt === 'PROD' && 'text-ok-strong',
              !active && 'text-muted/90 hover:text-ink/70',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
