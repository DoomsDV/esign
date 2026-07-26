import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { getClient, upsertEmisor, type Actividad } from '@/lib/config'

export default function Empresa() {
  const { session } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()

  const q = useQuery({ queryKey: ['client'], queryFn: () => getClient(token) })

  const [tipoCont, setTipoCont] = useState(1)
  const [regimen, setRegimen] = useState('')
  const [fantasia, setFantasia] = useState('')
  const [actCod, setActCod] = useState('')
  const [actDesc, setActDesc] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!q.data) return
    setTipoCont(q.data.emisor?.tipo_contribuyente ?? 1)
    setRegimen(q.data.emisor?.tipo_regimen ?? '')
    setFantasia(q.data.emisor?.nombre_fantasia ?? '')
    const first = q.data.actividades?.[0]
    setActCod(first?.cod ?? '')
    setActDesc(first?.desc ?? '')
  }, [q.data])

  const save = useMutation({
    mutationFn: async () => {
      const actividades: Actividad[] = []
      if (actCod.trim() && actDesc.trim()) {
        actividades.push({ cod: actCod.trim(), desc: actDesc.trim() })
      }
      await upsertEmisor(token, {
        tipo_contribuyente: tipoCont,
        tipo_regimen: regimen || undefined,
        nombre_fantasia: fantasia || undefined,
        actividades,
      })
    },
    onSuccess: async () => {
      setErr(null)
      setMsg('Emisor actualizado')
      await qc.invalidateQueries({ queryKey: ['client'] })
    },
    onError: (e: Error) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  return (
    <AppShell title="Empresa">
      {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {q.error && <Alert>{(q.error as Error).message}</Alert>}

      {q.data && (
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <Card className="p-6">
            <h2 className="mb-1 text-base font-bold text-ink">Identidad del negocio</h2>
            <p className="mb-5 text-sm text-muted">Datos fiscales del cliente (solo lectura).</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Razon social" value={q.data.business_name} readOnly />
              <TextField label="RUC" value={`${q.data.ruc}-${q.data.dv}`} readOnly />
              <TextField label="Estado" value={q.data.status} readOnly />
              <TextField label="Client ID" value={String(q.data.client_id)} readOnly />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-base font-bold text-ink">Emisor SIFEN</h2>
            <p className="mb-5 text-sm text-muted">
              Tipo de contribuyente, regimen y actividad economica (descripcion EXACTA del catalogo SET).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink">Tipo contribuyente</label>
                <select
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-sm"
                  value={tipoCont}
                  onChange={(e) => setTipoCont(Number(e.target.value))}
                >
                  <option value={1}>1 — Persona fisica</option>
                  <option value={2}>2 — Persona juridica</option>
                </select>
              </div>
              <TextField
                label="Tipo regimen"
                value={regimen}
                onChange={(e) => setRegimen(e.target.value)}
                placeholder="Opcional"
              />
              <TextField
                label="Nombre de fantasia"
                value={fantasia}
                onChange={(e) => setFantasia(e.target.value)}
                className="sm:col-span-2"
              />
              <TextField
                label="Codigo actividad (cActEco)"
                value={actCod}
                onChange={(e) => setActCod(e.target.value)}
                placeholder="74909"
              />
              <TextField
                label="Descripcion actividad (dDesActEco)"
                value={actDesc}
                onChange={(e) => setActDesc(e.target.value)}
                placeholder="EXACTA del catalogo SET"
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
              <Button loading={save.isPending} onClick={() => save.mutate()} disabled={session!.role === 'analyst'}>
                Guardar emisor
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
