import { useMemo, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, panelClass } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  estadoMeta,
  formatMoneda,
  listDocuments,
  tipoDeLabel,
  type DocumentListItem,
} from '@/lib/documents'
import { cn } from '@/lib/cn'

const COLORS = {
  APROBADO: '#5eae86',
  AREA: '#e07d24',
  BAR: '#e07d24',
}

const TIPO_TONE = ['#5b8def', '#e07d24', '#d4a054', '#5eae86', '#8a8580']

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
      <path d="M5 12h14M13 6l6 6-6 6" className="stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconExport() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 20V9M8 12l4 4 4-4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconKpiCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 7 10.5 17.5 4 11" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconKpiX() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IconKpiClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" className="stroke-current" strokeWidth="1.4" />
      <path d="M12 8.5V12l2.6 1.8" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconKpiStack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7.5h10M7 12h10M7 16.5h7" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" className="stroke-current" strokeWidth="1.4" />
    </svg>
  )
}

interface SparkPoint {
  dia: string
  v: number
}

type KpiIcon = 'check' | 'x' | 'clock' | 'stack'

interface Kpi {
  label: string
  value: number
  valueClass: string
  stroke: string
  fillId: string
  series: SparkPoint[]
  share: number
  unit: string
  hint: string
  featured?: boolean
  icon: KpiIcon
}

function KpiGlyph({ icon }: { icon: KpiIcon }) {
  if (icon === 'check') return <IconKpiCheck />
  if (icon === 'x') return <IconKpiX />
  if (icon === 'clock') return <IconKpiClock />
  return <IconKpiStack />
}

function MiniRing({ pct, color }: { pct: number; color: string }) {
  const v = Math.min(100, Math.max(0, Math.round(pct)))
  const r = 16.4
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-11 w-11 shrink-0 select-none" aria-hidden>
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--color-ink) 18%, transparent)"
          strokeWidth="2.4"
        />
        {v > 0 && (
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2.4"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v / 100)}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[9px] font-semibold tabular-nums text-ink">
        {v}%
      </span>
    </div>
  )
}

const AXIS_TICK = 'var(--chart-tick)'
const GRID_STROKE = 'var(--chart-grid)'
const tooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid var(--chart-tooltip-border)',
  background: 'var(--chart-tooltip-bg)',
  color: 'var(--color-ink)',
  boxShadow: '0 16px 40px -20px color-mix(in srgb, var(--color-ink) 35%, transparent)',
  fontSize: 12,
}

function KpiSpark({ series, stroke, fillId, name }: { series: SparkPoint[]; stroke: string; fillId: string; name: string }) {
  const yMax = Math.max(...series.map((p) => p.v), 1)
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <AreaChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.34} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[0, yMax]} />
        <Tooltip
          cursor={{ stroke, strokeWidth: 1, strokeOpacity: 0.28 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [value as number, name]}
        />
        <Area
          type="monotone"
          dataKey="v"
          name={name}
          stroke={stroke}
          fill={`url(#${fillId})`}
          strokeWidth={1.85}
          dot={false}
          activeDot={{ r: 3.5, stroke: 'var(--color-surface)', strokeWidth: 2, fill: stroke }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function KpiCell({ kpi, loading, delay }: { kpi: Kpi; loading: boolean; delay: string }) {
  return (
    <article
      className={cn(
        'dash-rise overflow-hidden rounded-[1.35rem]',
        'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'max-sm:transform-none sm:hover:-translate-y-px sm:active:scale-[0.99]',
        kpi.featured ? 'kpi-featured' : panelClass,
        delay,
      )}
      aria-label={`${kpi.label}: ${kpi.value} ${kpi.unit}. ${kpi.hint}`}
    >
      <div className="px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream text-muted select-none"
            aria-hidden
          >
            <KpiGlyph icon={kpi.icon} />
          </span>
          <MiniRing pct={kpi.share} color={kpi.stroke} />
        </div>
        <p className="mt-3 text-[12px] font-medium text-muted sm:text-[13px]">{kpi.label}</p>
        <p className="mt-1 flex items-baseline gap-1 whitespace-nowrap">
          <span className={cn('text-[1.65rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2.05rem]', kpi.valueClass)}>
            {loading ? (
              <span className="inline-block h-[0.85em] w-[1.35ch] animate-pulse rounded-md bg-cream align-middle" />
            ) : (
              kpi.value
            )}
          </span>
          <span className="text-[11px] font-medium text-muted sm:text-xs">{kpi.unit}</span>
        </p>
        <p className="mt-1.5 text-[10px] leading-snug text-muted sm:mt-2 sm:text-[11px]">{kpi.hint}</p>
      </div>
      <div className="mt-1 h-[2.9rem] max-sm:pointer-events-none sm:mt-1.5 sm:h-[4.1rem]" aria-hidden>
        <KpiSpark series={kpi.series} stroke={kpi.stroke} fillId={kpi.fillId} name={kpi.label} />
      </div>
    </article>
  )
}

const DAY_MS = 86_400_000

function labelForDay(ts: number): string {
  return new Date(ts).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })
}

