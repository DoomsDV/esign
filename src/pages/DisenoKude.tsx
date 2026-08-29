// Diseño del KuDE: plantilla, color primario, logo y notas de pie. El logo se sube
// de inmediato a OCI (vía ORDS); el resto se guarda con "Guardar cambios". El panel
// derecho es un preview en React que imita visualmente cada plantilla (no llama a
// Gotenberg en cada cambio: eso solo ocurre al emitir un documento real).
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Card, IconSave, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  getClient,
  getKudeConfig,
  upsertKudeConfig,
  uploadKudeLogo,
  type KudeTemplateId,
} from '@/lib/config'

const TEMPLATES: Array<{ id: KudeTemplateId; label: string; desc: string }> = [
  { id: 'minimalista', label: 'Minimalista', desc: 'Encabezado claro, acentos sutiles.' },
  { id: 'corporativa', label: 'Corporativa', desc: 'Banda de color con logo destacado.' },
]

const PRESET_COLORS = ['#0f172a', '#1d4ed8', '#047857', '#b45309', '#7c2d92', '#be123c']

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v)
}

function IconUpload() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V5m0 0 4 4m-4-4-4 4M5 19h14"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------- Preview en React (no reusa el HTML de Go) ---------- */

const PREVIEW_ITEMS_DEMO = [
  { desc: 'Servicio de consultoría', iva: '10%', cant: '1', unitPrice: '750.000', total: '750.000' },
  { desc: 'Licencia mensual', iva: '10%', cant: '2', unitPrice: '150.000', total: '300.000' },
] as const

/** Datos de ejemplo para la vista previa (no son datos reales del tenant). */
const PREVIEW_DEMO = {
  ruc: '6038964-8',
  direccion: 'Av. España 1234, Asunción',
  ciudad: 'Asunción, Paraguay',
  timbrado: '12345678',
  vigenciaTimbrado: '09/07/2026',
  fechaEmision: '25/07/2026 14:30:00',
  moneda: 'PYG',
  monedaDesc: 'Guarani',
  tipoCambio: null as string | null,
  cdc: '01060389648001001000012312026080912345678901',
  urlConsulta: 'https://ekuatia.set.gov.py/consultas/',
  leyendaLegal:
    'ESTE DOCUMENTO ES UNA REPRESENTACIÓN GRÁFICA DE UN DOCUMENTO ELECTRÓNICO (XML)',
  ivaExento: '0',
  iva5: '0',
  iva10: '95.455',
  totalIva: '95.455',
} as const

function formatCdc(cdc: string): string {
  const parts: string[] = []
  for (let i = 0; i < cdc.length; i += 4) parts.push(cdc.slice(i, i + 4))
  return parts.join(' ')
}

/**
 * Contenedor flexible para logos de cualquier proporción (escudos cuadrados, banners
 * anchos tipo Tiemsa, etc.). object-contain evita deformar; el box define el techo visual.
 */
function PreviewLogo({
  src,
  variant,
}: {
  src: string
  variant: 'minimalista' | 'corporativa'
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-start',
        variant === 'corporativa'
          ? 'mb-1.5 h-[4.5rem] w-full max-w-[13rem]'
          : 'h-16 w-full max-w-[11rem]',
      )}
    >
      <img
        src={src}
        alt="Logo del emisor"
        className="max-h-full max-w-full object-contain object-left"
      />
    </div>
  )
}

/** Placeholder visual del QR (en el PDF real Gotenberg inyecta la imagen generada). */
function QrPlaceholder() {
  return (
    <div
      className="grid shrink-0 grid-cols-5 gap-px rounded-sm bg-gray-400 p-1"
      style={{ width: 52, height: 52 }}
      aria-hidden
    >
      {Array.from({ length: 25 }, (_, i) => (
        <div
          key={i}
          className="aspect-square rounded-[1px]"
          style={{ backgroundColor: i % 3 === 0 || i % 7 === 0 ? '#374151' : '#e5e7eb' }}
        />
      ))}
    </div>
  )
}

