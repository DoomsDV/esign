import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { fileToBase64, getCertificateMeta, uploadCertificate } from '@/lib/secrets'

export default function Certificado() {
  const { session } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canUpload = session!.role === 'owner'

  const q = useQuery({
    queryKey: ['certificate'],
    queryFn: () => getCertificateMeta(token),
  })

  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

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
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Card className="p-6">
          <h2 className="text-base font-bold text-ink">Certificado activo</h2>
          <p className="mt-1 text-sm text-muted">
            El BLOB nunca se expone al panel. Solo metadata (subject / vigencia / estado).
          </p>
          {q.isLoading && <p className="mt-4 text-sm text-muted">Cargando…</p>}
          {q.error && (
            <div className="mt-4">
              <Alert>{(q.error as Error).message}</Alert>
            </div>
          )}
          {meta && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted">Estado</p>
                <Badge className={hasCert ? 'mt-1 bg-ok/10 text-ok' : 'mt-1 bg-warn/10 text-warn'}>
                  {meta.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Vigencia</p>
                <p className="mt-1 text-sm text-ink">{meta.not_after ?? '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-muted">Subject DN</p>
                <p className="mt-1 break-all text-sm text-ink">{meta.subject_dn ?? '—'}</p>
              </div>
            </div>
          )}
        </Card>

        {canUpload && (
          <Card className="p-6">
            <h2 className="text-base font-bold text-ink">Subir .p12</h2>
            <p className="mt-1 text-sm text-muted">
              Se envía a Go (<code className="text-ink">POST /v1/panel/certificate</code>), que cifra con
              la master key. El navegador no cifra.
            </p>
            <div className="mt-4 grid gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink">Archivo .p12</label>
                <input
                  type="file"
                  accept=".p12,.pfx"
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <TextField
                label="Contraseña del certificado"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
            </div>
            {err && (
              <div className="mt-4">
                <Alert>{err}</Alert>
              </div>
            )}
            {msg && (
              <div className="mt-4">
                <SuccessAlert>{msg}</SuccessAlert>
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <Button loading={upload.isPending} onClick={() => upload.mutate()}>
                Subir certificado
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
