import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { fileToBase64, getCertificateMeta, uploadCertificate } from '@/lib/secrets'

function formatVigencia(iso: string | null): string {
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

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" className="stroke-current" strokeWidth="1.8" />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
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

function acceptP12(file: File | null | undefined): file is File {
  if (!file) return false
  const name = file.name.toLowerCase()
  return name.endsWith('.p12') || name.endsWith('.pfx')
}

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
  const [copiedDn, setCopiedDn] = useState(false)

  async function copySubjectDn(value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedDn(true)
    window.setTimeout(() => setCopiedDn(false), 1600)
  }

  const pickFile = useCallback((next: File | null) => {
    setErr(null)
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
      setMsg('Certificado subido. Go lo cifró y guardó.')
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
  const hasCert = meta && meta.status !== 'NONE'

  return (
    <AppShell title="Certificado">
      <div className="grid w-full gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Columna: estado actual */}
        <Card className="min-w-0 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Estado</p>
          <h2 className="mt-1 text-base font-bold text-ink">Certificado activo</h2>
          <p className="mt-1 text-sm text-muted">
            Tu certificado actual está almacenado de forma segura.
          </p>

          {q.isLoading && <p className="mt-6 text-sm text-muted">Cargando…</p>}
          {q.error && (
            <div className="mt-6">
              <Alert>{(q.error as Error).message}</Alert>
            </div>
          )}

          {meta && (
            <div className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Estado</p>
                  <Badge className={cn('mt-1.5', hasCert ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn')}>
                    {meta.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Vigencia</p>
                  <p className="mt-1.5 text-sm font-semibold text-ink" title={meta.not_after ?? undefined}>
                    {formatVigencia(meta.not_after)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Subject DN</p>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line px-4 py-3">
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-xs text-ink"
                    title={meta.subject_dn ?? undefined}
                  >
                    {meta.subject_dn ?? '—'}
                  </span>
                  {meta.subject_dn && (
                    <button
                      type="button"
                      onClick={() => copySubjectDn(meta.subject_dn!)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-cream hover:text-ink"
                      title="Copiar Subject DN"
                    >
                      <IconCopy />
                      {copiedDn ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Columna: subir */}
        <Card className="min-w-0 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Actualizar</p>
          <h2 className="mt-1 text-base font-bold text-ink">Subir .p12</h2>
          <p className="mt-1 text-sm text-muted">
            Subí tu archivo .p12 para actualizar las credenciales de facturación. Se transferirá y
            almacenará cifrado.
          </p>

          {!canUpload ? (
            <div className="mt-6">
              <Alert>Solo el owner puede subir o reemplazar el certificado.</Alert>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <input
                ref={inputRef}
                type="file"
                accept=".p12,.pfx"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />

              {/* Mobile: picker nativo vía botón */}
              <div className="flex flex-col gap-1.5 md:hidden">
                <label className="text-sm font-medium text-ink">Archivo .p12</label>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left text-sm shadow-sm"
                >
                  <span className={cn('truncate', file ? 'font-medium text-ink' : 'text-muted')}>
                    {file ? file.name : 'Elegir archivo…'}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-brand-700">Examinar</span>
                </button>
              </div>

              {/* Desktop: drop zone */}
              <div className="hidden md:block">
                <label className="mb-1.5 block text-sm font-medium text-ink">Archivo .p12</label>
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
                    pickFile(e.dataTransfer.files?.[0] ?? null)
                  }}
                  className={cn(
                    'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
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
                      <p className="text-sm font-semibold text-ink">{file.name}</p>
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />

              {err && <Alert>{err}</Alert>}
              {msg && <SuccessAlert>{msg}</SuccessAlert>}

              <div className="flex justify-end pt-1">
                <Button
                  loading={upload.isPending}
                  onClick={() => upload.mutate()}
                  disabled={!file || !password}
                >
                  Subir certificado
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
