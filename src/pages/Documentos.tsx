import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Drawer, SuccessAlert, panelClass } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  decodeEntities,
  downloadXml,
  estadoMeta,
  formatFecha,
  formatMoneda,
  getDocument,
  getKude,
  listDocuments,
  requestRetry,
  tipoDeLabel,
  type DocumentListItem,
  type DocumentDetail,
} from '@/lib/documents'

/** Tarjeta blanca flotante estilo Vercel/Stripe sobre el fondo gris del shell. */
const SECTION = panelClass

const ESTADOS = ['APROBADO', 'RECHAZADO', 'FIRMADO', 'ENVIADO', 'CANCELADO']
const TIPOS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Factura' },
  { value: '5', label: 'Nota de crédito' },
  { value: '6', label: 'Nota de débito' },
  { value: '4', label: 'Autofactura' },
  { value: '7', label: 'Nota de remisión' },
]
const PAGE_SIZE = 15

const DOCS_PAGE_TIP =
  'Facturas, notas y remisiones de este ambiente. Cada DE trae estado SIFEN, CDC, XML y KuDE.'

/* ---------- Iconos ---------- */
function IconSearch({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" className="stroke-current" strokeWidth="1.8" />
      <path d="m20 20-3.2-3.2" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconFilter({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="7" r="2.2" className="fill-current" />
      <circle cx="16" cy="12" r="2.2" className="fill-current" />
      <circle cx="10" cy="17" r="2.2" className="fill-current" />
    </svg>
  )
}
function IconChevron({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m5 13 4 4L19 7" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconCopy({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" className="stroke-current" strokeWidth="1.6" />
      <path d="M6 16V6a2 2 0 0 1 2-2h10" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" className="stroke-current" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.7" className="stroke-current" strokeWidth="1.7" />
    </svg>
  )
}
function IconDownload() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" className="stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconDots() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="5" cy="12" r="1.6" className="fill-current" />
      <circle cx="12" cy="12" r="1.6" className="fill-current" />
      <circle cx="19" cy="12" r="1.6" className="fill-current" />
    </svg>
  )
}
function IconResend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v3.5h-3.5" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Fecha compacta: 24h + mes abreviado (25 jul 2026, 21:53). */
function formatFechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d
    .toLocaleString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\./g, '')
}

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return ref
}

/* ---------- Select con búsqueda interna ---------- */
interface Option {
  value: string
  label: string
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'Todos',
  searchable = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
  allLabel?: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useOutsideClose(() => {
    setOpen(false)
    setQ('')
  })
  const all: Option[] = [{ value: '', label: allLabel }, ...options]
  const current = all.find((o) => o.value === value) ?? all[0]
  const filtered = searchable && q ? all.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : all

