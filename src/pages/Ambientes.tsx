import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Drawer, IconSave, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { getEnvironment, upsertEnvironment } from '@/lib/secrets'

const CONFIGURED_HINT =
  'Ya existe una configuración para este ambiente. El CSC no se muestra por seguridad — volvé a ingresarlo si vas a modificar cualquier valor.'

const PAGE_TIP =
  'El selector TEST/PROD del header define qué ambiente estás configurando. No mezcles credenciales de homologación con las de producción.'

const TIMBRADO_TIP =
  'Número de 8 dígitos y fecha desde la cual el timbrado está habilitado en SET. Deben coincidir con lo registrado en Marangatú.'

const CSC_TIP =
  'Código alfanumérico de 32 caracteres para el QR. Se envía por HTTPS al servidor, donde se cifra antes de guardar; el panel nunca muestra el valor almacenado.'

function validateTimbrado(value: string): string | null {
  const v = value.trim()
  if (!/^\d{8}$/.test(v)) return 'Debe tener exactamente 8 dígitos.'
  return null
}

function validateIdCsc(value: string): string | null {
  const v = value.trim()
  if (!/^\d{4}$/.test(v)) return 'Debe ser 4 dígitos (habitualmente 0001).'
  return null
}

function validateCsc(value: string): string | null {
  const v = value.trim()
  if (v.length !== 32) return 'Debe tener exactamente 32 caracteres.'
  if (!/^[A-Za-z0-9]{32}$/.test(v)) return 'Solo letras y números (sin espacios ni símbolos).'
  return null
}

