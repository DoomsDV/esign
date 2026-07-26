import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { upsertEnvironment } from '@/lib/secrets'

export default function Ambientes() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const canEdit = session!.role === 'owner'
  const isProd = environment === 'PROD'

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

  const canSave = Boolean(numTimbrado && fechaIni && idCsc && csc)

  return (
    <AppShell title="Ambientes">
      <div className="flex w-full flex-col gap-6">
        <header className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-ink">Timbrado y CSC</h2>
            <Badge className={isProd ? 'bg-ok/10 text-ok-strong' : 'bg-brand-100 text-brand-700'}>
              {environment}
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            El toggle global TEST/PROD define el ambiente a configurar. El CSC se envía en claro a
            Go, que lo cifra antes de persistir. No mezclar credenciales de PROD en TEST.
          </p>
        </header>

        {!canEdit ? (
          <Alert>Solo el owner puede actualizar timbrado y CSC.</Alert>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              <section className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Timbrado SIFEN
                </p>
                <p className="mt-1 text-sm text-muted">
                  Número y fecha de inicio de vigencia del set de timbrado del ambiente activo.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Número de timbrado"
                    value={numTimbrado}
                    onChange={(e) => setNumTimbrado(e.target.value)}
                    placeholder={isProd ? '18987010' : '06038964'}
                    requiredMark
                  />
                  <TextField
                    label="Fecha inicio vigencia"
                    type="date"
                    value={fechaIni}
                    onChange={(e) => setFechaIni(e.target.value)}
                    requiredMark
                  />
                </div>
              </section>

              <hr className="border-t border-line" />

              <section className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Código de seguridad (CSC)
                </p>
                <p className="mt-1 text-sm text-muted">
                  IdCSC y valor en claro. Se cifra en el servidor; no queda expuesto en el panel.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Id CSC"
                    value={idCsc}
                    onChange={(e) => setIdCsc(e.target.value)}
                    placeholder="0001"
                    requiredMark
                  />
                  <TextField
                    label="CSC (en claro)"
                    type="password"
                    value={csc}
                    onChange={(e) => setCsc(e.target.value)}
                    autoComplete="off"
                    placeholder="32 caracteres"
                    requiredMark
                  />
                </div>
              </section>

              {(err || msg) && (
                <div className="space-y-3">
                  {err && <Alert>{err}</Alert>}
                  {msg && <SuccessAlert>{msg}</SuccessAlert>}
                </div>
              )}

              <div className="flex justify-end border-t border-line/70 pt-5">
                <Button
                  variant={isProd ? 'success-outline' : 'primary'}
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                  disabled={!canSave}
                >
                  Guardar {environment}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {canEdit && isProd && (
          <div
            className={cn(
              'rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok-strong',
            )}
          >
            Estás editando <strong>PRODUCCIÓN</strong>. Un CSC o timbrado incorrecto invalida la
            emisión fiscal real.
          </div>
        )}
      </div>
    </AppShell>
  )
}