  return (
    <div className="relative w-full" ref={ref}>
      <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-sm transition-colors hover:border-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
          open && 'border-brand-300 ring-2 ring-brand-200',
        )}
      >
        <span className={current.value ? 'text-ink' : 'text-muted'}>{current.label}</span>
        <IconChevron className={cn('text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full min-w-[12rem] rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          {searchable && (
            <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-cream px-2.5 py-1.5 text-muted">
              <IconSearch />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                autoFocus
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
              />
            </div>
          )}
          <div className="max-h-56 overflow-auto">
            {filtered.map((o) => (
              <button
                key={o.value || 'all'}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setQ('')
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-cream',
                  value === o.value && 'bg-cream font-medium',
                )}
              >
                <span>{o.label}</span>
                {value === o.value && <IconCheck className="text-brand-600" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-muted">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const m = estadoMeta(estado)
  return (
    <Badge className={m.className}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </Badge>
  )
}

/* ---------- Acciones por fila ---------- */
function RowActions({
  doc,
  onView,
  onDownload,
  onRetry,
}: {
  doc: DocumentListItem
  onView: () => void
  onDownload: () => void
  onRetry: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(() => setOpen(false))
  const iconBtn =
    'grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-cream hover:text-ink'
  return (
    <div className="flex items-center justify-end gap-0.5" ref={ref}>
      <button
        type="button"
        title="Ver detalle"
        aria-label="Ver detalle"
        className={iconBtn}
        onClick={(e) => {
          e.stopPropagation()
          onView()
        }}
      >
        <IconEye />
      </button>
      <button
        type="button"
        title="Descargar XML"
        aria-label="Descargar XML"
        className={iconBtn}
        onClick={(e) => {
          e.stopPropagation()
          onDownload()
        }}
      >
        <IconDownload />
      </button>
      <div className="relative">
        <button
          type="button"
          title="Más opciones"
          aria-label="Más opciones"
          className={iconBtn}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
        >
          <IconDots />
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-line bg-surface p-1.5 text-left shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-cream"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onDownload()
              }}
            >
              <IconDownload />
              Descargar XML
            </button>
            {doc.estado === 'FIRMADO' && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-warn hover:bg-warn/10"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onRetry()
                }}
              >
                <IconResend />
                Reenviar a SIFEN
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Botón que consulta el KuDE (PDF) generado en background y lo abre en otra
 * pestaña. La generación es asíncrona: si aún no terminó, muestra un aviso y
 * permite reintentar sin recargar el modal. */
function VerKudeButton({ token, cdc, className }: { token: string; cdc: string; className?: string }) {
  const [pending, setPending] = useState(false)
  const mutation = useMutation({
    mutationFn: () => getKude(token, cdc),
    onSuccess: (res) => {
      if (res.estado === 'ready' && res.kude_url) {
        setPending(false)
        window.open(res.kude_url, '_blank', 'noopener')
      } else {
        setPending(true)
      }
    },
  })
  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="secondary" loading={mutation.isPending} className={className} onClick={() => mutation.mutate()}>
        Ver KuDE
      </Button>
      {pending && (
        <p className="text-xs text-muted">Generando KuDE… probá de nuevo en unos segundos.</p>
      )}
      {mutation.isError && <p className="text-xs text-danger">No se pudo consultar el KuDE.</p>}
    </div>
  )
}

