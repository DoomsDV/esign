import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  estadoMeta,
  formatFecha,
  formatMoneda,
  listDocuments,
  tipoDeLabel,
  type DocumentListItem,
} from '@/lib/documents'
import { cn } from '@/lib/cn'

const COLORS = {
  APROBADO: '#16a34a',
  RECHAZADO: '#dc2626',
  FIRMADO: '#d97706',
  OTROS: '#9ca3af',
  AREA: '#16a34a',
  BAR: '#f5a94c',
}

// Sombra suave estilo SaaS (elevación sutil, sin borde marcado).
const CARD =
  'rounded-3xl bg-white ring-1 ring-line/70 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-16px_rgba(16,24,40,0.18)]'

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 13 4 4L19 7" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" className="stroke-current" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconReceipt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3h12v18l-3-1.8L12 21l-3-1.8L6 21V3Z" className="stroke-current" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconTrendUp() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 17 10 11l4 4 6-7M20 8h-4M20 8v4" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconTrendDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7 10 13l4-4 6 7M20 16h-4M20 16v-4" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Kpi {
  label: string
  value: number
  icon: ReactNode
  iconWrap: string
  delta: string
  deltaTone: 'up' | 'down' | 'warn' | 'neutral'
  context: string
}

const deltaToneClass: Record<Kpi['deltaTone'], string> = {
  up: 'text-ok-strong',
  down: 'text-danger-strong',
  warn: 'text-warn',
  neutral: 'text-brand-700',
}

function KpiCell({ kpi, loading }: { kpi: Kpi; loading: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-sm font-medium text-muted">{kpi.label}</p>
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', kpi.iconWrap)}>
          {kpi.icon}
        </span>
      </div>
      <p className="mt-1.5 text-[2rem] font-extrabold leading-tight tracking-tight tabular-nums text-ink">
        {loading ? '—' : kpi.value}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs">
        <span className={cn('inline-flex items-center gap-1 font-bold', deltaToneClass[kpi.deltaTone])}>
          {kpi.deltaTone === 'up' && <IconTrendUp />}
          {kpi.deltaTone === 'down' && <IconTrendDown />}
          {kpi.delta}
        </span>
        <span className="font-medium uppercase tracking-wide text-muted/80">{kpi.context}</span>
      </p>
    </>
  )
}

// Grises con mas contraste para ejes/grid (legibilidad sin robar protagonismo).
const AXIS_TICK = '#4b515b'
const GRID_STROKE = '#d7dae0'

const DAY_MS = 86_400_000

function labelForDay(ts: number): string {
  return new Date(ts).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })
}

interface TrendPoint {
  dia: string
  total: number
  aprobados: number
  rechazados: number
  sort: number
}

// Agrega por dia y RELLENA los dias intermedios sin emisiones con 0, para que la
// linea/serie tenga contexto en lugar de mostrar un punto suelto.
function buildTrend(items: DocumentListItem[]): TrendPoint[] {
  const map = new Map<number, TrendPoint>()
  for (const doc of items) {
    if (!doc.fecha_emision) continue
    const parsed = new Date(doc.fecha_emision)
    if (Number.isNaN(parsed.getTime())) continue
    const ts = parsed.setHours(0, 0, 0, 0)
    const cur = map.get(ts) ?? { dia: labelForDay(ts), total: 0, aprobados: 0, rechazados: 0, sort: ts }
    cur.total += 1
    if (doc.estado === 'APROBADO') cur.aprobados += 1
    if (doc.estado === 'RECHAZADO') cur.rechazados += 1
    map.set(ts, cur)
  }
  if (map.size === 0) return []

  const days = [...map.keys()].sort((a, b) => a - b)
  const min = days[0]
  const max = days[days.length - 1]
  const filled: TrendPoint[] = []
  for (let ts = min; ts <= max; ts += DAY_MS) {
    filled.push(
      map.get(ts) ?? { dia: labelForDay(ts), total: 0, aprobados: 0, rechazados: 0, sort: ts },
    )
  }
  return filled.slice(-14)
}