function PreviewLegalFooter({ footer }: { footer: string }) {
  return (
    <div className="mt-4 border-t border-line/50 pt-4">
      <div className="flex items-start gap-3">
        <QrPlaceholder />
        <div className="min-w-0 flex-1 text-[10px] leading-snug text-muted">
          <p className="font-mono tracking-wide" aria-label="Código de control del documento">
            CDC: {formatCdc(PREVIEW_DEMO.cdc)}
          </p>
          <p className="mt-1 break-all">{PREVIEW_DEMO.urlConsulta}</p>
          <p className="mt-1.5">{PREVIEW_DEMO.leyendaLegal}</p>
          {footer ? <p className="mt-1.5 normal-case">{footer}</p> : null}
        </div>
      </div>
    </div>
  )
}

function KudePreview({
  template,
  color,
  logo,
  footer,
  businessName,
  fantasia,
  mostrarFantasia,
}: {
  template: KudeTemplateId
  color: string
  logo: string | null
  footer: string
  businessName: string
  fantasia: string
  mostrarFantasia: boolean
}) {
  const safeColor = isValidHex(color) ? color : '#0f172a'

  if (template === 'corporativa') {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm">
        {/* Membrete + caja de timbrado, como una factura paraguaya clásica */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {logo ? <PreviewLogo src={logo} variant="corporativa" /> : null}
            {fantasia && mostrarFantasia ? (
              <>
                <p className="text-sm font-bold text-ink">{fantasia}</p>
                <p className="mt-0.5 text-[10px] italic text-muted">{businessName || 'Tu empresa'}</p>
              </>
            ) : (
              <p className="text-sm font-bold text-ink">{businessName || 'Tu empresa'}</p>
            )}
            <p className="mt-0.5 text-[10px] text-muted">RUC: {PREVIEW_DEMO.ruc}</p>
            <p className="mt-0.5 text-[10px] text-muted">{PREVIEW_DEMO.direccion}</p>
          </div>
          <div className="shrink-0 rounded-lg border-2 px-3 py-2 text-center" style={{ borderColor: safeColor }}>
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: safeColor }}>
              Factura electrónica
            </p>
            <p className="mt-1 text-sm font-bold text-ink">001-001-0000123</p>
            <p className="mt-1.5 text-[9px] text-muted">
              Timbrado N° {PREVIEW_DEMO.timbrado}
            </p>
            <p className="text-[9px] text-muted">Vigente desde {PREVIEW_DEMO.vigenciaTimbrado}</p>
          </div>
        </div>

        {/* Franja de datos: emisión, receptor, condición y moneda */}
        <div className="mt-4 flex overflow-hidden rounded-md border border-line/70 text-[10px]">
          <div className="flex-1 p-2.5">
            <p>
              <span className="font-semibold text-ink">Fecha y hora de emisión:</span>{' '}
              <span className="text-muted">{PREVIEW_DEMO.fechaEmision}</span>
            </p>
            <p className="mt-1">
              <span className="font-semibold text-ink">Cliente:</span>{' '}
              <span className="text-muted">Ejemplo S.A.</span>
            </p>
            <p className="mt-0.5 text-muted">RUC 1234567-8</p>
          </div>
          <div className="w-[38%] shrink-0 border-l border-line/70 p-2.5">
            <p>
              <span className="font-semibold text-ink">Cond. de venta:</span>{' '}
              <span className="text-muted">Contado</span>
            </p>
            <p className="mt-1">
              <span className="font-semibold text-ink">Moneda:</span>{' '}
              <span className="text-muted">
                {PREVIEW_DEMO.moneda} ({PREVIEW_DEMO.monedaDesc})
              </span>
            </p>
            {PREVIEW_DEMO.tipoCambio ? (
              <p className="mt-0.5">
                <span className="font-semibold text-ink">Tipo de cambio:</span>{' '}
                <span className="text-muted">{PREVIEW_DEMO.tipoCambio}</span>
              </p>
            ) : null}
          </div>
        </div>

        <PreviewTable color={safeColor} variant="corporativa" />
        <ResumenPreview color={safeColor} variant="corporativa" />

        <PreviewLegalFooter footer={footer} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm">
      {/* Encabezado sin cajas: logo a la izquierda, datos legales a la derecha */}
      <div className="flex items-start justify-between">
        <div>
          {logo ? <PreviewLogo src={logo} variant="minimalista" /> : null}
        </div>
        <div className="text-right">
          {fantasia && mostrarFantasia ? (
            <>
              <p className="text-[11px] font-bold text-ink">{fantasia}</p>
              <p className="mt-0.5 text-[10px] italic text-muted">{businessName || 'Tu empresa'}</p>
            </>
          ) : (
            <p className="text-[11px] font-bold text-ink">{businessName || 'Tu empresa'}</p>
          )}
          <p className="mt-0.5 text-[10px] text-muted">RUC {PREVIEW_DEMO.ruc}</p>
          <p className="text-[10px] text-muted">{PREVIEW_DEMO.ciudad}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xl font-extrabold tracking-tight text-ink">Factura electrónica</p>
        <p className="mt-1 text-xs text-muted">N° 001-001-0000123</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-8 text-[11px]">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Facturar a</p>
          <p className="mt-1.5 font-bold text-ink">Ejemplo S.A.</p>
          <p className="text-muted">RUC 1234567-8</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between border-b border-line/50 pb-1">
            <span className="text-muted">Timbrado N°</span>
            <span className="font-semibold text-ink">{PREVIEW_DEMO.timbrado}</span>
          </div>
          <div className="flex justify-between border-b border-line/50 pb-1">
            <span className="text-muted">Vigente desde</span>
            <span className="font-semibold text-ink">{PREVIEW_DEMO.vigenciaTimbrado}</span>
          </div>
          <div className="flex justify-between border-b border-line/50 pb-1">
            <span className="text-muted">Fecha de emisión</span>
            <span className="font-semibold text-ink">{PREVIEW_DEMO.fechaEmision}</span>
          </div>
          <div className="flex justify-between border-b border-line/50 pb-1">
            <span className="text-muted">Condición</span>
            <span className="font-semibold text-ink">Contado</span>
          </div>
        </div>
      </div>

      <PreviewTable color={safeColor} variant="minimalista" />
      <ResumenPreview color={safeColor} variant="minimalista" />

      <PreviewLegalFooter footer={footer} />
    </div>
  )
}

