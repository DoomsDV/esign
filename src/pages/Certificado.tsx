import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { fileToBase64, getCertificateMeta, uploadCertificate } from '@/lib/secrets'

function formatVigencia(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const base = d
    .toLocaleString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\./g, '')
  return `${base} h`
}

function formatCertStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Activo'
    case 'NONE':
      return 'Sin certificado'
    case 'EXPIRED':
      return 'Expirado'
    case 'INACTIVE':
      return 'Inactivo'
    default:
      return status
  }
}

function statusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'bg-ok/10 text-ok-strong'
    case 'NONE':
      return 'bg-warn/10 text-warn'
    case 'EXPIRED':
    case 'INACTIVE':
      return 'bg-danger/10 text-danger'
    default:
      return 'bg-neutral/10 text-neutral'
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return null
  const diffMs = end.getTime() - Date.now()
  if (diffMs <= 0) return null
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function isPastExpiry(iso: string | null): boolean {
  if (!iso) return false
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() <= Date.now()
}

function truncateFileName(name: string, max = 32): string {
  if (name.length <= max) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot) : ''
  const base = dot > 0 ? name.slice(0, dot) : name
  const budget = max - ext.length - 1
  if (budget < 4) return `${name.slice(0, max - 1)}…`
  return `${base.slice(0, budget)}…${ext}`
}

