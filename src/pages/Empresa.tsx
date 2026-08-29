import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, IconSave, SearchSelect, SuccessAlert, TextField } from '@/components/ui'
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
    <div className={cn('rounded-[1.05rem] bg-cream-soft px-3.5 py-2.5', className)}>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium leading-snug text-ink">{value || '—'}</p>
    </div>
  )
}

export default function Empresa() {
  const { session, environment } = useAuth()
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

  const canSave = canEdit && !!actCod && !!actDesc

  return (
    <AppShell title="Empresa">
      <div className="dashboard-canvas space-y-4 sm:-m-6 sm:space-y-6 sm:p-6">
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {q.data && (
          <>
            <div className="hidden items-end justify-between gap-3 sm:flex">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Cuenta</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Emisor</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{EMPRESA_TIP}</p>
              </div>
              {canEdit && (
                <Button
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                  disabled={!canSave}
                  className="h-10 shrink-0 gap-1.5"
                >
                  <IconSave />
                  Guardar cambios
                </Button>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Identidad del negocio
              </h3>
              <div className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                <p className="mb-3 hidden text-sm text-muted sm:block">Datos fiscales del cliente (solo lectura).</p>
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
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
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Emisor SIFEN
              </h3>
              <div className="relative min-h-0">
                {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}
                <div className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                  <p className="mb-3 hidden text-sm text-muted sm:block">{EMISOR_TIP}</p>
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                </div>
                {msg && (
                  <SuccessAlert onClose={() => setMsg(null)}>
                    {msg}
                  </SuccessAlert>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {canEdit &&
        q.data &&
        createPortal(
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={!canSave || save.isPending}
            className={cn(
              'fixed right-4 z-[35] inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 pr-5 pl-1.5 text-sm font-semibold text-ink md:hidden',
              'shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-ink)_22%,transparent)]',
              'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.96] disabled:opacity-50',
              'bottom-[calc(5.35rem+env(safe-area-inset-bottom,0px))]',
              environment === 'PROD' && 'env-prod',
            )}
            aria-label="Guardar cambios"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
              {save.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <IconSave />
              )}
            </span>
            Guardar
          </button>,
          document.body,
        )}
    </AppShell>
  )
}