interface TrendPoint {
  dia: string
  total: number
  aprobados: number
  rechazados: number
  firmados: number
  sort: number
}

function emptyPoint(ts: number): TrendPoint {
  return { dia: labelForDay(ts), total: 0, aprobados: 0, rechazados: 0, firmados: 0, sort: ts }
}

function buildTrend(items: DocumentListItem[]): TrendPoint[] {
  const map = new Map<number, TrendPoint>()
  for (const doc of items) {
    if (!doc.fecha_emision) continue
    const parsed = new Date(doc.fecha_emision)
    if (Number.isNaN(parsed.getTime())) continue
    const ts = parsed.setHours(0, 0, 0, 0)
    const cur = map.get(ts) ?? emptyPoint(ts)
    cur.total += 1
    if (doc.estado === 'APROBADO') cur.aprobados += 1
    if (doc.estado === 'RECHAZADO') cur.rechazados += 1
    if (doc.estado === 'FIRMADO') cur.firmados += 1
    map.set(ts, cur)
  }
  if (map.size === 0) return []

  const days = [...map.keys()].sort((a, b) => a - b)
  const min = days[0]
  const max = days[days.length - 1]
  const filled: TrendPoint[] = []
  for (let ts = min; ts <= max; ts += DAY_MS) {
    filled.push(map.get(ts) ?? emptyPoint(ts))
  }
  return filled.slice(-14)
}

type SparkKey = 'aprobados' | 'rechazados' | 'firmados' | 'total'

function sparkSeries(trend: TrendPoint[], key: SparkKey): SparkPoint[] {
  if (trend.length === 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = today.getTime()
    return Array.from({ length: 14 }, (_, i) => ({
      dia: labelForDay(end - (13 - i) * DAY_MS),
      v: 0,
    }))
  }
  const series = trend.map((p) => ({ dia: p.dia, v: p[key] }))
  if (series.length === 1) {
    return [{ dia: labelForDay(trend[0]!.sort - DAY_MS), v: 0 }, series[0]!]
  }
  return series
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

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

function buildWeekdays(items: DocumentListItem[]) {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const doc of items) {
    if (!doc.fecha_emision) continue
    const parsed = new Date(doc.fecha_emision)
    if (Number.isNaN(parsed.getTime())) continue
    const jsDay = parsed.getDay()
    const idx = jsDay === 0 ? 6 : jsDay - 1
    counts[idx] += 1
  }
  return WEEKDAYS.map((dia, i) => ({ dia, value: counts[i] }))
}

function sumMontos(items: DocumentListItem[]) {
  return items.reduce((acc, d) => acc + (d.total_operacion ?? 0), 0)
}

function sumMontosByEstado(items: DocumentListItem[], estado: DocumentListItem['estado']) {
  return sumMontos(items.filter((d) => d.estado === estado))
}

