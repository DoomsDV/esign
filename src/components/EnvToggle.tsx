// Toggle global TEST/PROD. Fija el ambiente en el estado de la app; scope-a documentos,
// dashboard y config por ambiente. Nota: la emision real a PROD sigue bloqueada en Go.
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { Environment } from '@/lib/env'

const OPTIONS: Environment[] = ['TEST', 'PROD']

export function EnvToggle() {
  const { environment, setEnvironment } = useAuth()
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white p-1 text-xs font-semibold">
      {OPTIONS.map((opt) => {
        const active = environment === opt
        return (
          <button
            key={opt}
            onClick={() => setEnvironment(opt)}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              active && opt === 'PROD' && 'bg-danger text-white',
              active && opt === 'TEST' && 'bg-brand-400 text-ink',
              !active && 'text-muted hover:text-ink',
            )}
            title={opt === 'PROD' ? 'Produccion (emision aun bloqueada en el motor)' : 'Ambiente de pruebas'}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