function solidEdgeBorder(color: string, edge: 'top' | 'bottom', widthPx = 2): CSSProperties {
  if (edge === 'top') {
    return { borderTopWidth: widthPx, borderTopStyle: 'solid', borderTopColor: color }
  }
  return { borderBottomWidth: widthPx, borderBottomStyle: 'solid', borderBottomColor: color }
}

const HEADER_CELL_BORDER: CSSProperties = {
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '#cbd5e1',
}

function PreviewTable({ color, variant }: { color: string; variant: 'corporativa' | 'minimalista' }) {
  if (variant === 'corporativa') {
    return (
      <table className="mt-4 w-full border-separate border-spacing-0 text-[10px]">
        <thead>
          <tr>
            <th
              className="bg-surface px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wide text-muted"
              style={HEADER_CELL_BORDER}
            >
              Descripción
            </th>
            <th
              className="bg-surface px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted"
              style={HEADER_CELL_BORDER}
            >
              Cant.
            </th>
            <th
              className="bg-surface px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted"
              style={HEADER_CELL_BORDER}
            >
              P. unit.
            </th>
            <th
              className="bg-surface px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted"
              style={HEADER_CELL_BORDER}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {PREVIEW_ITEMS_DEMO.map((it) => (
            <tr key={it.desc}>
              <td className="border border-[#cbd5e1] px-2 py-1.5 text-ink">
                {it.desc}{' '}
                <span className="text-muted">({it.iva})</span>
              </td>
              <td className="border border-[#cbd5e1] px-2 py-1.5 text-right text-ink">{it.cant}</td>
              <td className="border border-[#cbd5e1] px-2 py-1.5 text-right text-ink">{it.unitPrice}</td>
              <td className="border border-[#cbd5e1] px-2 py-1.5 text-right text-ink">{it.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <table className="mt-4 w-full text-[10px]">
      <thead>
        <tr style={solidEdgeBorder(color, 'bottom')}>
          <th className="pb-1.5 text-left text-[9px] font-bold uppercase tracking-wide text-muted">
            Descripción
          </th>
          <th className="pb-1.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted">
            Cant.
          </th>
          <th className="pb-1.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted">
            Precio unit.
          </th>
          <th className="pb-1.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {PREVIEW_ITEMS_DEMO.map((it) => (
          <tr key={it.desc} className="border-b border-line/40">
            <td className="py-2 text-ink">
              {it.desc}{' '}
              <span className="text-muted">(IVA {it.iva})</span>
            </td>
            <td className="py-2 text-right text-ink">{it.cant}</td>
            <td className="py-2 text-right text-ink">{it.unitPrice}</td>
            <td className="py-2 text-right text-ink">{it.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ResumenPreview({ color, variant }: { color: string; variant: 'corporativa' | 'minimalista' }) {
  if (variant === 'corporativa') {
    return (
      <div className="mt-3 flex flex-col items-end">
        <div className="overflow-hidden rounded-md border border-line/70 text-[10px]">
          <div className="flex justify-between gap-6 px-3 py-1.5">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold text-ink">1.050.000</span>
          </div>
          <div
            className="flex justify-between gap-6 px-3 py-2 text-sm font-extrabold"
            style={solidEdgeBorder(color, 'top')}
          >
            <span className="text-ink">Total a pagar {PREVIEW_DEMO.moneda}</span>
            <span style={{ color }}>1.050.000</span>
          </div>
        </div>
        <p className="mt-1.5 whitespace-nowrap text-right text-[9px] text-muted">
          Liquidación del IVA: (5%) {PREVIEW_DEMO.iva5} | (10%) {PREVIEW_DEMO.iva10} | Total IVA:{' '}
          {PREVIEW_DEMO.totalIva}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-col items-end">
      <div className="min-w-[170px] text-[10px]">
        <div className="flex justify-between py-1 text-muted">
          <span>Subtotal</span>
          <span>1.050.000</span>
        </div>
        <div className="flex justify-between pt-2 text-sm font-extrabold" style={solidEdgeBorder(color, 'top')}>
          <span className="text-ink">Total {PREVIEW_DEMO.moneda}</span>
          <span style={{ color }}>1.050.000</span>
        </div>
      </div>
      <p className="mt-1.5 whitespace-nowrap text-right text-[9px] text-muted">
        Liquidación de IVA: Exento: {PREVIEW_DEMO.ivaExento} | 5%: {PREVIEW_DEMO.iva5} | 10%:{' '}
        {PREVIEW_DEMO.iva10} | Total IVA: {PREVIEW_DEMO.totalIva}
      </p>
    </div>
  )
}

/* ---------- Página ---------- */

export default function DisenoKude() {
  const { session } = useAuth()
  const token = session!.accessToken
  const canEdit = session!.role === 'owner'
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const q = useQuery({ queryKey: ['kude-config'], queryFn: () => getKudeConfig(token) })
  const clientQ = useQuery({ queryKey: ['client'], queryFn: () => getClient(token) })

  const [template, setTemplate] = useState<KudeTemplateId>('minimalista')
  const [color, setColor] = useState('#0f172a')
  const [footer, setFooter] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [mostrarFantasia, setMostrarFantasia] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!q.data) return
    setTemplate(q.data.template_id || 'minimalista')
    setColor(q.data.color_primario || '#0f172a')
    setFooter(q.data.notas_footer || '')
    setLogoUrl(q.data.logo_url || null)
    setMostrarFantasia((q.data.mostrar_fantasia ?? 1) !== 0)
  }, [q.data])

  const save = useMutation({
    mutationFn: () =>
      upsertKudeConfig(token, {
        template_id: template,
        color_primario: color,
        notas_footer: footer,
        mostrar_fantasia: mostrarFantasia ? 1 : 0,
      }),
    onSuccess: async () => {
      setErr(null)
      setMsg('Diseño guardado')
      await qc.invalidateQueries({ queryKey: ['kude-config'] })
    },
    onError: (e: Error) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const uploadLogo = useMutation({
    mutationFn: (file: File) => uploadKudeLogo(token, file),
    onSuccess: async (res) => {
      setErr(null)
      setMsg('Logo actualizado')
      setLogoUrl(res.logo_url)
      await qc.invalidateQueries({ queryKey: ['kude-config'] })
    },
    onError: (e: Error) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const pickLogo = useCallback(
    (file: File | null) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setErr('Solo se aceptan imágenes (PNG, JPG, SVG, WEBP)')
        return
      }
      setErr(null)
      uploadLogo.mutate(file)
    },
    [uploadLogo],
  )

  const nombreFantasia = clientQ.data?.emisor?.nombre_fantasia?.trim() ?? ''
  const puedeMostrarFantasia = nombreFantasia.length > 0

  return (
    <AppShell title="Diseño del KuDE">
      <div className="dashboard-canvas sm:-m-6 sm:p-6">
      {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {q.error && <Alert>{(q.error as Error).message}</Alert>}

      {q.data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* Panel de configuración */}
          <Card className="min-w-0 overflow-hidden">
            <div className="flex flex-col gap-8 px-6 py-6 sm:px-8 sm:py-8">
              <section>
                <h2 className="text-base font-bold text-ink">Plantilla</h2>
                <p className="mt-1 text-sm text-muted">Elegí el diseño base del KuDE (PDF).</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setTemplate(t.id)}
                      className={cn(
                        'rounded-xl border-2 px-4 py-3 text-left transition-colors disabled:opacity-60',
                        template === t.id
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-line bg-surface hover:border-brand-200',
                      )}
                    >
                      <p className="text-sm font-semibold text-ink">{t.label}</p>
                      <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-base font-bold text-ink">Nombre de fantasía</h2>
                <p className="mt-1 text-sm text-muted">
                  Controla si el nombre comercial aparece en el encabezado del KuDE (ambas plantillas).
                </p>
                <label
                  className={cn(
                    'mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3',
                    !puedeMostrarFantasia && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={mostrarFantasia}
                    onChange={(e) => setMostrarFantasia(e.target.checked)}
                    disabled={!canEdit || !puedeMostrarFantasia}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-400 focus:ring-brand-300 disabled:cursor-not-allowed"
                  />
                  <span>
                    <span className="text-sm font-semibold text-ink">Mostrar nombre de fantasía</span>
                    {puedeMostrarFantasia ? (
                      <span className="mt-0.5 block text-xs text-muted">
                        Si está activo, «{nombreFantasia}» se muestra arriba de la razón social.
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-muted">
                        Cargá un nombre de fantasía en{' '}
                        <Link to="/empresa" className="font-medium text-brand-600 hover:underline">
                          Empresa
                        </Link>{' '}
                        para habilitar esta opción.
                      </span>
                    )}
                  </span>
                </label>
              </section>

              <hr className="border-t border-line/70" />

              <section>
                <h2 className="text-base font-bold text-ink">Color primario</h2>
                <p className="mt-1 text-sm text-muted">Se usa en encabezados, totales y acentos.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={isValidHex(color) ? color : '#0f172a'}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={!canEdit}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-line disabled:cursor-not-allowed"
                  />
                  <TextField
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#0f172a"
                    className="w-32 font-mono"
                  />
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setColor(c)}
                        title={c}
                        style={{ backgroundColor: c }}
                        className={cn(
                          'h-7 w-7 rounded-full border-2 transition-transform disabled:opacity-60',
                          color.toLowerCase() === c.toLowerCase()
                            ? 'border-ink scale-110'
                            : 'border-white/60 hover:scale-105',
                        )}
                      />
                    ))}
                  </div>
                </div>
                {!isValidHex(color) && (
                  <p className="mt-2 text-xs text-danger">Usá un color hex válido, ej. #0f172a</p>
                )}
              </section>

              <hr className="border-t border-line/70" />

              <section>
                <h2 className="text-base font-bold text-ink">Logo</h2>
                <p className="mt-1 text-sm text-muted">
                  Se sube de inmediato al confirmarlo (no requiere guardar cambios).
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
                />

                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setDragging(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      pickLogo(e.dataTransfer.files?.[0] ?? null)
                    }}
                    className={cn(
                      'mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                      dragging
                        ? 'border-brand-400 bg-brand-50 text-ink'
                        : logoUrl
                          ? 'border-ok/40 bg-ok/5 text-ink'
                          : 'border-muted/30 bg-surface text-muted hover:border-brand-300 hover:bg-cream-soft',
                    )}
                  >
                    {logoUrl ? (
                      <div className="flex h-20 w-full max-w-[240px] items-center justify-center">
                        <img
                          src={logoUrl}
                          alt="Logo actual"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <span className="text-brand-600">
                        <IconUpload />
                      </span>
                    )}
                    <p className="text-sm font-semibold text-ink">
                      {uploadLogo.isPending
                        ? 'Subiendo…'
                        : logoUrl
                          ? 'Clic o arrastrá para cambiar el logo'
                          : 'Arrastrá el logo acá o hacé clic'}
                    </p>
                    <p className="text-xs text-muted">PNG, JPG, SVG o WEBP</p>
                  </button>
                ) : (
                  logoUrl && (
                    <div className="mt-4 flex h-20 max-w-[240px] items-center">
                      <img
                        src={logoUrl}
                        alt="Logo actual"
                        className="max-h-full max-w-full object-contain object-left"
                      />
                    </div>
                  )
                )}
              </section>

              <hr className="border-t border-line/70" />

              <section>
                <h2 className="text-base font-bold text-ink">Notas de pie</h2>
                <p className="mt-1 text-sm text-muted">Texto opcional al final del KuDE (máx. 500 caracteres).</p>
                <textarea
                  value={footer}
                  onChange={(e) => setFooter(e.target.value.slice(0, 500))}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Ej. Gracias por su compra. Consultas: ventas@empresa.com.py"
                  className="mt-3 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/55 placeholder:italic shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/50 disabled:opacity-60"
                />
              </section>

              {(err || msg) && (
                <div className="space-y-3">
                  {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}
                  {msg && <SuccessAlert onClose={() => setMsg(null)}>{msg}</SuccessAlert>}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="flex justify-end border-t border-line bg-cream-soft px-6 py-4 sm:px-8">
                <Button
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                  disabled={!isValidHex(color)}
                >
                  <IconSave />
                  Guardar cambios
                </Button>
              </div>
            )}
          </Card>

          {/* Preview en vivo */}
          <div className="lg:sticky lg:top-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Vista previa (aproximada)
            </p>
            <KudePreview
              template={template}
              color={color}
              logo={logoUrl}
              footer={footer || 'KuDE — Comprobante Único de DE'}
              businessName={session?.businessName ?? ''}
              fantasia={nombreFantasia}
              mostrarFantasia={mostrarFantasia}
            />
          </div>
        </div>
      )}
      </div>
    </AppShell>
  )
}