export default function Ambientes() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const canEdit = session!.role === 'owner'
  const isProd = environment === 'PROD'

  const qc = useQueryClient()

  const [numTimbrado, setNumTimbrado] = useState('')
  const [fechaIni, setFechaIni] = useState('')
  const [idCsc, setIdCsc] = useState('0001')
  const [csc, setCsc] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const envQuery = useQuery({
    queryKey: ['environment', environment],
    queryFn: () => getEnvironment(token, environment),
  })

  useEffect(() => {
    setMsg(null)
    setErr(null)
    setConfirmOpen(false)
    setCsc('')
  }, [environment])

  useEffect(() => {
    if (envQuery.isLoading) return
    const data = envQuery.data
    if (data) {
      setNumTimbrado(data.num_timbrado ?? '')
      setFechaIni(data.fecha_inicio_vigencia ?? '')
      setIdCsc(data.id_csc ?? '0001')
    } else {
      setNumTimbrado('')
      setFechaIni('')
      setIdCsc('0001')
    }
  }, [environment, envQuery.data, envQuery.isLoading])

  const save = useMutation({
    mutationFn: () =>
      upsertEnvironment(token, {
        environment,
        num_timbrado: numTimbrado.trim(),
        fecha_inicio_vigencia: fechaIni.trim(),
        id_csc: idCsc.trim(),
        csc: csc.trim(),
      }),
    onSuccess: async () => {
      setErr(null)
      setConfirmOpen(false)
      setMsg(`Ambiente ${environment} guardado. El CSC quedó cifrado en el servidor.`)
      setCsc('')
      await qc.invalidateQueries({ queryKey: ['environment', environment] })
    },
    onError: (e: Error) => {
      setConfirmOpen(false)
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const timbradoError = numTimbrado.trim() ? validateTimbrado(numTimbrado) : null
  const idCscError = idCsc.trim() ? validateIdCsc(idCsc) : null
  const cscError = csc.trim() ? validateCsc(csc) : null

  const canSave =
    Boolean(numTimbrado.trim() && fechaIni.trim() && idCsc.trim() && csc.trim()) &&
    !timbradoError &&
    !idCscError &&
    !cscError

  const saving = save.isPending
  const loadingEnv = envQuery.isLoading
  const formDisabled = saving || loadingEnv

  function submitSave() {
    if (!canSave || saving) return
    save.mutate()
  }

  function requestSave() {
    if (!canSave || saving || formDisabled) return
    if (isProd) {
      setConfirmOpen(true)
      return
    }
    submitSave()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    requestSave()
  }

  return (
    <AppShell title="Ambientes">
      <div className="dashboard-canvas space-y-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <div className="hidden items-end justify-between gap-3 sm:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">SET</p>
            <h2 className="mt-1 flex flex-wrap items-baseline gap-2 text-xl font-semibold tracking-tight text-ink">
              Timbrado y CSC
              <span className={cn('text-[11px] font-medium', isProd ? 'text-ok-strong' : 'text-brand-700')}>
                {environment}
              </span>
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{PAGE_TIP}</p>
          </div>
          {canEdit && (
            <Button
              type="submit"
              form="ambientes-form"
              variant={isProd ? 'danger-outline' : 'primary'}
              className="h-10 shrink-0 gap-1.5"
              loading={saving}
              disabled={!canSave || formDisabled}
            >
              <IconSave />
              Guardar {environment}
            </Button>
          )}
        </div>

        {!canEdit && <Alert>Solo el propietario de la cuenta puede actualizar timbrado y CSC.</Alert>}

        {canEdit && (
          <form id="ambientes-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {loadingEnv && <p className="text-sm text-muted">Cargando configuración guardada…</p>}

            {!loadingEnv && envQuery.data && (
              <p className="rounded-[1.25rem] bg-surface px-4 py-3.5 text-sm leading-relaxed text-muted">
                {CONFIGURED_HINT}
              </p>
            )}

            {(err || msg) && (
              <div className="space-y-3">
                {err && <Alert>{err}</Alert>}
                {msg && <SuccessAlert>{msg}</SuccessAlert>}
              </div>
            )}

            {isProd && (
              <p className="rounded-[1.05rem] bg-warn/10 px-3.5 py-2.5 text-sm leading-relaxed text-warn">
                <span className="sm:hidden">Editás producción — verificá timbrado y CSC.</span>
                <span className="hidden sm:inline">
                  Estás editando <strong>producción</strong>. Un CSC o timbrado incorrecto invalida la emisión
                  fiscal real.
                </span>
              </p>
            )}

            <section>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Timbrado SIFEN
              </h3>
              <div className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                <p className="mb-3 hidden text-sm leading-relaxed text-muted sm:block">{TIMBRADO_TIP}</p>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <TextField
                    label="Número de timbrado"
                    name="num-timbrado"
                    value={numTimbrado}
                    onChange={(e) => setNumTimbrado(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="8 dígitos"
                    inputMode="numeric"
                    maxLength={8}
                    autoComplete="off"
                    requiredMark
                    disabled={formDisabled}
                    error={timbradoError ?? undefined}
                    className="tabular-nums"
                  />
                  <TextField
                    label="Fecha inicio vigencia"
                    name="fecha-ini-t"
                    type="date"
                    value={fechaIni}
                    onChange={(e) => setFechaIni(e.target.value)}
                    autoComplete="off"
                    requiredMark
                    disabled={formDisabled}
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Código CSC
              </h3>
              <div className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                <p className="mb-3 hidden text-sm leading-relaxed text-muted sm:block">{CSC_TIP}</p>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <TextField
                    label="Número del código"
                    name="id-csc"
                    value={idCsc}
                    onChange={(e) => setIdCsc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0001"
                    hint="Asignado al generar el CSC en SET (habitualmente 0001)"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    requiredMark
                    disabled={formDisabled}
                    error={idCscError ?? undefined}
                    className="tabular-nums"
                  />
                  <TextField
                    label="Código CSC"
                    name="csc-value"
                    type="password"
                    value={csc}
                    onChange={(e) => setCsc(e.target.value.slice(0, 32))}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="32 caracteres"
                    maxLength={32}
                    requiredMark
                    disabled={formDisabled}
                    error={cscError ?? undefined}
                  />
                </div>
              </div>
            </section>
          </form>
        )}
      </div>

      {canEdit &&
        createPortal(
          <button
            type="button"
            onClick={requestSave}
            disabled={!canSave || formDisabled}
            className={cn(
              'fixed right-4 z-[35] inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 pr-5 pl-1.5 text-sm font-semibold text-ink md:hidden',
              'shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-ink)_22%,transparent)]',
              'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.96] disabled:opacity-50',
              'bottom-[calc(5.35rem+env(safe-area-inset-bottom,0px))]',
              environment === 'PROD' && 'env-prod',
              confirmOpen && 'pointer-events-none scale-95 opacity-0',
            )}
            aria-label={`Guardar ${environment}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <IconSave />
              )}
            </span>
            Guardar
          </button>,
          document.body,
        )}

      <Drawer
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        title={`Guardar ${environment}`}
        keepMounted
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={saving} onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={saving} onClick={submitSave}>
              <IconSave />
              Confirmar PROD
            </Button>
          </div>
        }
      >
        <p className="rounded-[1.05rem] bg-warn/10 px-3.5 py-3 text-sm leading-relaxed text-warn">
          Estás guardando timbrado y CSC en <strong>producción</strong>. Un valor incorrecto puede invalidar la
          emisión fiscal real.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Verificá que el timbrado, la fecha de vigencia y el CSC correspondan al set habilitado en SET para
          producción.
        </p>
      </Drawer>
    </AppShell>
  )
}
