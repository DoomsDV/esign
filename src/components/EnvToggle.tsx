// Toggle global TEST/PROD. TEST usa tono verde; PROD rojo de alerta.
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
        environment === 'TEST' ? 'border-ok/30 bg-ok/5' : 'border-danger/30 bg-danger/5',
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
              active && opt === 'PROD' && 'bg-danger text-white shadow-sm',
              active && opt === 'TEST' && 'bg-ok text-white shadow-sm',
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
