import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import {
  Alert,
  Badge,
  Button,
  IconSave,
  InfoTip,
  Modal,
  PageHeader,
  SectionHint,
  SuccessAlert,
  TextField,
  panelClass,
} from '@/components/ui'
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave || saving) return
    if (isProd) {
      setConfirmOpen(true)
      return
    }
    submitSave()
  }

  return (
    <AppShell title="Ambientes">
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <PageHeader
          compactOnMobile
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              Timbrado y CSC
              <Badge className={isProd ? 'bg-ok/10 text-ok-strong' : 'bg-brand-100 text-brand-700'}>
                {environment}
              </Badge>
              <InfoTip text={PAGE_TIP} className="sm:hidden" />
            </span>
          }
          description={PAGE_TIP}
          action={
            canEdit ? (
              <Button
                type="submit"
                form="ambientes-form"
                variant={isProd ? 'danger-outline' : 'primary'}
                className="hidden sm:inline-flex"
                loading={saving}
                disabled={!canSave || formDisabled}
              >
                <IconSave />
                Guardar {environment}
              </Button>
            ) : undefined
          }
        />

        {!canEdit ? (
          <Alert>Solo el propietario de la cuenta puede actualizar timbrado y CSC.</Alert>
        ) : (
          <div className={cn(panelClass, 'overflow-hidden')}>
            <form id="ambientes-form" onSubmit={handleSubmit} className="flex flex-col gap-8 px-5 py-6 sm:px-7 sm:py-8">
              {loadingEnv && <p className="text-sm text-muted">Cargando configuración guardada…</p>}

              {!loadingEnv && envQuery.data && (
                <div className="rounded-xl border border-line/60 bg-cream-soft/50 px-4 py-3 text-sm text-muted">
                  {CONFIGURED_HINT}
                </div>
              )}

              <section>
                <SectionHint title="Timbrado SIFEN" tip={TIMBRADO_TIP} />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
              </section>

              <hr className="border-t border-line/60" />

              <section>
                <SectionHint title="Código de seguridad (CSC)" tip={CSC_TIP} />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
              </section>

              {isProd && (
                <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
                  <span className="sm:hidden">Editás producción — verificá timbrado y CSC.</span>
                  <span className="hidden sm:inline">
                    Estás editando <strong>producción</strong>. Un CSC o timbrado incorrecto invalida
                    la emisión fiscal real.
                  </span>
                </div>
              )}

              {(err || msg) && (
                <div className="space-y-3">
                  {err && <Alert>{err}</Alert>}
                  {msg && <SuccessAlert>{msg}</SuccessAlert>}
                </div>
              )}

              <div className="flex justify-end sm:hidden">
                <Button
                  type="submit"
                  variant={isProd ? 'danger-outline' : 'primary'}
                  className="w-full"
                  loading={saving}
                  disabled={!canSave || formDisabled}
                >
                  <IconSave />
                  Guardar {environment}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        title={`Guardar ambiente ${environment}`}
      >
        <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          Estás guardando timbrado y CSC en <strong>producción</strong>. Un valor incorrecto puede
          invalidar la emisión fiscal real.
        </div>
        <p className="mt-3 text-sm text-muted">
          Verificá que el timbrado, la fecha de vigencia y el CSC correspondan al set habilitado en
          SET para producción.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger-outline" loading={saving} onClick={submitSave}>
            <IconSave />
            Confirmar guardado PROD
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
