import { useMemo, type CSSProperties, type ReactNode } from 'react'
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
  APROBADO: '#7ecb9e',
  RECHAZADO: '#dc2626',
  FIRMADO: '#d97706',
  OTROS: '#9ca3af',
  AREA: '#f5a94c',
  BAR: '#f5a94c',
}

const CARD =
  'rounded-2xl bg-white ring-1 ring-line/60 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_8px_24px_-8px_rgba(16,24,40,0.12)]'

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
function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" className="stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Kpi {
  label: string
  value: number
  icon: ReactNode
  iconWrap: string
  accent: string
  delta: string
  deltaTone: 'up' | 'down' | 'warn' | 'neutral'
  context: string
}

const deltaToneClass: Record<Kpi['deltaTone'], string> = {
  up: 'text-ok',
  down: 'text-danger-strong',
  warn: 'text-warn',
  neutral: 'text-brand-700',
}

function KpiCell({ kpi, loading, compact }: { kpi: Kpi; loading: boolean; compact?: boolean }) {
  return (
    <div
      className={cn('kpi-card', compact ? 'pl-3' : 'pl-4')}
      style={{ '--kpi-accent': kpi.accent } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('font-medium tracking-tight text-muted', compact ? 'text-xs' : 'text-[13px]')}>
          {kpi.label}
        </p>
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-xl',
            compact ? 'h-7 w-7 [&_svg]:h-4 [&_svg]:w-4' : 'h-9 w-9',
            kpi.iconWrap,
          )}
        >
          {kpi.icon}
        </span>
      </div>
      <p
        className={cn(
          'mt-1.5 font-bold leading-none tracking-tight tabular-nums text-ink',
          compact ? 'text-2xl' : 'mt-2 text-[2.125rem]',
        )}
      >
        {loading ? '—' : kpi.value}
      </p>
      <p className={cn('flex flex-wrap items-center gap-x-1 gap-y-0.5', compact ? 'mt-1.5 text-[11px]' : 'mt-2.5 text-xs')}>
        <span className={cn('inline-flex items-center gap-0.5 font-semibold', deltaToneClass[kpi.deltaTone])}>
          {kpi.deltaTone === 'up' && <IconTrendUp />}
          {kpi.deltaTone === 'down' && <IconTrendDown />}
          {kpi.delta}
        </span>
        {!compact && <span className="text-muted/90">{kpi.context}</span>}
      </p>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  badge,
  children,
  className,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(CARD, 'flex flex-col p-4 sm:p-6', className)}>
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-ink sm:text-[15px]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted sm:text-xs">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      {children}
    </div>
  )
}

const AXIS_TICK = '#5c6370'
const GRID_STROKE = '#e8eaee'

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

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid min-h-[11rem] flex-1 place-items-center rounded-xl border border-dashed border-line/80 bg-cream-soft/50 px-4 text-center sm:min-h-[14rem]">
      <div>
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-1 text-xs text-muted/70">Los datos aparecerán cuando emitas documentos</p>
      </div>
    </div>
  )
}

