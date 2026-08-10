import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import {
  Alert,
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
import { createInvitation, type InviteResult } from '@/lib/config'

const PAGE_TIP =
  'Invitá personas a tu negocio con un token de un solo uso. Cada rol define qué puede ver y hacer en el panel.'

const INVITE_TIP =
  'El token expira y solo funciona una vez. Compartilo por un canal seguro (no lo publiques en chats abiertos).'

const LAST_INVITE_TIP =
  'El token se muestra una sola vez en esta sesión. Si refrescás la página, no podrás recuperarlo.'

const ROLES: Array<{
  value: 'developer' | 'analyst' | 'owner'
  label: string
  short: string
  desc: string
  tip: string
}> = [
  {
    value: 'analyst',
    label: 'Analista',
    short: 'Solo lectura',
    desc: 'Solo lectura de documentos. Sin acceso a certificado ni keys.',
    tip: 'Para contabilidad o auditoría: consulta DE emitidos sin tocar secretos.',
  },
  {
    value: 'developer',
    label: 'Desarrollador',
    short: 'Keys, emisión y config',
    desc: 'Ve y rota API keys, emite documentos y consulta configuración.',
    tip: 'Ideal para quien integra tu backend o emite por API. No puede subir certificado ni timbrado.',
  },
  {
    value: 'owner',
    label: 'Propietario',
    short: 'Acceso total',
    desc: 'Acceso total: equipo, certificado, ambientes y facturación.',
    tip: 'Mismo poder que vos: gestionar secretos, invitar personas y configurar el negocio.',
  },
]

function formatRoleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function formatExpira(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d
    .toLocaleString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\./g, '')
}