export default function Documentos() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useOutsideClose(() => setFiltersOpen(false))

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setQuery(q)
  }, [searchParams])

  const listQuery = useQuery({
    queryKey: ['documents', environment, estado, tipo, page],
    queryFn: () =>
      listDocuments(token, {
        environment,
        estado: estado || undefined,
        tipo: tipo ? Number(tipo) : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Búsqueda de texto y rango de fecha: client-side sobre la página cargada.
  const filtered = useMemo(() => {
    let r = items
    const q = query.trim().toLowerCase()
    if (q) {
      r = r.filter(
        (dcto) =>
          (dcto.num_documento ?? '').toLowerCase().includes(q) ||
          (dcto.receptor_nombre ?? '').toLowerCase().includes(q) ||
          (dcto.cdc ?? '').toLowerCase().includes(q) ||
          formatFechaCorta(dcto.fecha_emision).toLowerCase().includes(q),
      )
    }
    if (desde) r = r.filter((dcto) => dcto.fecha_emision && dcto.fecha_emision.slice(0, 10) >= desde)
    if (hasta) r = r.filter((dcto) => dcto.fecha_emision && dcto.fecha_emision.slice(0, 10) <= hasta)
    return r
  }, [items, query, desde, hasta])

  const panelFiltersActive = Boolean(estado || tipo || desde || hasta)
  const activeFilterCount = [estado, tipo, desde, hasta].filter(Boolean).length
  const hasClientFilter = Boolean(query.trim() || desde || hasta)
  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeTo = Math.min(page * PAGE_SIZE, total)

  function resetTo(setter: (v: string) => void, v: string) {
    setter(v)
    setPage(1)
  }

  function clearPanelFilters() {
    setEstado('')
    setTipo('')
    setDesde('')
    setHasta('')
    setPage(1)
  }

  function handleDownload(cdc: string) {
    void downloadXml(token, cdc).catch(() => {})
  }
  function handleRetry(cdc: string) {
    void requestRetry(token, cdc)
      .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
      .catch(() => {})
  }

  const dateInput =
    'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm uppercase text-ink shadow-sm transition-colors hover:border-brand-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200'

  const activeChips: Array<{ key: string; label: string; onClear: () => void }> = []
  if (estado) {
    activeChips.push({
      key: 'estado',
      label: estadoMeta(estado).label,
      onClear: () => resetTo(setEstado, ''),
    })
  }
  if (tipo) {
    activeChips.push({
      key: 'tipo',
      label: TIPOS.find((t) => t.value === tipo)?.label ?? tipo,
      onClear: () => resetTo(setTipo, ''),
    })
  }
  if (desde) {
    activeChips.push({ key: 'desde', label: `Desde ${desde}`, onClear: () => setDesde('') })
  }
  if (hasta) {
    activeChips.push({ key: 'hasta', label: `Hasta ${hasta}`, onClear: () => setHasta('') })
  }

  return (
    <AppShell title="Documentos">
      <div className="dashboard-canvas space-y-3 sm:-m-6 sm:space-y-5 sm:p-6">
        <div className="hidden items-end justify-between gap-3 sm:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Emisión</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Documentos</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{DOCS_PAGE_TIP}</p>
          </div>
        </div>

        {/* Toolbar: búsqueda + filtros */}
        <div className={cn(SECTION, 'p-2 sm:p-2.5')}>
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-muted transition-colors focus-within:border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-ink)_12%,transparent)]">
              <IconSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar documentos…"
                aria-label="Buscar por número, receptor, CDC o fecha"
                className="min-w-0 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="shrink-0 text-xs font-medium text-muted hover:text-ink"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="relative shrink-0" ref={filtersRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-label="Filtros"
                aria-expanded={filtersOpen}
                title="Filtros"
                className={cn(
                  'relative grid h-11 w-11 place-items-center rounded-2xl border shadow-sm transition-colors',
                  filtersOpen || panelFiltersActive
                    ? 'border-ink bg-ink text-surface'
                    : 'border-line bg-surface text-ink hover:border-ink/40 hover:bg-cream',
                )}
              >
                <IconFilter />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-bold text-ink">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filtersOpen && (
                <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-line bg-surface p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">Filtros</p>
                    {panelFiltersActive && (
                      <button
                        type="button"
                        onClick={clearPanelFilters}
                        className="text-xs font-medium text-muted hover:text-ink"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <FilterSelect
                      label="Estado"
                      value={estado}
                      onChange={(v) => resetTo(setEstado, v)}
                      options={ESTADOS.map((s) => ({ value: s, label: estadoMeta(s).label }))}
                      searchable
                    />
                    <FilterSelect
                      label="Tipo"
                      value={tipo}
                      onChange={(v) => resetTo(setTipo, v)}
                      options={TIPOS}
                      searchable
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted">Desde</label>
                        <input
                          type="date"
                          value={desde}
                          max={hasta || undefined}
                          onChange={(e) => setDesde(e.target.value)}
                          className={dateInput}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted">Hasta</label>
                        <input
                          type="date"
                          value={hasta}
                          min={desde || undefined}
                          onChange={(e) => setHasta(e.target.value)}
                          className={dateInput}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onClear}
                  className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-line"
                  title="Quitar filtro"
                >
                  {chip.label}
                  <span className="text-muted">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className={cn(SECTION, 'overflow-hidden px-3 sm:px-6')}>
          <div className="flex items-center justify-between gap-3 border-b border-line/70 py-3">
            <p className="min-w-0 truncate text-sm font-semibold text-ink">
              {hasClientFilter ? `${filtered.length} resultado(s)` : `${total} documento(s)`}
            </p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                environment === 'TEST' ? 'bg-brand-100 text-brand-700' : 'bg-ok/10 text-ok-strong',
              )}
            >
              {environment}
            </span>
          </div>

          <ul className="divide-y divide-line/40 sm:hidden">
            {listQuery.isLoading && (
              <li className="py-10 text-center text-sm text-muted">Cargando…</li>
            )}
            {listQuery.isError && (
              <li className="py-4">
                <Alert>
                  {listQuery.error instanceof ApiError
                    ? listQuery.error.message
                    : 'No se pudieron cargar los documentos.'}
                </Alert>
              </li>
            )}
            {!listQuery.isLoading && !listQuery.isError && filtered.length === 0 && (
              <li className="py-10 text-center text-sm text-muted">
                {hasClientFilter ? 'Ningún documento coincide con la búsqueda.' : 'No hay documentos para este filtro.'}
              </li>
            )}
            {filtered.map((doc) => (
              <li key={doc.cdc} className="py-3">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => setSelected(doc.cdc)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted">{doc.num_documento}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-ink">
                      {doc.receptor_nombre || 'Sin nombre'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {formatFechaCorta(doc.fecha_emision)} · {tipoDeLabel(doc.tipo_de)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                      {formatMoneda(doc.total_operacion, doc.moneda)}
                    </p>
                    <EstadoBadge estado={doc.estado} />
                  </div>
                </button>
                <div className="mt-2 flex justify-end">
                  <RowActions
                    doc={doc}
                    onView={() => setSelected(doc.cdc)}
                    onDownload={() => handleDownload(doc.cdc)}
                    onRetry={() => handleRetry(doc.cdc)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-3 pr-4 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Nro</th>
                  <th className="px-4 py-3 font-semibold">Receptor</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="py-3 pl-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      Cargando…
                    </td>
                  </tr>
                )}
                {listQuery.isError && (
                  <tr>
                    <td colSpan={7} className="py-6">
                      <Alert>
                        {listQuery.error instanceof ApiError
                          ? listQuery.error.message
                          : 'No se pudieron cargar los documentos.'}
                      </Alert>
                    </td>
                  </tr>
                )}
                {!listQuery.isLoading && !listQuery.isError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      {hasClientFilter ? 'Ningún documento coincide con la búsqueda.' : 'No hay documentos para este filtro.'}
                    </td>
                  </tr>
                )}
                {filtered.map((doc) => (
                  <tr
                    key={doc.cdc}
                    className="cursor-pointer border-t border-line/50 transition-colors hover:bg-cream"
                    onClick={() => setSelected(doc.cdc)}
                  >
                    <td className="whitespace-nowrap py-4 pr-4 text-muted">{formatFechaCorta(doc.fecha_emision)}</td>
                    <td className="px-4 py-4 font-medium text-ink">{tipoDeLabel(doc.tipo_de)}</td>
                    <td className="px-4 py-4 font-mono text-xs text-muted">{doc.num_documento}</td>
                    <td className="max-w-[16rem] truncate px-4 py-4 text-ink">{doc.receptor_nombre || 'Sin nombre'}</td>
                    <td className="px-4 py-4">
                      <EstadoBadge estado={doc.estado} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums text-ink">
                      {formatMoneda(doc.total_operacion, doc.moneda)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <RowActions
                        doc={doc}
                        onView={() => setSelected(doc.cdc)}
                        onDownload={() => handleDownload(doc.cdc)}
                        onRetry={() => handleRetry(doc.cdc)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-line/70 py-3.5 sm:flex-row">
              <p className="text-xs text-muted">
                Mostrando <span className="font-medium text-ink">{rangeFrom}</span>–
                <span className="font-medium text-ink">{rangeTo}</span> de{' '}
                <span className="font-medium text-ink">{total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="min-w-[4.5rem] text-center text-sm text-muted">
                  {page} / {totalPages}
                </span>
                <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DocumentDetailModal
        cdc={selected}
        token={token}
        onClose={() => setSelected(null)}
        onRetried={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />
    </AppShell>
  )
}

function DocumentDetailModal({
  cdc,
  token,
  onClose,
  onRetried,
}: {
  cdc: string | null
  token: string
  onClose: () => void
  onRetried: () => void
}) {
  const detailQuery = useQuery({
    queryKey: ['document', cdc],
    queryFn: () => getDocument(token, cdc!),
    enabled: !!cdc,
  })

  const retryMutation = useMutation({
    mutationFn: () => requestRetry(token, cdc!),
    onSuccess: onRetried,
  })

  const doc = detailQuery.data

  const actionFooter = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {doc ? (
        <>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => downloadXml(token, doc.cdc)}>
            Descargar XML
          </Button>
          {doc.estado === 'APROBADO' && (
            <VerKudeButton token={token} cdc={doc.cdc} className="w-full sm:w-auto" />
          )}
          {doc.estado === 'FIRMADO' && (
            <Button
              loading={retryMutation.isPending}
              className="w-full sm:w-auto"
              onClick={() => retryMutation.mutate()}
            >
              Reenviar a SIFEN
            </Button>
          )}
        </>
      ) : null}
    </div>
  )

  return (
    <Drawer
      open={!!cdc}
      onClose={onClose}
      title="Detalle del documento"
      keepMounted
      footer={actionFooter}
      bodyClassName="px-4 py-3 sm:px-5"
    >
      {detailQuery.isLoading && <p className="text-muted">Cargando...</p>}
      {detailQuery.isError && (
        <Alert>
          {detailQuery.error instanceof ApiError ? detailQuery.error.message : 'No se pudo cargar el detalle.'}
        </Alert>
      )}
      {doc && (
        <div className="flex flex-col gap-3">
          <DocumentDetailHero doc={doc} />

          <DetailSection eyebrow="Identificación">
            <CdcField cdc={doc.cdc} />
          </DetailSection>

          <DetailSection eyebrow="Receptor">
            <DetailField label="Nombre" value={doc.receptor_nombre || 'Sin nombre'} />
            <DetailField label="Documento" value={doc.receptor_doc || '—'} />
          </DetailSection>

          {(doc.prot_aut || doc.cod_res || doc.mensaje_res) && (
            <DetailSection eyebrow="Respuesta SIFEN">
              {doc.prot_aut && <DetailField label="Protocolo (dProtAut)" value={doc.prot_aut} mono />}
              {doc.cod_res && <DetailField label="Código (dCodRes)" value={doc.cod_res} mono />}
              {doc.mensaje_res && (
                <div className="mt-2 border-t border-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] pt-2">
                  <p className="text-[11px] font-medium text-muted">Mensaje</p>
                  <p className="mt-1 text-sm leading-snug text-ink">{decodeEntities(doc.mensaje_res)}</p>
                </div>
              )}
            </DetailSection>
          )}

          {retryMutation.isError && (
            <Alert>
              {retryMutation.error instanceof ApiError
                ? retryMutation.error.message
                : 'No se pudo marcar para reenvío.'}
            </Alert>
          )}
          {retryMutation.isSuccess && (
            <SuccessAlert>
              Documento marcado para reenvío. El servicio lo reintentará automáticamente.
            </SuccessAlert>
          )}
        </div>
      )}
    </Drawer>
  )
}

function DocumentDetailHero({ doc }: { doc: DocumentDetail }) {
  return (
    <div className="doc-detail-panel rounded-[1.05rem] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {tipoDeLabel(doc.tipo_de)}
          </span>
          <EstadoBadge estado={doc.estado} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">Total</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight text-ink">
            {formatMoneda(doc.total_operacion, doc.moneda)}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] pt-3">
        <HeroMiniField label="Número" value={doc.num_documento} />
        <HeroMiniField label="Estab. / Punto" value={`${doc.establecimiento} · ${doc.punto_expedicion}`} />
        <HeroMiniField label="Emitido" value={formatFecha(doc.fecha_emision)} />
        <HeroMiniField label="Ambiente" value={doc.environment} />
      </dl>
    </div>
  )
}

function HeroMiniField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

function DetailSection({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{eyebrow}</h3>
      <div className="doc-detail-panel rounded-[1.05rem] px-3.5 py-2.5">{children}</div>
    </section>
  )
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-2 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-sm font-medium text-ink', mono && 'break-all font-mono text-xs')}>{value}</dd>
    </div>
  )
}

function formatCdcGroups(cdc: string) {
  return cdc.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function CdcField({ cdc }: { cdc: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(cdc)
      setCopied(true)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium text-muted">CDC</dt>
        <dd className="mt-1 break-all font-mono text-[11px] leading-snug tracking-[0.03em] text-ink">
          {formatCdcGroups(cdc)}
        </dd>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-muted transition-[transform,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-ink active:scale-[0.96]"
        aria-label={copied ? 'CDC copiado' : 'Copiar CDC'}
        title={copied ? 'Copiado' : 'Copiar CDC'}
      >
        {copied ? <IconCheck className="text-ok" /> : <IconCopy />}
      </button>
    </div>
  )
}
