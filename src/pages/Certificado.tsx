import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, InfoTip, PageHeader, SectionHint, SuccessAlert, TextField, panelClass } from '@/components/ui'
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

function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 20 7v5c0 4.4-3.2 8.5-8 9-4.8-.5-8-4.6-8-9V7l8-4Z"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
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

function ReadOnlyTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-cream-soft/80 px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold leading-snug text-ink">{children}</div>
    </div>
  )
}

function acceptP12(file: File | null | undefined): file is File {
  if (!file) return false
  const name = file.name.toLowerCase()
  return name.endsWith('.p12') || name.endsWith('.pfx')
}

const CERT_PAGE_TIP =
  'Credencial PKCS#12 para firmar documentos electrónicos. El archivo y la contraseña se cifran en el servidor; desde el panel solo ves el estado y la vigencia — nunca el Subject DN ni el contenido del .p12.'

const STORAGE_TIP =
  'Cifrado AES-256-GCM en servidor · identidad del titular no expuesta en el panel'

export default function Certificado() {
  const { session } = useAuth()
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
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const meta = q.data
  const status = meta?.status.toUpperCase() ?? 'NONE'
  const hasCert = meta != null && status !== 'NONE'
  const expiredByDate = hasCert && isPastExpiry(meta.not_after)
  const isExpired = hasCert && (status === 'EXPIRED' || expiredByDate)
  const isActive = hasCert && !isExpired && status === 'ACTIVE'
  const isInactive = hasCert && !isExpired && status === 'INACTIVE'
  const daysLeft = isActive ? daysUntil(meta.not_after) : null
  const displayStatus = isExpired ? 'EXPIRED' : status
  const expiringSoon = isActive && daysLeft !== null && daysLeft <= 30
  const fileLabel = file ? truncateFileName(file.name) : null
  const uploading = upload.isPending

  const statusTitle = isExpired
    ? 'Certificado expirado'
    : isInactive
      ? 'Certificado inactivo'
      : hasCert
        ? 'Certificado registrado'
        : 'Sin certificado'

  const statusTip = isExpired
    ? 'Subí un .p12 nuevo para volver a firmar documentos.'
    : isActive
      ? 'Tu certificado está almacenado cifrado y listo para firmar DE.'
      : isInactive
        ? 'El certificado está almacenado pero marcado como inactivo.'
        : hasCert
          ? 'Tu certificado está almacenado cifrado. Revisá su vigencia antes de emitir.'
          : 'Subí un .p12 para habilitar la firma de documentos.'

  const uploadTitle = hasCert ? 'Actualizar certificado' : 'Subir certificado'

  const uploadTip = isExpired
    ? 'El certificado actual venció. Subí un .p12 nuevo para renovarlo.'
    : hasCert
      ? 'Reemplazá el .p12 vigente. El anterior queda invalidado al subir uno nuevo.'
      : 'Seleccioná tu archivo .p12 y la contraseña. Se transferirá cifrado al servidor.'

  return (
    <AppShell title="Certificado">
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <PageHeader compactOnMobile title="Certificado digital" description={CERT_PAGE_TIP} />

        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        <div className="grid w-full gap-5 lg:grid-cols-2 lg:items-stretch">
          {/* Subida: izquierda en desktop, debajo del estado en mobile */}
          <div className={cn(panelClass, 'order-2 flex h-full min-h-0 flex-col overflow-hidden lg:order-1')}>
            <div className="border-b border-line/60 px-5 py-4 sm:px-6">
              <SectionHint title={uploadTitle} tip={uploadTip} />
            </div>

            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              {!canUpload ? (
                <Alert>
                  Solo el propietario de la cuenta puede subir o reemplazar el certificado.
                </Alert>
              ) : (
                <div className="flex flex-1 flex-col gap-4">
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
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className={cn('truncate', file ? 'font-medium text-ink' : 'text-muted')}>
                        {fileLabel ?? 'Elegir archivo…'}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-brand-700">Examinar</span>
                    </button>
                  </div>

                  <div className="hidden flex-1 md:flex md:flex-col">
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
                        'flex min-h-[11rem] flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        dragging
                          ? 'border-brand-400 bg-brand-50 text-ink'
                          : file
                            ? 'border-ok/40 bg-ok/5 text-ink'
                            : 'border-muted/30 bg-white text-muted hover:border-brand-300 hover:bg-cream-soft',
                      )}
                    >
                      <span className={cn(file ? 'text-ok' : 'text-brand-600')}>
                        {file ? <IconFile /> : <IconUpload />}
                      </span>
                      {file ? (
                        <>
                          <p className="max-w-full truncate px-2 text-sm font-semibold text-ink">
                            {fileLabel}
                          </p>
                          <p className="text-xs text-muted">
                            {(file.size / 1024).toFixed(1)} KB · clic para cambiar
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-ink">
                            Arrastrá el .p12 acá o hacé clic
                          </p>
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

                  <div className="mt-auto flex justify-end pt-1">
                    <Button
                      className="max-sm:w-full"
                      loading={uploading}
                      onClick={() => upload.mutate()}
                      disabled={!file || !password || uploading}
                    >
                      {hasCert ? 'Reemplazar certificado' : 'Subir certificado'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estado: derecha en desktop, arriba en mobile */}
          <div className={cn(panelClass, 'order-1 flex h-full min-h-0 flex-col overflow-hidden lg:order-2')}>
            <div className="border-b border-line/60 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                    isActive
                      ? 'bg-ok/10 text-ok-strong'
                      : isExpired
                        ? 'bg-danger/10 text-danger'
                        : 'bg-warn/10 text-warn',
                  )}
                >
                  <IconShield />
                </span>
                <SectionHint title={statusTitle} tip={statusTip} className="min-w-0 flex-1" />
              </div>
            </div>

            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}

              {meta && !q.isLoading && !q.error && (
                <div className="flex flex-1 flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyTile label="Estado">
                      <Badge className={statusClass(displayStatus)}>
                        {formatCertStatus(displayStatus)}
                      </Badge>
                    </ReadOnlyTile>
                    <ReadOnlyTile label="Vigencia">
                      <span className="tabular-nums">{formatVigencia(meta.not_after)}</span>
                    </ReadOnlyTile>
                  </div>

                  {isExpired && (
                    <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                      <span className="sm:hidden">Certificado vencido — renovalo abajo.</span>
                      <span className="hidden sm:inline">
                        El certificado ya venció. Renoválo subiendo un .p12 nuevo desde el formulario de
                        subida.
                      </span>
                    </div>
                  )}

                  {expiringSoon && (
                    <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
                      {daysLeft === 0 ? (
                        <>
                          <span className="sm:hidden">Vence hoy — renovalo pronto.</span>
                          <span className="hidden sm:inline">
                            El certificado vence hoy. Renoválo antes de emitir en producción.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="sm:hidden">
                            Vence en {daysLeft} día{daysLeft === 1 ? '' : 's'}.
                          </span>
                          <span className="hidden sm:inline">
                            El certificado vence en {daysLeft} día{daysLeft === 1 ? '' : 's'}. Planificá la
                            renovación.
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {hasCert && (
                    <ReadOnlyTile label="Almacenamiento">
                      <span className="inline-flex items-center gap-1.5 text-sm font-normal text-muted">
                        Cifrado en servidor
                        <InfoTip text={STORAGE_TIP} className="sm:hidden" />
                        <span className="hidden sm:inline">
                          · AES-256-GCM · identidad del titular no expuesta en el panel
                        </span>
                      </span>
                    </ReadOnlyTile>
                  )}

                  {!hasCert && canUpload && (
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => inputRef.current?.click()}
                    >
                      Subir primer certificado
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