function IconUpload({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        className="stroke-current"
        strokeWidth="1.7"
      />
      <path d="M14 3v5h5" className="stroke-current" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function StatusChip({ status }: { status: string }) {
  const tone = status.toUpperCase()
  const dot =
    tone === 'ACTIVE' ? 'bg-ok' : tone === 'EXPIRED' || tone === 'INACTIVE' ? 'bg-danger' : 'bg-warn'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        statusClass(status),
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {formatCertStatus(status)}
    </span>
  )
}

function acceptP12(file: File | null | undefined): file is File {
  if (!file) return false
  const name = file.name.toLowerCase()
  return name.endsWith('.p12') || name.endsWith('.pfx')
}

const CERT_PAGE_TIP =
  'Credencial PKCS#12 para firmar documentos electrónicos. El archivo y la contraseña se cifran en el servidor; desde el panel solo ves el estado y la vigencia — nunca el Subject DN ni el contenido del .p12.'

export default function Certificado() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canUpload = session!.role === 'owner'
  const inputRef = useRef<HTMLInputElement>(null)

  const q = useQuery({
    queryKey: ['certificate'],
    queryFn: () => getCertificateMeta(token),
  })

  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const pickFile = useCallback((next: File | null) => {
    setErr(null)
    setMsg(null)
    if (!next) {
      setFile(null)
      return
    }
    if (!acceptP12(next)) {
      setErr('Solo se aceptan archivos .p12 o .pfx')
      setFile(null)
      return
    }
    setFile(next)
  }, [])

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new ApiError('VALIDATION', 'Seleccioná un archivo .p12', 422)
      if (file.size < 512) {
        throw new ApiError('VALIDATION', 'El archivo parece demasiado pequeño para ser un .p12 válido', 422)
      }
      if (!password) throw new ApiError('VALIDATION', 'Ingresá la contraseña del certificado', 422)
      const p12_base64 = await fileToBase64(file)
      await uploadCertificate(token, { p12_base64, password })
    },
    onSuccess: async () => {
      setErr(null)
      setMsg('Certificado subido y almacenado de forma segura.')
      setPassword('')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      await qc.invalidateQueries({ queryKey: ['certificate'] })
    },
    onError: (e: Error) => {
      setMsg(null)
      let message = e instanceof ApiError ? e.message : e.message
      if (e instanceof ApiError && e.code === 'INVALID_P12') {
        message += ' Verificá la contraseña del certificado. Si el error persiste, contactá soporte.'
      }
      setErr(message)
    },
  })

  const meta = q.data
  const status = meta?.status.toUpperCase() ?? 'NONE'
  const hasCert = meta != null && status !== 'NONE'
  const expiredByDate = hasCert && isPastExpiry(meta.not_after)
  const isExpired = hasCert && (status === 'EXPIRED' || expiredByDate)
  const isActive = hasCert && !isExpired && status === 'ACTIVE'
  const daysLeft = isActive ? daysUntil(meta.not_after) : null
  const displayStatus = isExpired ? 'EXPIRED' : status
  const expiringSoon = isActive && daysLeft !== null && daysLeft <= 30
  const fileLabel = file ? truncateFileName(file.name) : null
  const uploading = upload.isPending
  const canSubmit = canUpload && !!file && !!password && !uploading

  const statusTip = isExpired
    ? 'Subí un .p12 nuevo para volver a firmar documentos.'
    : isActive
      ? 'Tu certificado está almacenado cifrado y listo para firmar DE.'
      : hasCert
        ? 'Tu certificado está almacenado cifrado. Revisá su vigencia antes de emitir.'
        : 'Subí un .p12 para habilitar la firma de documentos.'

  const uploadTitle = hasCert ? 'Actualizar certificado' : 'Subir certificado'
  const uploadTip = isExpired
    ? 'El certificado actual venció. Subí un .p12 nuevo para renovarlo.'
    : hasCert
      ? 'Reemplazá el .p12 vigente. El anterior queda invalidado al subir uno nuevo.'
      : 'Seleccioná tu archivo .p12 y la contraseña. Se transferirá cifrado al servidor.'
  const fabLabel = hasCert ? 'Reemplazar' : 'Subir'

  return (
    <AppShell title="Certificado">
      <div className="dashboard-canvas space-y-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <div className="hidden items-end justify-between gap-3 sm:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Seguridad</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Certificado digital</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{CERT_PAGE_TIP}</p>
          </div>
        </div>

        {q.error && <Alert>{(q.error as Error).message}</Alert>}
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}

        {!q.isLoading && (
          <div className="grid w-full gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
            <section className="order-1 lg:order-2">
              <article className="estab-card overflow-hidden rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Certificado</p>
                  <StatusChip status={displayStatus} />
                </div>
                <p className="mt-3 font-semibold tabular-nums tracking-tight text-ink text-[1.35rem] leading-[1.15] sm:text-lg">
                  {hasCert ? formatVigencia(meta?.not_after ?? null) : '—'}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted sm:text-sm">
                  {hasCert ? (
                    <span className="hidden sm:inline">{statusTip} Cifrado AES-256-GCM en servidor.</span>
                  ) : (
                    <span className="hidden sm:inline">{statusTip}</span>
                  )}
                  <span className="sm:hidden">
                    {hasCert ? 'Cifrado en servidor' : 'Subí un .p12 para firmar documentos.'}
                  </span>
                </p>

                {isExpired && (
                  <p className="mt-3 rounded-[1.05rem] bg-danger/10 px-3.5 py-2.5 text-sm leading-relaxed text-danger">
                    <span className="sm:hidden">Certificado vencido — renovalo abajo.</span>
                    <span className="hidden sm:inline">
                      El certificado ya venció. Renoválo subiendo un .p12 nuevo.
                    </span>
                  </p>
                )}

                {expiringSoon && (
                  <p className="mt-3 rounded-[1.05rem] bg-warn/10 px-3.5 py-2.5 text-sm leading-relaxed text-warn">
                    {daysLeft === 0
                      ? 'El certificado vence hoy. Renoválo antes de emitir en producción.'
                      : `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}. Planificá la renovación.`}
                  </p>
                )}
              </article>
            </section>

            <section className="order-2 lg:order-1">
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                {hasCert ? 'Actualizar' : 'Subir'}
              </h3>
              <div className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                <p className="mb-3 hidden text-sm leading-relaxed text-muted sm:block">
                  {uploadTitle}. {uploadTip}
                </p>

                {!canUpload ? (
                  <Alert>Solo el propietario de la cuenta puede subir o reemplazar el certificado.</Alert>
                ) : (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".p12,.pfx"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    />

                    {(err || msg) && (
                      <div className="space-y-3">
                        {err && <Alert>{err}</Alert>}
                        {msg && <SuccessAlert>{msg}</SuccessAlert>}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 md:hidden">
                      <label className="text-sm font-medium text-ink">Archivo .p12</label>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                        className="flex w-full items-center justify-between gap-3 rounded-[1.05rem] bg-cream-soft px-3.5 py-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className={cn('min-w-0 truncate', file ? 'font-medium text-ink' : 'text-muted')}>
                          {fileLabel ?? 'Elegir archivo…'}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-brand-700">Examinar</span>
                      </button>
                    </div>

                    <div className="hidden flex-col md:flex">
                      <label className="mb-1.5 block text-sm font-medium text-ink">Archivo .p12</label>
                      <button
                        type="button"
                        disabled={uploading}
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
                          pickFile(e.dataTransfer.files?.[0] ?? null)
                        }}
                        className={cn(
                          'flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center',
                          'transition-[transform,opacity,border-color,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                          dragging
                            ? 'border-brand-400 bg-brand-50 text-ink'
                            : file
                              ? 'border-ok/40 bg-ok/5 text-ink'
                              : 'border-muted/30 bg-cream-soft text-muted hover:border-brand-300',
                        )}
                      >
                        <span className={cn(file ? 'text-ok' : 'text-brand-600')}>
                          {file ? <IconFile /> : <IconUpload size={22} />}
                        </span>
                        {file ? (
                          <>
                            <p className="max-w-full truncate px-2 text-sm font-semibold text-ink">{fileLabel}</p>
                            <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB · clic para cambiar</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-ink">Arrastrá el .p12 acá o hacé clic</p>
                            <p className="text-xs text-muted">PKCS#12 · .p12 / .pfx</p>
                          </>
                        )}
                      </button>
                    </div>

                    <TextField
                      label="Contraseña del certificado"
                      id="cert-password"
                      name="cert-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={uploading}
                    />

                    <div className="hidden justify-end pt-1 sm:flex">
                      <Button loading={uploading} onClick={() => upload.mutate()} disabled={!canSubmit}>
                        {hasCert ? 'Reemplazar certificado' : 'Subir certificado'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {canUpload &&
        !q.isLoading &&
        createPortal(
          <button
            type="button"
            onClick={() => upload.mutate()}
            disabled={!canSubmit}
            className={cn(
              'fixed right-4 z-[35] inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 pr-5 pl-1.5 text-sm font-semibold text-ink md:hidden',
              'shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-ink)_22%,transparent)]',
              'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.96] disabled:opacity-50',
              'bottom-[calc(5.35rem+env(safe-area-inset-bottom,0px))]',
              environment === 'PROD' && 'env-prod',
            )}
            aria-label={hasCert ? 'Reemplazar certificado' : 'Subir certificado'}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <IconUpload />
              )}
            </span>
            {fabLabel}
          </button>,
          document.body,
        )}
    </AppShell>
  )
}
