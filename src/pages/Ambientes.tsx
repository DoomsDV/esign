import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import {
  Alert,
  Badge,
  Button,
  InfoTip,
  Modal,
  PageHeader,
  SuccessAlert,
  TextField,
  panelClass,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { upsertEnvironment } from '@/lib/secrets'

const PAGE_TIP =
  'El selector TEST/PROD del header define qué ambiente estás configurando. No mezcles credenciales de homologación con las de producción.'

const TIMBRADO_TIP =
  'Número de 8 dígitos y fecha desde la cual el timbrado está habilitado en SET. Deben coincidir con lo registrado en Marangatú.'

const CSC_TIP =
  'Código alfanumérico de 32 caracteres para el QR. Se envía por HTTPS al servidor, donde se cifra antes de guardar; el panel nunca muestra el valor almacenado.'

function SectionHint({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <>
      <p className="mt-1 hidden text-sm text-muted sm:block">{children}</p>
      <InfoTip text={tip} className="mt-1.5 sm:hidden" />
    </>
  )
}

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

  const [numTimbrado, setNumTimbrado] = useState('')
  const [fechaIni, setFechaIni] = useState('')
  const [idCsc, setIdCsc] = useState('0001')
  const [csc, setCsc] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setNumTimbrado('')
    setFechaIni('')
    setIdCsc('0001')
    setCsc('')
    setMsg(null)
    setErr(null)
    setConfirmOpen(false)
  }, [environment])

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
      setConfirmOpen(false)
      setMsg(`Ambiente ${environment} guardado. El CSC quedó cifrado en el servidor.`)
      setCsc('')
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
                disabled={!canSave || saving}
              >
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
              <section>
                <h3 className="text-[15px] font-semibold tracking-tight text-ink">Timbrado SIFEN</h3>
                <SectionHint tip={TIMBRADO_TIP}>{TIMBRADO_TIP}</SectionHint>
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </div>
              </section>

              <hr className="border-t border-line/60" />

              <section>
                <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                  Código de seguridad (CSC)
                </h3>
                <SectionHint tip={CSC_TIP}>{CSC_TIP}</SectionHint>
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
                    disabled={saving}
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
                    disabled={saving}
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
                  disabled={!canSave || saving}
                >
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
            Confirmar guardado PROD
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
