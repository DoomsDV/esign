// Toggle global TEST/PROD. TEST usa acento de marca; PROD verde (producción "live").
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { Environment } from '@/lib/env'

const OPTIONS: Environment[] = ['TEST', 'PROD']

export function EnvToggle() {
  const { environment, setEnvironment } = useAuth()
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border p-0.5 text-[11px] font-semibold transition-colors sm:p-1 sm:text-xs',
        environment === 'TEST' ? 'border-brand-300 bg-brand-50' : 'border-ok/30 bg-ok/5',
      )}
    >
      {OPTIONS.map((opt) => {
        const active = environment === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setEnvironment(opt)}
            className={cn(
              'rounded-full px-2 py-1 transition-colors sm:px-3',
              active && opt === 'PROD' && 'bg-ok text-white shadow-sm',
              active && opt === 'TEST' && 'bg-brand-400 text-ink shadow-sm',
              !active && 'text-muted hover:text-ink',
            )}
            title={opt === 'PROD' ? 'Producción (emisión aún bloqueada en el motor)' : 'Ambiente de pruebas'}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
