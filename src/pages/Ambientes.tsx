import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { upsertEnvironment } from '@/lib/secrets'

export default function Ambientes() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const canEdit = session!.role === 'owner'

  const [numTimbrado, setNumTimbrado] = useState('')
  const [fechaIni, setFechaIni] = useState('')
  const [idCsc, setIdCsc] = useState('0001')
  const [csc, setCsc] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      upsertEnvironment(token, {
        environment,
        num_timbrado: numTimbrado.trim(),
        fecha_inicio_vigencia: fechaIni.trim(),
        id_csc: idCsc.trim(),
        csc: csc.trim(),
      }),
    onSuccess: () => {
      setErr(null)
      setMsg(`Ambiente ${environment} actualizado. Go cifró el CSC.`)
      setCsc('')
    },
    onError: (e: Error) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  return (
    <AppShell title="Ambientes">
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-bold text-ink">Timbrado y CSC</h2>
            <Badge
              className={
                environment === 'PROD' ? 'bg-danger/10 text-danger' : 'bg-brand-100 text-brand-700'
              }
            >
              {environment}
            </Badge>
          </div>
          <p className="mb-5 text-sm text-muted">
            El toggle global TEST/PROD define el ambiente a configurar. El CSC se envía en claro a Go (
            <code className="text-ink">PUT /v1/panel/environments</code>), que lo cifra antes de
            persistir. No mezclar CSC/timbrado de PROD en TEST.
          </p>

          {!canEdit ? (
            <Alert>Solo el owner puede actualizar timbrado y CSC.</Alert>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Numero de timbrado"
                  value={numTimbrado}
                  onChange={(e) => setNumTimbrado(e.target.value)}
                  placeholder={environment === 'TEST' ? '06038964' : '18987010'}
                />
                <TextField
                  label="Fecha inicio vigencia"
                  type="date"
                  value={fechaIni}
                  onChange={(e) => setFechaIni(e.target.value)}
                />
                <TextField
                  label="Id CSC"
                  value={idCsc}
                  onChange={(e) => setIdCsc(e.target.value)}
                  placeholder="0001"
                />
                <TextField
                  label="CSC (en claro)"
                  type="password"
                  value={csc}
                  onChange={(e) => setCsc(e.target.value)}
                  autoComplete="off"
                  placeholder="32 caracteres"
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
                <Button
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                  disabled={!numTimbrado || !fechaIni || !idCsc || !csc}
                >
                  Guardar {environment}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