function SectionHint({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <>
      <p className="mt-0.5 hidden text-sm text-muted sm:block">{children}</p>
      <InfoTip text={tip} className="mt-1.5 sm:hidden" />
    </>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" className="stroke-current" strokeWidth="1.8" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function Equipo() {
  const { session } = useAuth()
  const token = session!.accessToken
  const canInvite = session!.role === 'owner'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'developer' | 'analyst' | 'owner'>('developer')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmOwnerOpen, setConfirmOwnerOpen] = useState(false)
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const copiedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) window.clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const invite = useMutation({
    mutationFn: () => createInvitation(token, email.trim(), role),
    onSuccess: (data) => {
      setErr(null)
      setResult(data)
      setCopied(false)
      setEmail('')
      if (data.token) setTokenModalOpen(true)
    },
    onError: (e: Error) => {
      setResult(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const inviting = invite.isPending
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function copyToken() {
    if (!result?.token) return
    try {
      await navigator.clipboard.writeText(result.token)
      setCopied(true)
      if (copiedTimerRef.current != null) window.clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setErr('No se pudo copiar al portapapeles. Seleccioná el token manualmente.')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!emailValid || inviting) return
    if (role === 'owner') {
      setConfirmOwnerOpen(true)
      return
    }
    invite.mutate()
  }

  function inviteExpiryLabel(data: InviteResult): string | null {
    if (data.expires_at) return formatExpira(data.expires_at)
    if (data.expires_in_days != null) {
      const n = data.expires_in_days
      return `En ${n} día${n === 1 ? '' : 's'}`
    }
    return null
  }

  return (
    <AppShell title="Equipo">
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <PageHeader
          compactOnMobile
          title={
            <span className="inline-flex items-center gap-1.5">
              Equipo
              <InfoTip text={PAGE_TIP} className="sm:hidden" />
            </span>
          }
          description={PAGE_TIP}
        />

        <div
          className={cn(
            'grid w-full gap-5 lg:items-stretch',
            canInvite ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
          )}
        >
          <div className={cn(panelClass, 'order-1 flex h-full min-h-0 flex-col overflow-hidden lg:order-1')}>
            <div className="border-b border-line/60 px-5 py-4 sm:px-6">
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">Invitar miembro</h3>
              <SectionHint tip={INVITE_TIP}>
                Generá un token seguro de un solo uso para sumar a alguien a tu negocio.
              </SectionHint>
            </div>

            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              {!canInvite ? (
                <Alert>Solo el propietario de la cuenta puede invitar miembros.</Alert>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
                  <TextField
                    label="Email"
                    name="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dev@empresa.com"
                    autoComplete="off"
                    requiredMark
                    required
                    disabled={inviting}
                    error={
                      email.trim() && !emailValid ? 'Ingresá un email válido (ej. dev@empresa.com).' : undefined
                    }
                  />

                  <div>
                    <p className="mb-2 text-sm font-medium text-ink">
                      Rol <span className="text-danger/45">*</span>
                    </p>
                    <div className="grid gap-2" role="radiogroup" aria-label="Rol del invitado">
                      {ROLES.map((r) => {
                        const active = role === r.value
                        return (
                          <div
                            key={r.value}
                            className={cn(
                              'rounded-xl border transition-colors',
                              active && r.value === 'owner'
                                ? 'border-warn/50 bg-warn/5 ring-2 ring-warn/25'
                                : active
                                  ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-200'
                                  : 'border-line hover:border-ink/25 hover:bg-cream',
                            )}
                          >
                            <button
                              type="button"
                              disabled={inviting}
                              role="radio"
                              aria-checked={active}
                              onClick={() => setRole(r.value)}
                              className="flex w-full items-start justify-between gap-2 px-4 py-3 text-left disabled:opacity-60"
                            >
                              <span>
                                <span className="text-sm font-semibold text-ink">{r.label}</span>
                                <p className="mt-0.5 text-xs text-muted sm:hidden">{r.short}</p>
                                <p className="mt-0.5 hidden text-xs leading-relaxed text-muted sm:block">
                                  {r.desc}
                                </p>
                              </span>
                            </button>
                            <div className="flex justify-end px-3 pb-2 sm:hidden">
                              <InfoTip text={r.tip} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {err && <Alert>{err}</Alert>}

                  <div className="mt-auto flex justify-end pt-1">
                    <Button
                      type="submit"
                      className="max-sm:w-full"
                      loading={inviting}
                      disabled={!emailValid || inviting}
                    >
                      Crear invitación
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {canInvite && (
          <div className={cn(panelClass, 'order-2 flex h-full min-h-0 flex-col overflow-hidden lg:order-2')}>
            <div className="border-b border-line/60 px-5 py-4 sm:px-6">
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">Última invitación</h3>
              <SectionHint tip={LAST_INVITE_TIP}>
                El token se muestra una sola vez. Compartilo por un canal seguro con el invitado.
              </SectionHint>
            </div>

            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              {!result ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-ink">Sin invitaciones recientes</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
                    Cuando crees una, el token aparecerá en un diálogo para copiarlo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <SuccessAlert>
                    Invitación creada
                    {result.email ? ` · ${result.email}` : ''}
                  </SuccessAlert>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-cream-soft/80 px-4 py-3">
                      <p className="text-xs font-medium text-muted">Rol</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {formatRoleLabel(result.role ?? role)}
                      </p>
                    </div>
                    {inviteExpiryLabel(result) && (
                      <div className="rounded-xl bg-cream-soft/80 px-4 py-3">
                        <p className="text-xs font-medium text-muted">Expira</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                          {inviteExpiryLabel(result)}
                        </p>
                      </div>
                    )}
                  </div>

                  {result.token && (
                    <p className="text-sm text-muted">
                      El token de invitación ya se mostró en el diálogo. Si no lo copiaste, creá una
                      nueva invitación para el mismo email.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      <Modal
        open={tokenModalOpen && !!result?.token}
        onClose={() => {
          setTokenModalOpen(false)
          setCopied(false)
        }}
        title="Token de invitación — cópialo ahora"
      >
        {result?.token && (
          <>
            <SuccessAlert>
              Este token solo se muestra una vez. Compartilo por un canal seguro con{' '}
              {result.email ? result.email : 'el invitado'}.
            </SuccessAlert>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-cream-soft/80 px-4 py-3">
                <p className="text-xs font-medium text-muted">Rol</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {formatRoleLabel(result.role ?? role)}
                </p>
              </div>
              {inviteExpiryLabel(result) && (
                <div className="rounded-xl bg-cream-soft/80 px-4 py-3">
                  <p className="text-xs font-medium text-muted">Expira</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                    {inviteExpiryLabel(result)}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
              Copiá el token antes de cerrar este diálogo.
            </div>
            <div className="mt-4 rounded-xl border border-line bg-cream-soft/50 p-4 font-mono text-sm break-all text-ink">
              {result.token}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={copyToken} className="gap-1.5">
                <CopyIcon />
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button
                onClick={() => {
                  setTokenModalOpen(false)
                  setCopied(false)
                }}
              >
                Listo
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={confirmOwnerOpen}
        onClose={() => !inviting && setConfirmOwnerOpen(false)}
        title="Invitar como propietario"
      >
        <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          Esta persona tendrá el <strong>mismo control</strong> que vos: certificado, timbrado, CSC,
          API keys y gestión del equipo.
        </div>
        <p className="mt-3 text-sm text-muted">
          ¿Confirmás invitar a <strong>{email.trim()}</strong> como propietario?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={inviting} onClick={() => setConfirmOwnerOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger-outline"
            loading={inviting}
            onClick={() => {
              invite.mutate()
              setConfirmOwnerOpen(false)
            }}
          >
            Confirmar invitación
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