function buildByTipo(items: DocumentListItem[]) {
  const map = new Map<number, number>()
  for (const doc of items) {
    map.set(doc.tipo_de, (map.get(doc.tipo_de) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([tipo, value]) => ({ tipo: tipoDeLabel(tipo), value }))
    .sort((a, b) => b.value - a.value)
}

function sumMontos(items: DocumentListItem[]) {
  return items.reduce((acc, d) => acc + (d.total_operacion ?? 0), 0)
}

export default function Dashboard() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const isTest = environment === 'TEST'

  const summary = useQuery({
    queryKey: ['dashboard', environment],
    queryFn: async () => {
      const [total, aprob, rech, firm, cancel, sample] = await Promise.all([
        listDocuments(token, { environment, pageSize: 1 }),
        listDocuments(token, { environment, estado: 'APROBADO', pageSize: 1 }),
        listDocuments(token, { environment, estado: 'RECHAZADO', pageSize: 1 }),
        listDocuments(token, { environment, estado: 'FIRMADO', pageSize: 1 }),
        listDocuments(token, { environment, estado: 'CANCELADO', pageSize: 1 }),
        listDocuments(token, { environment, pageSize: 100 }),
      ])
      return {
        total: total.total,
        aprobado: aprob.total,
        rechazado: rech.total,
        firmado: firm.total,
        cancelado: cancel.total,
        sample: sample.items,
      }
    },
  })

  const d = summary.data
  const trend = useMemo(() => buildTrend(d?.sample ?? []), [d?.sample])
  // Con pocos dias, un area/linea pierde sentido: mostramos barras por dia.
  const trendAsBars = trend.length > 0 && trend.length <= 3
  const byTipo = useMemo(() => buildByTipo(d?.sample ?? []), [d?.sample])
  const montoMuestra = useMemo(() => sumMontos(d?.sample ?? []), [d?.sample])
  const tasaAprob =
    d && d.aprobado + d.rechazado > 0
      ? Math.round((d.aprobado / (d.aprobado + d.rechazado)) * 100)
      : null

  const otros = d ? Math.max(0, d.total - d.aprobado - d.rechazado - d.firmado - d.cancelado) : 0
  const donut = d
    ? [
        { name: 'Aprobados', value: d.aprobado, color: COLORS.APROBADO },
        { name: 'Rechazados', value: d.rechazado, color: COLORS.RECHAZADO },
        { name: 'Firmados', value: d.firmado, color: COLORS.FIRMADO },
        { name: 'Cancelados', value: d.cancelado, color: COLORS.OTROS },
        { name: 'Otros', value: otros, color: '#cbd5e1' },
      ].filter((s) => s.value > 0)
    : []

  const hayRechazos = (d?.rechazado ?? 0) > 0
  const hayPendientes = (d?.firmado ?? 0) > 0
  const kpis: Kpi[] = [
    {
      label: 'Aprobadas',
      value: d?.aprobado ?? 0,
      icon: <IconCheck />,
      iconWrap: 'bg-ok/10 text-ok',
      delta: tasaAprob != null ? `${tasaAprob}%` : '100%',
      deltaTone: 'up',
      context: 'tasa de aprobación',
    },
    {
      label: 'Rechazadas',
      value: d?.rechazado ?? 0,
      icon: <IconX />,
      iconWrap: hayRechazos ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok',
      delta: hayRechazos ? 'Acción' : 'OK',
      deltaTone: hayRechazos ? 'down' : 'up',
      context: hayRechazos ? 'requieren reemisión' : 'sin rechazos',
    },
    {
      label: 'Firmadas',
      value: d?.firmado ?? 0,
      icon: <IconClock />,
      iconWrap: hayPendientes ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok',
      delta: hayPendientes ? 'En cola' : 'OK',
      deltaTone: hayPendientes ? 'warn' : 'up',
      context: hayPendientes ? 'reintento automático' : 'todo enviado',
    },
    {
      label: 'Total emitido',
      value: d?.total ?? 0,
      icon: <IconReceipt />,
      iconWrap: 'bg-brand-100 text-brand-600',
      delta: formatMoneda(montoMuestra, 'PYG'),
      deltaTone: 'neutral',
      context: 'en la muestra',
    },
  ]

  const recent = (d?.sample ?? []).slice(0, 8)
  const fallidos = (d?.sample ?? []).filter((x) => x.estado === 'RECHAZADO' || x.estado === 'FIRMADO').slice(0, 5)

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
      {summary.isError && (
        <Alert>
          {summary.error instanceof ApiError ? summary.error.message : 'No se pudo cargar el resumen.'}
        </Alert>
      )}

      {/* KPIs: slider horizontal en mobile, panel con divisores en >=sm */}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={cn(CARD, 'w-[74%] shrink-0 snap-start p-5')}>
            <KpiCell kpi={kpi} loading={summary.isLoading} />
          </div>
        ))}
        <div className="w-1 shrink-0" aria-hidden />
      </div>
      <div className={cn(CARD, 'hidden overflow-hidden sm:block')}>
        <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white p-5">
              <KpiCell kpi={kpi} loading={summary.isLoading} />
            </div>
          ))}
        </div>
      </div>

      {/* Tendencia + tipos */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cn(CARD, 'p-6 xl:col-span-2')}>
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">Emisiones recientes</p>
              <p className="text-xs text-muted">Últimos días (muestra de hasta 100 documentos)</p>
            </div>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold',
                isTest ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger',
              )}
            >
              {environment}
            </span>
          </div>
          {trend.length === 0 ? (
            <div className="mt-4 grid h-64 place-items-center text-sm text-muted">Sin datos aún</div>
          ) : trendAsBars ? (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%" debounce={250}>
                <BarChart data={trend} margin={{ left: 0, right: 8, top: 8 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: 12, borderColor: GRID_STROKE, fontSize: 12 }}
                  />
                  <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]} maxBarSize={40} fill={isTest ? COLORS.AREA : COLORS.BAR} />
                  <Bar dataKey="aprobados" name="Aprobados" radius={[6, 6, 0, 0]} maxBarSize={40} fill={COLORS.APROBADO} fillOpacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%" debounce={250}>
                <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isTest ? COLORS.AREA : COLORS.BAR} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={isTest ? COLORS.AREA : COLORS.BAR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: GRID_STROKE, fontSize: 12 }}
                    formatter={(value, name) => [value as number, String(name)]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke={isTest ? COLORS.AREA : COLORS.BAR}
                    fill="url(#fillTotal)"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, strokeWidth: 0, fill: isTest ? COLORS.AREA : COLORS.BAR }}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aprobados"
                    name="Aprobados"
                    stroke={COLORS.APROBADO}
                    fill="transparent"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={cn(CARD, 'p-6')}>
          <p className="font-semibold text-ink">Por tipo de DE</p>
          <p className="text-xs text-muted">Distribución en la muestra</p>
          {byTipo.length === 0 ? (
            <div className="mt-4 grid h-64 place-items-center text-sm text-muted">Sin datos aún</div>
          ) : (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%" debounce={250}>
                <BarChart data={byTipo} layout="vertical" margin={{ left: 8, right: 8 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="tipo"
                    width={88}
                    tick={{ fontSize: 11, fill: AXIS_TICK }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: 12, borderColor: GRID_STROKE, fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="Cantidad" radius={[0, 6, 6, 0]} maxBarSize={26} fill={isTest ? COLORS.AREA : COLORS.BAR} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Donut + recientes + fallidos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn(CARD, 'p-6')}>
          <p className="font-semibold text-ink">Distribución por estado</p>
          {donut.length === 0 ? (
            <div className="mt-4 grid h-56 place-items-center text-sm text-muted">Sin datos aún</div>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%" debounce={250}>
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

        <div className={cn(CARD, 'p-6 lg:col-span-2')}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-ink">Documentos recientes</p>
            <Link to="/documentos" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-line/60">
            {summary.isLoading && <p className="py-6 text-center text-sm text-muted">Cargando…</p>}
            {!summary.isLoading && recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Aún no hay documentos en {environment}.</p>
            )}
            {recent.map((doc) => {
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

          {fallidos.length > 0 && (
            <div className="mt-5 rounded-xl border border-warn/30 bg-warn/5 p-4">
              <p className="text-sm font-semibold text-warn">Atención: firmados / rechazados</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted">
                {fallidos.map((doc) => (
                  <li key={`f-${doc.cdc}`} className="flex justify-between gap-2">
                    <span className="truncate">
                      {doc.num_documento} · {tipoDeLabel(doc.tipo_de)}
                    </span>
                    <span className="shrink-0 font-medium">{estadoMeta(doc.estado).label}</span>
                  </li>
                ))}
              </ul>
              <Link to="/documentos" className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
                Revisar en Documentos →
              </Link>
            </div>
          )}
        </div>
      </div>
      </div>
    </AppShell>
  )
}
