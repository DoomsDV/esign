import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/lib/auth'

interface Kpi {
  label: string
  value: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
}

const toneClasses: Record<Kpi['tone'], string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  neutral: 'text-ink',
}

// Placeholder: se reemplazara por datos reales de GET /api/v1/documents (scopeado por ambiente).
const KPIS: Kpi[] = [
  { label: 'Aprobadas', value: '—', tone: 'ok' },
  { label: 'Rechazadas', value: '—', tone: 'danger' },
  { label: 'Firmadas (pend. envio)', value: '—', tone: 'warn' },
  { label: 'Total emitido', value: '—', tone: 'neutral' },
]

export default function Dashboard() {
  const { environment } = useAuth()
  return (
    <AppShell title="Dashboard">
      <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm text-ink">
        Panel en construccion. Estas viendo el ambiente <strong>{environment}</strong>. Proximamente:
        documentos, reenvio de fallidos y configuracion.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${toneClasses[kpi.tone]}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm lg:col-span-2">
          <p className="font-semibold text-ink">Tendencia de emisiones</p>
          <div className="mt-4 grid h-56 place-items-center rounded-xl bg-cream-soft text-sm text-muted">
            Grafico (proximamente)
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="font-semibold text-ink">Distribucion por estado</p>
          <div className="mt-4 grid h-56 place-items-center rounded-xl bg-cream-soft text-sm text-muted">
            Donut (proximamente)
          </div>
        </div>
      </div>
    </AppShell>
  )
}
