import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Card, SearchSelect, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { getClient, upsertEmisor, type Actividad } from '@/lib/config'
import {
  ACTIVIDADES_ECONOMICAS,
  TIPOS_REGIMEN,
  actividadLabel,
} from '@/lib/sifen-catalogs'

function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug text-ink">{value || '—'}</p>
    </div>
  )
}

export default function Empresa() {
  const { session } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canEdit = session!.role !== 'analyst'

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
    setRegimen(q.data.emisor?.tipo_regimen ? String(q.data.emisor.tipo_regimen) : '')
    setFantasia(q.data.emisor?.nombre_fantasia ?? '')
    const first = q.data.actividades?.[0]
    setActCod(first?.cod ?? '')
    setActDesc(first?.desc ?? '')
  }, [q.data])

  const regimenOptions = useMemo(
    () => [
      { value: '', label: 'Sin régimen (opcional)' },
      ...TIPOS_REGIMEN.map((r) => ({ value: r.cod, label: `${r.cod} — ${r.desc}` })),
    ],
    [],
  )

  const actividadOptions = useMemo(() => {
    const base = ACTIVIDADES_ECONOMICAS.map((a) => ({
      value: a.cod,
      label: actividadLabel(a.cod, a.desc),
    }))
    // Si la actividad guardada no está en el catálogo local, la mostramos igual.
    if (actCod && !base.some((o) => o.value === actCod)) {
      base.unshift({
        value: actCod as (typeof base)[number]['value'],
        label: actividadLabel(actCod, actDesc || 'Actividad guardada'),
      })
    }
    return base
  }, [actCod, actDesc])

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

  function pickActividad(cod: string) {
    const hit = ACTIVIDADES_ECONOMICAS.find((a) => a.cod === cod)
    setActCod(cod)
    if (hit) setActDesc(hit.desc)
  }

  return (
    <AppShell title="Empresa">
      {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {q.error && <Alert>{(q.error as Error).message}</Alert>}

      {q.data && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-8 px-6 py-6 sm:px-8 sm:py-8">
            <section>
              <h2 className="text-base font-bold text-ink">Identidad del negocio</h2>
              <p className="mt-1 text-sm text-muted">Datos fiscales del cliente (solo lectura).</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <ReadOnlyField
                  label="Razón social"
                  value={q.data.business_name}
                  className="sm:col-span-2"
                />
                <ReadOnlyField label="RUC" value={`${q.data.ruc}-${q.data.dv}`} />
                <ReadOnlyField label="Estado" value={q.data.status} />
                <ReadOnlyField label="Client ID" value={String(q.data.client_id)} />
              </div>
            </section>

            <hr className="border-t border-line/70" />

            <section>
              <h2 className="text-base font-bold text-ink">Emisor SIFEN</h2>
              <p className="mt-1 text-sm text-muted">
                Tipo de contribuyente, régimen y actividad económica. La descripción se toma del
                catálogo oficial (debe coincidir exactamente con SET).
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SearchSelect
                  label="Tipo contribuyente"
                  requiredMark
                  value={String(tipoCont)}
                  onChange={(v) => setTipoCont(Number(v))}
                  options={[
                    { value: '1', label: '1 — Persona física' },
                    { value: '2', label: '2 — Persona jurídica' },
                  ]}
                  searchable={false}
                  disabled={!canEdit}
                />
                <SearchSelect
                  label="Tipo régimen"
                  value={regimen}
                  onChange={setRegimen}
                  options={regimenOptions}
                  placeholder="Seleccionar régimen…"
                  searchable={false}
                  disabled={!canEdit}
                />
                <div className="sm:col-span-2">
                  <TextField
                    label="Nombre de fantasía"
                    value={fantasia}
                    onChange={(e) => setFantasia(e.target.value)}
                    placeholder="Opcional"
                    disabled={!canEdit}
                  />
                </div>
                <div className="sm:col-span-2">
                  <SearchSelect
                    label="Actividad económica"
                    requiredMark
                    value={actCod}
                    onChange={pickActividad}
                    options={actividadOptions}
                    placeholder="Buscar por código o descripción…"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {(err || msg) && (
                <div className="mt-5 space-y-3">
                  {err && <Alert>{err}</Alert>}
                  {msg && <SuccessAlert>{msg}</SuccessAlert>}
                </div>
              )}
            </section>
          </div>

          {canEdit && (
            <div className="flex justify-end border-t border-line bg-cream-soft px-6 py-4 sm:px-8">
              <Button
                loading={save.isPending}
                onClick={() => save.mutate()}
                disabled={!actCod || !actDesc}
              >
                Guardar configuración
              </Button>
            </div>
          )}
        </Card>
      )}
    </AppShell>
  )
}
