// Diseño del KuDE: plantilla, color primario, logo y notas de pie. El logo se sube
// de inmediato a OCI (vía ORDS); el resto se guarda con "Guardar cambios". El panel
// derecho es un preview en React que imita visualmente cada plantilla (no llama a
// Gotenberg en cada cambio: eso solo ocurre al emitir un documento real).
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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

function IconEye({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" className="stroke-current" strokeWidth="1.7" />
    </svg>
  )
}

const PREVIEW_DESKTOP_WIDTH = 680

/** Modal a pantalla completa: renderiza el KuDE a ancho de escritorio y lo escala al viewport. */
function KudePreviewModal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [sheetHeight, setSheetHeight] = useState(0)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useLayoutEffect(() => {
    if (!open) return
    const stage = stageRef.current
    const sheet = sheetRef.current
    if (!stage || !sheet) return

    const update = () => {
      const available = Math.max(120, stage.clientWidth - 24)
      const next = Math.min(1, available / PREVIEW_DESKTOP_WIDTH)
      setScale(next)
      setSheetHeight(sheet.scrollHeight)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(stage)
    ro.observe(sheet)
    return () => ro.disconnect()
  }, [open, children])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-cream-soft"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del KuDE"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Documento</p>
          <h2 className="truncate text-base font-semibold tracking-tight text-ink">Vista previa</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-cream text-muted transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-line hover:text-ink active:scale-95"
          aria-label="Cerrar vista previa"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div ref={stageRef} className="min-h-0 flex-1 overflow-auto px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto" style={{ width: PREVIEW_DESKTOP_WIDTH * scale, height: sheetHeight * scale }}>
          <div
            ref={sheetRef}
            style={{
              width: PREVIEW_DESKTOP_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
  const { session, environment } = useAuth()
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
  const [previewOpen, setPreviewOpen] = useState(false)
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

  const previewNode = (
    <KudePreview
      template={template}
      color={color}
      logo={logoUrl}
      footer={footer || 'KuDE — Comprobante Único de DE'}
      businessName={session?.businessName ?? ''}
      fantasia={nombreFantasia}
      mostrarFantasia={mostrarFantasia}
    />
  )

  return (
    <AppShell title="Diseño del KuDE">
      <div className="dashboard-canvas sm:-m-6 sm:px-6 sm:pb-6 sm:pt-2 lg:pt-1">
      {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {q.error && <Alert>{(q.error as Error).message}</Alert>}

      {q.data && (
        <div className="grid gap-5 lg:grid-cols-[minmax(24rem,0.88fr)_minmax(30rem,1.12fr)] lg:items-start xl:gap-7">
          {/* Panel de configuración */}
          <Card className="min-w-0 overflow-hidden rounded-[1.65rem]">
            <div className="hidden items-start justify-between gap-5 px-7 pb-6 pt-7 lg:flex">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Configuración visual
                </p>
                <h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">
                  Identidad del KuDE
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
                  Ajustá la apariencia del comprobante que reciben tus clientes.
                </p>
              </div>
              {canEdit && (
                <Button
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                  disabled={!isValidHex(color)}
                  className="shrink-0 rounded-full px-5"
                >
                  <IconSave />
                  Guardar
                </Button>
              )}
            </div>

            <div className="relative flex min-h-0 flex-col px-4 pb-5 pt-3 sm:px-7 sm:pb-8 sm:pt-5 lg:px-0 lg:pb-0 lg:pt-0">
              {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}
              {msg && <SuccessAlert onClose={() => setMsg(null)}>{msg}</SuccessAlert>}
              <section className="lg:border-t lg:border-line/60 lg:px-7 lg:py-6">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">01 · Formato</p>
                    <h2 className="mt-1.5 text-base font-semibold tracking-tight text-ink">Plantilla</h2>
                  </div>
                  <p className="hidden text-xs text-muted xl:block">Base del PDF</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setTemplate(t.id)}
                      className={cn(
                        'group rounded-[1.05rem] px-4 py-3.5 text-left transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-60',
                        template === t.id
                          ? 'bg-brand-50 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand-500)_65%,transparent)]'
                          : 'bg-cream-soft hover:-translate-y-0.5 hover:bg-cream',
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">{t.label}</span>
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                            template === t.id ? 'scale-100 bg-brand-500' : 'scale-75 bg-line group-hover:scale-100',
                          )}
                          aria-hidden
                        />
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-7 border-t border-line/60 pt-7 lg:mt-0 lg:px-7 lg:py-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">02 · Encabezado</p>
                <h2 className="mt-1.5 text-base font-semibold tracking-tight text-ink">Nombre de fantasía</h2>
                <p className="mt-1 text-sm text-muted">
                  Controla si el nombre comercial aparece en el encabezado del KuDE (ambas plantillas).
                </p>
                <label
                  className={cn(
                    'mt-4 flex cursor-pointer items-start gap-3 rounded-[1.05rem] bg-cream-soft px-4 py-3.5 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-cream',
                    !puedeMostrarFantasia && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={mostrarFantasia}
                    onChange={(e) => setMostrarFantasia(e.target.checked)}
                    disabled={!canEdit || !puedeMostrarFantasia}
                    className="peer sr-only"
                  />
                  <span className="min-w-0 flex-1">
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
                  <span
                    className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-surface after:shadow-[0_2px_7px_-3px_color-mix(in_srgb,var(--color-ink)_45%,transparent)] after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.32,0.72,0,1)] peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300/60"
                    aria-hidden
                  />
                </label>
              </section>

              <section className="mt-7 border-t border-line/60 pt-7 lg:mt-0 lg:px-7 lg:py-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">03 · Paleta</p>
                <h2 className="mt-1.5 text-base font-semibold tracking-tight text-ink">Color primario</h2>
                <p className="mt-1 text-sm text-muted">Se usa en encabezados, totales y acentos.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={isValidHex(color) ? color : '#0f172a'}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={!canEdit}
                    className="kude-color-swatch h-11 w-14 shrink-0 cursor-pointer disabled:cursor-not-allowed"
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
                          'h-7 w-7 rounded-full transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-60',
                          color.toLowerCase() === c.toLowerCase()
                            ? 'scale-110 shadow-[0_0_0_2px_var(--color-surface),0_0_0_3px_var(--color-ink)]'
                            : 'shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] hover:-translate-y-0.5 hover:scale-105',
                        )}
                      />
                    ))}
                  </div>
                </div>
                {!isValidHex(color) && (
                  <p className="mt-2 text-xs text-danger">Usá un color hex válido, ej. #0f172a</p>
                )}
              </section>

              <section className="mt-7 border-t border-line/60 pt-7 lg:mt-0 lg:px-7 lg:py-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">04 · Marca</p>
                <h2 className="mt-1.5 text-base font-semibold tracking-tight text-ink">Logo</h2>
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
                      'mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-[1.2rem] border border-dashed px-6 py-8 text-center transition-[transform,background-color,border-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
                      dragging
                        ? '-translate-y-0.5 border-brand-400 bg-brand-50 text-ink'
                        : logoUrl
                          ? 'border-ok/40 bg-ok/5 text-ink'
                          : 'border-muted/25 bg-cream-soft text-muted hover:-translate-y-0.5 hover:border-brand-300 hover:bg-cream',
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

              <section className="mt-7 border-t border-line/60 pt-7 lg:mt-0 lg:px-7 lg:py-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">05 · Cierre</p>
                    <h2 className="mt-1.5 text-base font-semibold tracking-tight text-ink">Notas de pie</h2>
                    <p className="mt-1 text-sm text-muted">Texto opcional al final del KuDE.</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">{footer.length}/500</span>
                </div>
                <textarea
                  value={footer}
                  onChange={(e) => setFooter(e.target.value.slice(0, 500))}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Ej. Gracias por su compra. Consultas: ventas@empresa.com.py"
                  className="mt-3 w-full resize-none rounded-[1.05rem] border-0 bg-cream-soft px-4 py-3 text-sm leading-relaxed text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-ink)_8%,transparent)] transition-[background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted/55 placeholder:italic focus:bg-surface focus:outline-none focus:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand-500)_55%,transparent),0_0_0_3px_color-mix(in_srgb,var(--color-brand-400)_14%,transparent)] disabled:opacity-60"
                />
              </section>
            </div>

            {canEdit && (
              <div className="flex justify-end border-t border-line/60 bg-cream-soft px-6 py-4 sm:px-8 lg:hidden">
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

          {/* Preview en vivo (desktop). En mobile se abre por el ojito a pantalla completa. */}
          <div className="hidden lg:sticky lg:-top-6 lg:block">
            <div className="mb-3 flex items-end justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Documento</p>
                <h2 className="mt-1 text-base font-semibold tracking-tight text-ink">Vista previa</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
                Actualización en vivo
              </span>
            </div>
            {previewNode}
          </div>
        </div>
      )}

      <KudePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        {previewNode}
      </KudePreviewModal>

      {q.data &&
        !previewOpen &&
        createPortal(
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={cn(
              'fixed right-4 z-[35] grid h-12 w-12 place-items-center rounded-full bg-brand-400 text-ink md:hidden',
              'shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-ink)_22%,transparent)]',
              'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.96]',
              'bottom-[calc(5.35rem+env(safe-area-inset-bottom,0px))]',
              environment === 'PROD' && 'env-prod',
            )}
            aria-label="Ver vista previa"
          >
            <IconEye />
          </button>,
          document.body,
        )}
      </div>
    </AppShell>
  )
}
