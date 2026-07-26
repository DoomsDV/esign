import { useQuery } from '@tanstack/react-query'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { estadoMeta, formatFecha, formatMoneda, listDocuments, tipoDeLabel } from '@/lib/documents'

const COLORS = {
  APROBADO: '#16a34a',
  RECHAZADO: '#dc2626',
  FIRMADO: '#d97706',
  OTROS: '#9ca3af',
}

export default function Dashboard() {
  const { session, environment } = useAuth()
  const token = session!.accessToken

  const summary = useQuery({
    queryKey: ['dashboard', environment],
    queryFn: async () => {
      const [total, aprob, rech, firm, recent] = await Promise.all([
        listDocuments(token, { environment, pageSize: 1 }),
        listDocuments(token, { environment, estado: 'APROBADO', pageSize: 1 }),
        listDocuments(token, { environment, estado: 'RECHAZADO', pageSize: 1 }),
        listDocuments(token, { environment, estado: 'FIRMADO', pageSize: 1 }),
        listDocuments(token, { environment, pageSize: 8 }),
      ])
      return {
        total: total.total,
        aprobado: aprob.total,
        rechazado: rech.total,
        firmado: firm.total,
        recent: recent.items,
      }
    },
  })

  const d = summary.data
  const otros = d ? Math.max(0, d.total - d.aprobado - d.rechazado - d.firmado) : 0
  const donut = d
    ? [
        { name: 'Aprobados', value: d.aprobado, color: COLORS.APROBADO },
        { name: 'Rechazados', value: d.rechazado, color: COLORS.RECHAZADO },
        { name: 'Firmados', value: d.firmado, color: COLORS.FIRMADO },
        { name: 'Otros', value: otros, color: COLORS.OTROS },
      ].filter((s) => s.value > 0)
    : []

  const kpis = [
    { label: 'Aprobadas', value: d?.aprobado ?? 0, tone: 'text-ok' },
    { label: 'Rechazadas', value: d?.rechazado ?? 0, tone: 'text-danger' },
    { label: 'Firmadas (pend. envio)', value: d?.firmado ?? 0, tone: 'text-warn' },
    { label: 'Total emitido', value: d?.total ?? 0, tone: 'text-ink' },
  ]

  return (
    <AppShell title="Dashboard">
      {summary.isError && (
        <div className="mb-5">
          <Alert>
            {summary.error instanceof ApiError ? summary.error.message : 'No se pudo cargar el resumen.'}
          </Alert>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${kpi.tone}`}>
              {summary.isLoading ? '—' : kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted">Ambiente {environment}</p>
          </div>
        ))}
      </div>

      {/* Distribucion + recientes */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="font-semibold text-ink">Distribucion por estado</p>
          {donut.length === 0 ? (
            <div className="mt-4 grid h-56 place-items-center text-sm text-muted">Sin datos aun</div>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {donut.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            {donut.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}: {s.value}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-ink">Documentos recientes</p>
            <Link to="/documentos" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-line/60">
            {summary.isLoading && <p className="py-6 text-center text-sm text-muted">Cargando...</p>}
            {d?.recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Aun no hay documentos en {environment}.</p>
            )}
            {d?.recent.map((doc) => {
              const m = estadoMeta(doc.estado)
              return (
                <div key={doc.cdc} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {tipoDeLabel(doc.tipo_de)} · {doc.receptor_nombre || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-muted">
                      {doc.num_documento} · {formatFecha(doc.fecha_emision)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm tabular-nums text-muted sm:inline">
                      {formatMoneda(doc.total_operacion, doc.moneda)}
                    </span>
                    <Badge className={m.className}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                      {m.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
