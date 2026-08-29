import { useState, useRef, useEffect, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Drawer, SuccessAlert, TextField } from '@/components/ui'
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
}> = [
  {
    value: 'analyst',
    label: 'Analista',
    short: 'Solo lectura',
    desc: 'Consulta DE emitidos. Sin acceso a certificado ni keys.',
  },
  {
    value: 'developer',
    label: 'Desarrollador',
    short: 'Keys, emisión y config',
    desc: 'Rota keys, emite documentos y consulta configuración.',
  },
  {
    value: 'owner',
    label: 'Propietario',
    short: 'Acceso total',
    desc: 'Equipo, certificado, ambientes y facturación.',
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" className="stroke-current" strokeWidth="1.8" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconInvite() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" className="stroke-current" strokeWidth="1.7" />
      <path
        d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19M16 8h5M18.5 5.5v5"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Equipo() {
  const { session, environment } = useAuth()
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
      setConfirmOwnerOpen(false)
      setResult(data)
      setCopied(false)
      setEmail('')
      if (data.token) setTokenModalOpen(true)
    },
    onError: (e: Error) => {
      setResult(null)
      setConfirmOwnerOpen(false)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const inviting = invite.isPending
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = canInvite && emailValid && !inviting
  const drawerOpen = confirmOwnerOpen || tokenModalOpen

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

  function requestInvite() {
    if (!canSubmit) return
    if (role === 'owner') {
      setConfirmOwnerOpen(true)
      return
    }
    invite.mutate()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    requestInvite()
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
      <div className="dashboard-canvas space-y-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <div className="hidden items-end justify-between gap-3 sm:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Cuenta</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Equipo</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{PAGE_TIP}</p>
          </div>
        </div>

        <div className={cn('grid w-full gap-4 lg:items-start', canInvite ? 'lg:grid-cols-2 lg:gap-6' : 'lg:grid-cols-1')}>
          <section className="order-1">
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Invitar</h3>
            <div className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
              <p className="mb-3 hidden text-sm leading-relaxed text-muted sm:block">{INVITE_TIP}</p>

              {!canInvite ? (
                <Alert>Solo el propietario de la cuenta puede invitar miembros.</Alert>
              ) : (
                <form id="equipo-invite-form" onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
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
                    <p className="mb-1.5 text-sm font-medium text-ink">
                      Rol <span className="text-danger/45">*</span>
                    </p>
                    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Rol del invitado">
                      {ROLES.map((r) => {
                        const active = role === r.value
                        const owner = r.value === 'owner'
                        return (
                          <div
                            key={r.value}
                            role="radio"
                            aria-checked={active}
                            tabIndex={inviting ? -1 : 0}
                            onClick={() => !inviting && setRole(r.value)}
                            onKeyDown={(e) => {
                              if (inviting) return
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault()
                                setRole(r.value)
                              }
                            }}
                            className={cn(
                              'flex w-full cursor-pointer items-start gap-3 rounded-[1.05rem] px-3.5 py-2.5 text-left',
                              'transition-[transform,opacity,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                              'active:scale-[0.99]',
                              inviting && 'pointer-events-none opacity-60',
                              active && owner && 'bg-warn/10',
                              active && !owner && 'bg-brand-50',
                              !active && 'bg-cream-soft',
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                active ? (owner ? 'bg-warn' : 'bg-brand-500') : 'bg-muted/35',
                              )}
                            />
                            <span className="min-w-0">
                              <span className="text-sm font-medium text-ink">{r.label}</span>
                              <span className="text-xs text-muted"> · {r.short}</span>
                              <p className="mt-0.5 text-[11px] leading-snug text-muted sm:text-xs">{r.desc}</p>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {err && <Alert>{err}</Alert>}

                  <div className="hidden justify-end pt-1 sm:flex">
                    <Button type="submit" loading={inviting} disabled={!canSubmit}>
                      Crear invitación
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {canInvite && (
            <section className="order-2">
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Última invitación
              </h3>
              <article className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
                <p className="mb-3 hidden text-sm leading-relaxed text-muted sm:block">{LAST_INVITE_TIP}</p>
                {!result ? (
                  <p className="text-sm leading-relaxed text-muted">Sin invitaciones recientes.</p>
                ) : (
                  <div className="space-y-3">
                    <SuccessAlert overlay={false}>
                      Invitación creada
                      {result.email ? ` · ${result.email}` : ''}
                    </SuccessAlert>
                    <p className="break-all text-[1.15rem] font-semibold leading-snug tracking-tight text-ink">
                      {result.email || 'Invitado'}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatRoleLabel(result.role ?? role)}
                      {inviteExpiryLabel(result) ? ` · Expira ${inviteExpiryLabel(result)}` : ''}
                    </p>
                    {result.token && (
                      <p className="text-xs leading-relaxed text-muted">
                        El token ya se mostró. Si no lo copiaste, creá una nueva invitación para el mismo email.
                      </p>
                    )}
                  </div>
                )}
              </article>
            </section>
          )}
        </div>
      </div>

      {canInvite &&
        createPortal(
          <button
            type="button"
            onClick={requestInvite}
            disabled={!canSubmit}
            className={cn(
              'fixed right-4 z-[35] inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 pr-5 pl-1.5 text-sm font-semibold text-ink md:hidden',
              'shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-ink)_22%,transparent)]',
              'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.96] disabled:opacity-50',
              'bottom-[calc(5.35rem+env(safe-area-inset-bottom,0px))]',
              environment === 'PROD' && 'env-prod',
              drawerOpen && 'pointer-events-none scale-95 opacity-0',
            )}
            aria-label="Crear invitación"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
              {inviting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <IconInvite />
              )}
            </span>
            Invitar
          </button>,
          document.body,
        )}

      <Drawer
        open={tokenModalOpen && !!result?.token}
        onClose={() => {
          setTokenModalOpen(false)
          setCopied(false)
        }}
        title="Token de invitación"
        keepMounted
        footer={
          <div className="flex justify-end gap-2">
            <Button variant={copied ? 'success-outline' : 'secondary'} onClick={copyToken} className="gap-1.5">
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
        }
      >
        {result?.token && (
          <>
            <SuccessAlert overlay={false}>
              Este token solo se muestra una vez. Compartilo por un canal seguro
              {result.email ? ` con ${result.email}` : ''}.
            </SuccessAlert>
            <p className="mt-4 text-[11px] text-muted">
              {formatRoleLabel(result.role ?? role)}
              {inviteExpiryLabel(result) ? ` · Expira ${inviteExpiryLabel(result)}` : ''}
            </p>
            <p className="mt-3 break-all rounded-[1.05rem] bg-surface px-3.5 py-3 font-mono text-sm leading-snug text-ink">
              {result.token}
            </p>
            <p className="mt-3 rounded-[1.05rem] bg-warn/10 px-3.5 py-2.5 text-sm leading-relaxed text-warn">
              Copiá el token antes de cerrar.
            </p>
          </>
        )}
      </Drawer>

      <Drawer
        open={confirmOwnerOpen}
        onClose={() => !inviting && setConfirmOwnerOpen(false)}
        title="Invitar como propietario"
        keepMounted
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={inviting} onClick={() => setConfirmOwnerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={inviting} onClick={() => invite.mutate()}>
              Confirmar invitación
            </Button>
          </div>
        }
      >
        <p className="rounded-[1.05rem] bg-warn/10 px-3.5 py-3 text-sm leading-relaxed text-warn">
          Esta persona tendrá el <strong>mismo control</strong> que vos: certificado, timbrado, CSC, API keys y
          gestión del equipo.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          ¿Confirmás invitar a <strong>{email.trim()}</strong> como propietario?
        </p>
      </Drawer>
    </AppShell>
  )
}
