import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Card, PageHeader, SectionHint, SearchSelect, SuccessAlert, TextField, IconSave } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { getClient, upsertEmisor, type Actividad } from '@/lib/config'
import {
  ACTIVIDADES_ECONOMICAS,
  TIPOS_REGIMEN,
  actividadLabel,
} from '@/lib/sifen-catalogs'

const EMPRESA_TIP =
  'Datos fiscales de solo lectura y parámetros SIFEN que definen cómo se arma el XML del DE.'

const EMISOR_TIP =
  'Tipo de contribuyente, régimen y actividad económica. La descripción debe coincidir exactamente con el catálogo SET (error 1261/1262 si no).'

function formatClientStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Activa'
    case 'SUSPENDED':
      return 'Suspendida'
    case 'INACTIVE':
      return 'Inactiva'
    default:
      return status
  }
}

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
    <div className={cn('rounded-xl bg-cream-soft/80 px-4 py-3', className)}>
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
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {q.data && (
          <>
            <PageHeader
              compactOnMobile
              title="Configuración del emisor"
              description={EMPRESA_TIP}
              action={
                canEdit ? (
                  <Button
                    loading={save.isPending}
                    onClick={() => save.mutate()}
                    disabled={!actCod || !actDesc}
                  >
                    <IconSave />
                    Guardar cambios
                  </Button>
                ) : undefined
              }
            />

            {(err || msg) && (
              <div className="space-y-3">
                {err && <Alert>{err}</Alert>}
                {msg && <SuccessAlert>{msg}</SuccessAlert>}
              </div>
            )}

            <Card>
              <div className="flex flex-col gap-8 px-5 py-6 sm:px-7 sm:py-8">
                <section>
                  <SectionHint
                    title="Identidad del negocio"
                    tip="Datos fiscales del cliente (solo lectura)."
                  />
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <ReadOnlyField
                      label="Razón social"
                      value={q.data.business_name}
                      className="sm:col-span-2"
                    />
                    <ReadOnlyField label="RUC" value={`${q.data.ruc}-${q.data.dv}`} className="tabular-nums" />
                    <ReadOnlyField
                      label="Estado de la cuenta"
                      value={formatClientStatus(q.data.status)}
                    />
                  </div>
                </section>

                <hr className="border-t border-line/60" />

                <section>
                  <SectionHint title="Emisor SIFEN" tip={EMISOR_TIP} />

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
                </section>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