const CHART_HEIGHT = 'h-[11.5rem] sm:h-64'

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
  const toneOk = isTest ? 'bg-brand-100 text-brand-600' : 'bg-ok/10 text-ok'
  const kpis: Kpi[] = [
    {
      label: 'Aprobadas',
      value: d?.aprobado ?? 0,
      icon: <IconCheck />,
      iconWrap: toneOk,
      accent: COLORS.APROBADO,
      delta: tasaAprob != null ? `${tasaAprob}%` : '—',
      deltaTone: tasaAprob != null ? 'up' : 'neutral',
      context: 'tasa de aprobación',
    },
    {
      label: 'Rechazadas',
      value: d?.rechazado ?? 0,
      icon: <IconX />,
      iconWrap: hayRechazos ? 'bg-danger/10 text-danger' : toneOk,
      accent: hayRechazos ? COLORS.RECHAZADO : COLORS.APROBADO,
      delta: hayRechazos ? 'Acción' : 'OK',
      deltaTone: hayRechazos ? 'down' : 'up',
      context: hayRechazos ? 'requieren reemisión' : 'sin rechazos',
    },
    {
      label: 'Firmadas',
      value: d?.firmado ?? 0,
      icon: <IconClock />,
      iconWrap: hayPendientes ? 'bg-warn/10 text-warn' : toneOk,
      accent: hayPendientes ? COLORS.FIRMADO : COLORS.APROBADO,
      delta: hayPendientes ? 'En cola' : 'OK',
      deltaTone: hayPendientes ? 'warn' : 'up',
      context: hayPendientes ? 'reintento automático' : 'todo enviado',
    },
    {
      label: 'Total emitido',
      value: d?.total ?? 0,
      icon: <IconReceipt />,
      iconWrap: 'bg-brand-100 text-brand-600',
      accent: COLORS.AREA,
      delta: formatMoneda(montoMuestra, 'PYG'),
      deltaTone: 'neutral',
      context: 'en la muestra',
    },
  ]

  const recent = (d?.sample ?? []).slice(0, 8)
  const fallidos = (d?.sample ?? []).filter((x) => x.estado === 'RECHAZADO' || x.estado === 'FIRMADO').slice(0, 5)
  const donutTotal = donut.reduce((acc, s) => acc + s.value, 0)

  const envBadge = (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        isTest ? 'bg-brand-100 text-brand-700' : 'bg-ok/10 text-ok-strong',
      )}
    >
      {environment}
    </span>
  )

  return (
    <AppShell title="Dashboard">
      <div className="dashboard-canvas -m-4 space-y-4 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        {summary.isError && (
          <Alert>
            {summary.error instanceof ApiError ? summary.error.message : 'No se pudo cargar el resumen.'}
          </Alert>
        )}

        {/* KPIs: grid 2×2 en mobile, fila única en desktop */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                CARD,
                'p-3 transition-transform duration-200 active:scale-[0.98]',
              )}
            >
              <KpiCell kpi={kpi} loading={summary.isLoading} compact />
            </div>
          ))}
        </div>
        <div className={cn(CARD, 'hidden overflow-hidden sm:block')}>
          <div className="grid gap-px bg-line/80 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white p-5">
                <KpiCell kpi={kpi} loading={summary.isLoading} />
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            title="Emisiones recientes"
            subtitle="Últimos días, muestra de hasta 100 documentos"
            badge={envBadge}
          >
            {trend.length === 0 ? (
              <EmptyChart label="Sin datos aún" />
            ) : trendAsBars ? (
              <div className={CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%" debounce={250}>
                  <BarChart data={trend} margin={{ left: -4, right: 4, top: 4, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 10, fill: AXIS_TICK }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      cursor={{ fill: 'rgba(245, 169, 76, 0.06)' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e8eaee', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.15)', fontSize: 12 }}
                    />
                    <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]} maxBarSize={36} fill={COLORS.AREA} />
                    <Bar dataKey="aprobados" name="Aprobados" radius={[6, 6, 0, 0]} maxBarSize={36} fill={COLORS.APROBADO} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%" debounce={250}>
                  <AreaChart data={trend} margin={{ left: -4, right: 4, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.AREA} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={COLORS.AREA} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillAprob" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.APROBADO} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={COLORS.APROBADO} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 10, fill: AXIS_TICK }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e8eaee', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.15)', fontSize: 12 }}
                      formatter={(value, name) => [value as number, String(name)]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke={COLORS.AREA}
                      fill="url(#fillTotal)"
                      strokeWidth={2}
                      dot={{ r: 2.5, strokeWidth: 0, fill: COLORS.AREA }}
                      activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="aprobados"
                      name="Aprobados"
                      stroke={COLORS.APROBADO}
                      fill="url(#fillAprob)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Por tipo de DE" subtitle="Distribución en la muestra">
            {byTipo.length === 0 ? (
              <EmptyChart label="Sin datos aún" />
            ) : (
              <div className={CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%" debounce={250}>
                  <BarChart data={byTipo} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="tipo"
                      width={76}
                      tick={{ fontSize: 10, fill: AXIS_TICK }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(245, 169, 76, 0.06)' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e8eaee', fontSize: 12 }}
                    />
                    <Bar dataKey="value" name="Cantidad" radius={[0, 6, 6, 0]} maxBarSize={22} fill={COLORS.BAR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Donut + recientes */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
          <ChartCard title="Distribución por estado">
            {donut.length === 0 ? (
              <EmptyChart label="Sin datos aún" />
            ) : (
              <>
                <div className="relative h-44 sm:h-52">
                  <ResponsiveContainer width="100%" height="100%" debounce={250}>
                    <PieChart>
                      <Pie
                        data={donut}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {donut.map((s) => (
                          <Cell key={s.name} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e8eaee', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-xl font-bold tabular-nums text-ink sm:text-2xl">{donutTotal}</p>
                      <p className="text-[10px] font-medium text-muted sm:text-[11px]">documentos</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-4">
                  {donut.map((s) => (
                    <span key={s.name} className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted sm:gap-2 sm:text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5" style={{ backgroundColor: s.color }} />
                      <span className="shrink-0 font-medium tabular-nums text-ink">{s.value}</span>
                      <span className="truncate">{s.name}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </ChartCard>

          <div className={cn(CARD, 'lg:col-span-2')}>
            <div className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-ink sm:text-[15px]">Documentos recientes</h2>
                <p className="text-[11px] text-muted sm:text-xs">Últimas emisiones en {environment}</p>
              </div>
              <Link
                to="/documentos"
                className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 active:scale-[0.98] sm:gap-1 sm:text-sm"
              >
                Ver todos
                <IconArrowRight />
              </Link>
            </div>

            <div className="divide-y divide-line/50 px-1 sm:px-3">
              {summary.isLoading && <p className="py-8 text-center text-sm text-muted">Cargando…</p>}
              {!summary.isLoading && recent.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">Aún no hay documentos en {environment}.</p>
              )}
              {recent.map((doc) => {
                const m = estadoMeta(doc.estado)
                return (
                  <div
                    key={doc.cdc}
                    className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink sm:text-sm">
                        {tipoDeLabel(doc.tipo_de)}
                        <span className="mx-1 text-muted/50 sm:mx-1.5">·</span>
                        <span className="font-normal text-muted">{doc.receptor_nombre || 'Sin nombre'}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted sm:text-xs">
                        {doc.num_documento}
                        <span className="mx-1 text-muted/40 sm:mx-1.5">·</span>
                        {formatFecha(doc.fecha_emision)}
                        <span className="mx-1 text-muted/40 sm:hidden">·</span>
                        <span className="font-medium text-ink/80 sm:hidden">
                          {formatMoneda(doc.total_operacion, doc.moneda)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <span className="hidden text-sm font-medium tabular-nums text-ink sm:inline">
                        {formatMoneda(doc.total_operacion, doc.moneda)}
                      </span>
                      <Badge className={cn(m.className, 'text-[11px] sm:text-xs')}>
                        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                        {m.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>

            {fallidos.length > 0 && (
              <div className="mx-3 mb-3 mt-1 rounded-xl border border-warn/25 bg-linear-to-br from-warn/5 to-brand-50/30 p-3.5 sm:mx-5 sm:mb-4 sm:mt-2 sm:p-4">
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
                <Link
                  to="/documentos"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Revisar en Documentos
                  <IconArrowRight />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
