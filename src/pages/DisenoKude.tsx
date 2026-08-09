// Diseño del KuDE: plantilla, color primario, logo y notas de pie. El logo se sube
// de inmediato a OCI (vía ORDS); el resto se guarda con "Guardar cambios". El panel
// derecho es un preview en React que imita visualmente cada plantilla (no llama a
// Gotenberg en cada cambio: eso solo ocurre al emitir un documento real).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
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

const PREVIEW_ITEMS = [
  { desc: 'Servicio de consultoría', cant: '1', total: '750.000' },
  { desc: 'Licencia mensual', cant: '2', total: '300.000' },
]

function KudePreview({
  template,
  color,
  logo,
  footer,
  businessName,
}: {
  template: KudeTemplateId
  color: string
  logo: string | null
  footer: string
  businessName: string
}) {
  const safeColor = isValidHex(color) ? color : '#0f172a'

  if (template === 'corporativa') {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ backgroundColor: safeColor }}
        >
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="logo" className="h-10 max-w-[100px] rounded bg-white object-contain p-1" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded bg-white/15 text-xs font-bold">
                LOGO
              </div>
            )}
            <div>
              <p className="text-sm font-bold leading-tight">{businessName || 'Tu empresa'}</p>
              <p className="text-[11px] opacity-80">RUC: 6038964-8</p>
            </div>
          </div>
          <div className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-center text-[11px]">
            <p className="uppercase tracking-wide opacity-80">Factura</p>
            <p className="text-sm font-bold">001-001-0000123</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4 text-[11px]">
          {['Timbrado', 'Receptor', 'Emisor'].map((label) => (
            <div key={label} className="rounded-md border border-line/70 p-2" style={{ borderLeft: `3px solid ${safeColor}` }}>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-1 text-ink">Ejemplo de dato</p>
            </div>
          ))}
        </div>
        <PreviewTable color={safeColor} dark />
        <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: safeColor }}>
          <div className="text-[10px] text-muted">QR</div>
          <p className="max-w-[60%] truncate text-right text-[10px] text-muted">{footer}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between border-b-2 pb-3" style={{ borderColor: safeColor }}>
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="logo" className="h-10 max-w-[100px] object-contain" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded bg-cream text-[10px] font-bold text-muted">
              LOGO
            </div>
          )}
          <div>
            <p className="text-sm font-bold" style={{ color: safeColor }}>
              {businessName || 'Tu empresa'}
            </p>
            <p className="text-[11px] text-muted">RUC: 6038964-8</p>
          </div>
        </div>
        <div className="rounded-lg border px-3 py-1.5 text-right text-[11px]" style={{ borderColor: safeColor }}>
          <p className="font-bold" style={{ color: safeColor }}>
            Factura electrónica
          </p>
          <p className="text-sm font-bold text-ink">001-001-0000123</p>
        </div>
      </div>
      <PreviewTable color={safeColor} />
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <div className="text-[10px] text-muted">QR</div>
        <p className="max-w-[60%] truncate text-right text-[10px] text-muted">{footer}</p>
      </div>
    </div>
  )
}

function PreviewTable({ color, dark }: { color: string; dark?: boolean }) {
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr style={{ backgroundColor: dark ? '#0f172a' : color }}>
          <th className="px-3 py-1.5 text-left font-semibold text-white">Descripción</th>
          <th className="px-3 py-1.5 text-right font-semibold text-white">Cant.</th>
          <th className="px-3 py-1.5 text-right font-semibold text-white">Total</th>
        </tr>
      </thead>
      <tbody>
        {PREVIEW_ITEMS.map((it, i) => (
          <tr key={it.desc} className={i % 2 === 1 ? 'bg-cream-soft' : undefined}>
            <td className="px-3 py-1.5 text-ink">{it.desc}</td>
            <td className="px-3 py-1.5 text-right text-ink">{it.cant}</td>
            <td className="px-3 py-1.5 text-right text-ink">{it.total}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={2} className="px-3 py-2 text-right font-bold" style={{ color }}>
            Total Gs.
          </td>
          <td className="px-3 py-2 text-right font-bold" style={{ color }}>
            1.050.000
          </td>
        </tr>
      </tbody>
    </table>
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

  const [template, setTemplate] = useState<KudeTemplateId>('minimalista')
  const [color, setColor] = useState('#0f172a')
  const [footer, setFooter] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!q.data) return
    setTemplate(q.data.template_id || 'minimalista')
    setColor(q.data.color_primario || '#0f172a')
    setFooter(q.data.notas_footer || '')
    setLogoUrl(q.data.logo_url || null)
  }, [q.data])

  const save = useMutation({
    mutationFn: () => upsertKudeConfig(token, { template_id: template, color_primario: color, notas_footer: footer }),
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

  return (
    <AppShell title="Diseño del KuDE">
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
                          : 'border-line bg-white hover:border-brand-200',
                      )}
                    >
                      <p className="text-sm font-semibold text-ink">{t.label}</p>
                      <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
                    </button>
                  ))}
                </div>
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
                          : 'border-muted/30 bg-white text-muted hover:border-brand-300 hover:bg-cream-soft',
                    )}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo actual" className="h-14 max-w-[180px] object-contain" />
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
                    <img src={logoUrl} alt="logo actual" className="mt-4 h-14 max-w-[180px] object-contain" />
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
                  className="mt-3 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/55 placeholder:italic shadow-sm transition-colors focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/50 disabled:opacity-60"
                />
              </section>

              {(err || msg) && (
                <div className="space-y-3">
                  {err && <Alert>{err}</Alert>}
                  {msg && <SuccessAlert>{msg}</SuccessAlert>}
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
            />
            <p className="mt-3 text-xs text-muted">
              El PDF final se genera con Gotenberg a partir de la misma configuración; puede haber
              pequeñas diferencias tipográficas respecto de esta vista previa.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  )
}