function sharePct(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function gsHint(n: number) {
  return `Gs ${formatCompact(n)}`
}

function periodDelta(trend: TrendPoint[]) {
  if (trend.length < 4) return null
  const mid = Math.floor(trend.length / 2)
  const prev = trend.slice(0, mid).reduce((acc, p) => acc + p.total, 0)
  const curr = trend.slice(mid).reduce((acc, p) => acc + p.total, 0)
  if (prev === 0) return curr > 0 ? { pct: 100, up: true } : { pct: 0, up: true }
  const pct = Math.round(((curr - prev) / prev) * 1000) / 10
  return { pct, up: pct >= 0 }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}K`
  return new Intl.NumberFormat('es-PY').format(n)
}

function EmptyChart({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="grid min-h-[11rem] flex-1 place-items-center rounded-2xl bg-cream-soft/80 px-4 text-center sm:min-h-[14rem]">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 max-w-[28ch] text-xs leading-relaxed text-muted">
          {hint ?? 'Los datos aparecerán cuando emitas documentos'}
        </p>
      </div>
    </div>
  )
}

function RateGauge({ pct }: { pct: number | null }) {
  const value = Math.min(100, Math.max(0, pct ?? 0))
  const r = 58
  const rot = 135

  return (
    <div className="relative mx-auto grid h-48 w-48 place-items-center sm:h-52 sm:w-52">
      <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden>
        <g transform={`rotate(${rot} 80 80)`}>
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="10"
            strokeDasharray="75 25"
            pathLength={100}
            strokeLinecap="round"
          />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="var(--color-ok)"
            strokeWidth="10"
            strokeDasharray={`${(value / 100) * 75} 100`}
            pathLength={100}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-[2.15rem] font-semibold leading-none tracking-tight tabular-nums text-ink">
            {pct == null ? '—' : `${pct}%`}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-muted">tasa de aprobación</p>
        </div>
      </div>
    </div>
  )
}

function exportSample(items: DocumentListItem[]) {
  const header = ['Número', 'Tipo', 'Receptor', 'Estado', 'Monto', 'Moneda', 'Fecha']
  const lines = [
    header.join(';'),
    ...items.map((d) =>
      [
        d.num_documento,
        tipoDeLabel(d.tipo_de),
        `"${(d.receptor_nombre ?? '').replaceAll('"', '""')}"`,
        d.estado,
        d.total_operacion ?? '',
        d.moneda,
        d.fecha_emision ?? '',
      ].join(';'),
    ),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `etick-emisiones-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function estadoLabelCompact(estado: string): string {
  if (estado === 'FIRMADO') return 'Pendiente'
  return estadoMeta(estado).label
}

function RecentDocStatus({ estado }: { estado: string }) {
  const m = estadoMeta(estado)
  return (
    <Badge className={cn(m.className, 'shrink-0 text-[10px] sm:text-[11px]')}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot)} />
      {estadoLabelCompact(estado)}
    </Badge>
  )
}

const CHART_HEIGHT = 'h-[11.5rem] sm:h-60'
const KPI_DELAY = ['dash-rise-1', 'dash-rise-2', 'dash-rise-3', 'dash-rise-4']

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
  const weekdays = useMemo(() => buildWeekdays(d?.sample ?? []), [d?.sample])
  const montoMuestra = useMemo(() => sumMontos(d?.sample ?? []), [d?.sample])
  const delta = useMemo(() => periodDelta(trend), [trend])
  const tipoMax = Math.max(...byTipo.map((t) => t.value), 1)
  const weekdayMax = Math.max(...weekdays.map((w) => w.value), 1)
  const weekdayPeak = weekdays.reduce((a, b) => (a.value >= b.value ? a : b), weekdays[0]!)
  const tasaAprob =
    d && d.aprobado + d.rechazado > 0 ? Math.round((d.aprobado / (d.aprobado + d.rechazado)) * 100) : null

  const hayRechazos = (d?.rechazado ?? 0) > 0
  const hayPendientes = (d?.firmado ?? 0) > 0
  const totalDocs = d?.total ?? 0
  const montoAprob = useMemo(() => sumMontosByEstado(d?.sample ?? [], 'APROBADO'), [d?.sample])
  const kpis: Kpi[] = [
    {
      icon: 'check',
      label: 'Aprobadas',
      value: d?.aprobado ?? 0,
      valueClass: 'text-ok-strong',
      stroke: 'var(--color-ok)',
      fillId: 'kpiFillAprob',
      series: sparkSeries(trend, 'aprobados'),
      share: tasaAprob ?? sharePct(d?.aprobado ?? 0, totalDocs),
      unit: '/DE',
      hint: `${gsHint(montoAprob)} · ${d?.aprobado ?? 0} de ${totalDocs}`,
    },
    {
      icon: 'x',
      label: 'Rechazadas',
      value: d?.rechazado ?? 0,
      valueClass: 'text-danger-strong',
      stroke: 'var(--color-danger)',
      fillId: 'kpiFillRech',
      series: sparkSeries(trend, 'rechazados'),
      share: sharePct(d?.rechazado ?? 0, totalDocs),
      unit: '/DE',
      hint: hayRechazos ? `${d?.rechazado} requieren reemisión` : 'sin rechazos',
    },
    {
      icon: 'clock',
      label: 'Firmadas',
      value: d?.firmado ?? 0,
      valueClass: 'text-warn',
      stroke: 'var(--color-warn)',
      fillId: 'kpiFillFirm',
      series: sparkSeries(trend, 'firmados'),
      share: sharePct(d?.firmado ?? 0, totalDocs),
      unit: '/DE',
      hint: hayPendientes ? `${d?.firmado} en cola SET` : 'todo enviado',
    },
    {
      icon: 'stack',
      label: 'Total emitido',
      value: d?.total ?? 0,
      valueClass: 'text-brand-600',
      stroke: 'var(--color-brand-600)',
      fillId: 'kpiFillTotal',
      series: sparkSeries(trend, 'total'),
      share: totalDocs > 0 ? 100 : 0,
      unit: '/DE',
      hint: delta
        ? `${gsHint(montoMuestra)} · ${delta.up ? '+' : ''}${delta.pct}% vs. periodo`
        : `${gsHint(montoMuestra)} · 14 días`,
      featured: true,
    },
  ]

  const recent = (d?.sample ?? []).slice(0, 7)
  const fallidos = (d?.sample ?? []).filter((x) => x.estado === 'RECHAZADO' || x.estado === 'FIRMADO').slice(0, 4)
  const rangeLabel =
    trend.length > 0 ? `${trend[0]!.dia} – ${trend[trend.length - 1]!.dia}` : 'Sin emisiones en el rango'

  return (
    <AppShell title="Dashboard">
      <div className="dashboard-canvas space-y-3 sm:-m-6 sm:space-y-5 sm:p-6">
        {summary.isError && (
          <Alert>
            {summary.error instanceof ApiError ? summary.error.message : 'No se pudo cargar el resumen.'}
          </Alert>
        )}

        <div className="dash-rise flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 select-none">
            <p className="text-[11px] font-medium tracking-wide text-muted">Resumen de emisión</p>
            <p className="mt-1 text-sm text-muted">
              {rangeLabel}
              <span className="mx-1.5 text-muted/40">·</span>
              <span className={isTest ? 'text-brand-600' : 'text-ok-strong'}>{environment}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden h-10 items-center rounded-full bg-surface px-4 text-xs font-medium text-muted shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-ink)_8%,transparent)] sm:inline-flex">
              Últimos 14 días
            </span>
            <button
              type="button"
              onClick={() => exportSample(d?.sample ?? [])}
              disabled={!d?.sample.length}
              className="group inline-flex h-10 items-center gap-2 rounded-full bg-brand-400 pr-1.5 pl-4 text-sm font-semibold text-ink transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
            >
              Exportar
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <IconExport />
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {kpis.map((kpi, i) => (
            <KpiCell key={kpi.label} kpi={kpi} loading={summary.isLoading} delay={KPI_DELAY[i] ?? 'dash-rise-1'} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
          <div className={cn(panelClass, 'flex h-full flex-col overflow-hidden dash-rise dash-rise-2 lg:col-span-8')}>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium tracking-tight text-ink sm:text-[15px]">Volumen emitido</h2>
                  <p className="mt-2 flex items-end gap-2">
                    <span className="text-[1.85rem] font-semibold leading-none tracking-tight tabular-nums text-ink sm:text-[2.1rem]">
                      {summary.isLoading ? '—' : formatCompact(montoMuestra)}
                    </span>
                    <span className="pb-0.5 text-xs text-muted">PYG en la muestra</span>
                  </p>
                  {delta && (
                    <p className={cn('mt-1.5 inline-flex items-center gap-1 text-xs font-medium', delta.up ? 'text-ok' : 'text-danger-strong')}>
                      {delta.up ? <IconTrendUp /> : <IconTrendDown />}
                      {delta.up ? '+' : ''}
                      {delta.pct}% vs. primera mitad
                    </p>
                  )}
                </div>
              </div>

              {trend.length === 0 ? (
                <EmptyChart
                  label="Todavía no hay emisiones"
                  hint="Cuando salga el primer documento, acá vas a ver el ritmo diario."
                />
              ) : trendAsBars ? (
                <div className={CHART_HEIGHT}>
                  <ResponsiveContainer width="100%" height="100%" debounce={250}>
                    <BarChart data={trend} margin={{ left: -4, right: 4, top: 4, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip cursor={{ fill: 'rgba(224, 125, 36, 0.06)' }} contentStyle={tooltipStyle} />
                      <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]} maxBarSize={36} fill={COLORS.AREA} />
                      <Bar dataKey="aprobados" name="Aprobados" radius={[6, 6, 0, 0]} maxBarSize={36} fill={COLORS.APROBADO} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={CHART_HEIGHT}>
                  <ResponsiveContainer width="100%" height="100%" debounce={250}>
                    <AreaChart data={trend} margin={{ left: -4, right: 4, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.AREA} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={COLORS.AREA} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="fillAprob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.APROBADO} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={COLORS.APROBADO} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value as number, String(name)]} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={COLORS.AREA}
                        fill="url(#fillTotal)"
                        strokeWidth={2.2}
                        dot={false}
                        activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }}
                      />
                      <Area type="monotone" dataKey="aprobados" name="Aprobados" stroke={COLORS.APROBADO} fill="url(#fillAprob)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {byTipo.length > 0 && (
                <div className="mt-4 grid gap-2.5 border-t border-line/50 pt-4 sm:grid-cols-3">
                  {byTipo.slice(0, 3).map((row, i) => (
                    <div key={row.tipo}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs text-muted">{row.tipo}</p>
                        <p className="text-sm font-semibold tabular-nums text-ink">{row.value.toLocaleString('es-PY')}</p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
                        <div
                          className="h-full origin-left rounded-full"
                          style={{
                            backgroundColor: TIPO_TONE[i] ?? TIPO_TONE[0],
                            transform: `scaleX(${row.value / tipoMax})`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={cn(panelClass, 'flex h-full flex-col overflow-hidden dash-rise dash-rise-3 lg:col-span-4')}>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <h2 className="text-sm font-medium tracking-tight text-ink sm:text-[15px]">Día más activo</h2>
              <p className="mt-0.5 text-[11px] text-muted sm:text-xs">
                {weekdayPeak.value > 0 ? `${weekdayPeak.dia} lidera la muestra` : 'Sin actividad por día'}
              </p>
              {weekdayPeak.value === 0 ? (
                <EmptyChart label="Sin actividad semanal" />
              ) : (
                <div className="mt-5 flex min-h-[12rem] flex-1 items-end gap-2 sm:min-h-[14rem]">
                  {weekdays.map((day) => {
                    const ratio = day.value / weekdayMax
                    const peak = day.dia === weekdayPeak.dia
                    return (
                      <div key={day.dia} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <p className="text-[11px] font-medium tabular-nums text-muted">{day.value}</p>
                        <div className="flex h-36 w-full items-end sm:h-40">
                          <div
                            className={cn('weekday-bar', peak && 'is-peak')}
                            style={{ transform: `scaleY(${Math.max(ratio, 0.06)})` }}
                          />
                        </div>
                        <p className={cn('text-[11px]', peak ? 'font-semibold text-ink' : 'text-muted')}>{day.dia}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
          <div className={cn(panelClass, 'flex h-full flex-col overflow-hidden dash-rise dash-rise-3 lg:col-span-8')}>
            <div className="flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <h2 className="text-sm font-medium tracking-tight text-ink sm:text-[15px]">Documentos recientes</h2>
                <p className="text-[11px] text-muted sm:text-xs">Últimas emisiones en {environment}</p>
              </div>
              <Link
                to="/documentos"
                className="group inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 sm:text-sm"
              >
                Ver todos
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                  <IconArrowRight />
                </span>
              </Link>
            </div>

            <div className="min-w-0 px-2 pb-3 sm:px-3">
              <ul className="divide-y divide-line/40 sm:hidden">
                {summary.isLoading && (
                  <li className="px-2 py-8 text-center text-sm text-muted">Cargando</li>
                )}
                {!summary.isLoading && recent.length === 0 && (
                  <li className="px-2 py-8 text-center text-sm text-muted">
                    Aún no hay documentos en {environment}.
                  </li>
                )}
                {recent.map((doc) => (
                  <li key={doc.cdc} className="flex items-start gap-3 px-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tabular-nums tracking-tight text-ink">
                        {doc.num_documento}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {doc.receptor_nombre || 'Sin nombre'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-ok-strong">
                        {formatMoneda(doc.total_operacion, doc.moneda)}
                      </p>
                      <RecentDocStatus estado={doc.estado} />
                    </div>
                  </li>
                ))}
              </ul>

              <table className="hidden w-full table-fixed text-left text-sm sm:table">
                <thead>
                  <tr className="text-[11px] font-medium tracking-wide text-muted">
                    <th className="px-2 py-2 font-medium sm:px-3">Número</th>
                    <th className="px-2 py-2 font-medium sm:px-3">Receptor</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Tipo</th>
                    <th className="px-2 py-2 text-right font-medium sm:px-3">Monto</th>
                    <th className="px-2 py-2 font-medium sm:px-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">
                        Cargando
                      </td>
                    </tr>
                  )}
                  {!summary.isLoading && recent.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">
                        Aún no hay documentos en {environment}.
                      </td>
                    </tr>
                  )}
                  {recent.map((doc) => (
                    <tr key={doc.cdc} className="border-t border-line/40">
                      <td className="truncate px-2 py-2.5 font-medium tabular-nums text-ink sm:px-3">
                        {doc.num_documento}
                      </td>
                      <td className="truncate px-2 py-2.5 text-muted sm:px-3">
                        {doc.receptor_nombre || 'Sin nombre'}
                      </td>
                      <td className="hidden truncate px-3 py-2.5 text-muted sm:table-cell">
                        {tipoDeLabel(doc.tipo_de)}
                      </td>
                      <td className="truncate px-2 py-2.5 text-right font-medium tabular-nums text-ok-strong sm:px-3">
                        {formatMoneda(doc.total_operacion, doc.moneda)}
                      </td>
                      <td className="px-2 py-2.5 sm:px-3">
                        <RecentDocStatus estado={doc.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cn(panelClass, 'flex h-full flex-col overflow-hidden dash-rise dash-rise-4 lg:col-span-4')}>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <h2 className="text-sm font-medium tracking-tight text-ink sm:text-[15px]">Tasa de aprobación</h2>
              <p className="mt-0.5 text-[11px] text-muted sm:text-xs">Aprobados sobre resueltos en SIFEN</p>
              <RateGauge pct={tasaAprob} />
              {fallidos.length > 0 && (
                <div className="mt-1 rounded-2xl bg-cream-soft p-3">
                  <p className="text-xs font-medium text-ink">Pendientes de atención</p>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted">
                    {fallidos.map((doc) => (
                      <li key={`f-${doc.cdc}`} className="flex justify-between gap-2">
                        <span className="truncate">
                          {doc.num_documento} · {tipoDeLabel(doc.tipo_de)}
                        </span>
                        <span className="shrink-0 font-medium text-ink">{estadoMeta(doc.estado).label}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/documentos" className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Revisar en Documentos
                    <IconArrowRight />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
