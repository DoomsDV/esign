import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, SuccessAlert, TextField } from '@/components/ui'
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
      <div className="flex w-full flex-col gap-8 bg-white">
        <header className="flex flex-col gap-3 border-b border-line/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-ink">Timbrado y CSC</h2>
              <Badge className={isProd ? 'bg-danger/10 text-danger' : 'bg-brand-100 text-brand-700'}>
                {environment}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              El toggle global TEST/PROD define el ambiente a configurar. El CSC se envía en claro a
              Go, que lo cifra antes de persistir. No mezclar credenciales de PROD en TEST.
            </p>
          </div>
          {canEdit && (
            <Button
              className="shrink-0 self-start"
              variant={isProd ? 'danger-outline' : 'primary'}
              loading={save.isPending}
              onClick={() => save.mutate()}
              disabled={!canSave}
            >
              Guardar {environment}
            </Button>
          )}
        </header>

        {!canEdit ? (
          <Alert>Solo el owner puede actualizar timbrado y CSC.</Alert>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
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

            <section className="min-w-0 border-t border-line/70 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
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
          </div>
        )}

        {(err || msg) && (
          <div className="space-y-3 border-t border-line/70 pt-6">
            {err && <Alert>{err}</Alert>}
            {msg && <SuccessAlert>{msg}</SuccessAlert>}
          </div>
        )}

        {canEdit && isProd && (
          <div
            className={cn(
              'rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger',
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
