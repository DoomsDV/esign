import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Drawer, SearchSelect, SuccessAlert, TextField, panelClass } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  listEstablecimientos,
  upsertEstablecimiento,
  upsertPunto,
  type Establecimiento,
  type EstablecimientoUpsert,
  type PuntoExpedicion,
  type PuntoUpsert,
} from '@/lib/config'
import {
  CIUDADES,
  DEPARTAMENTOS,
  ciudadesByDistrito,
  distritosByDepartamento,
  findCiudad,
  findDepartamento,
  findDistrito,
  geoLabel,
} from '@/lib/geo'

/** Secciones al ras del body (sin tarjeta flotante). */
const SECTION = 'bg-white'

const emptyEstab: EstablecimientoUpsert = {
  codigo: '',
  denominacion: '',
  direccion: '',
  num_casa: '0',
  dep: { cod: 0, desc: '' },
  dis: { cod: 0, desc: '' },
  ciu: { cod: 0, desc: '' },
  telefono: '',
  email: '',
}

/* Si el texto viene casi todo en mayúsculas, lo pasa a Title Case para leer mejor. */
function formatReadable(text: string): string {
  if (!text) return ''
  const letters = text.replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ]/g, '')
  if (!letters) return text
  const upper = [...letters].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length
  if (upper / letters.length < 0.55) return text
  return text
    .toLowerCase()
    .replace(/(^|[\s\-/,.°]+)([a-záéíóúüñ])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

function IconMap() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" className="stroke-current" strokeWidth="1.8" />
    </svg>
  )
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" className="stroke-current" strokeWidth="1.8" />
      <path d="M12 11v5M12 8h.01" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3ZM13.5 7.5l3 3"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IconPower() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v9" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7.5 6.5a7 7 0 1 0 9 0"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Establecimientos() {
  const { session } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canEdit = session!.role === 'owner'

  const q = useQuery({
    queryKey: ['establecimientos'],
    queryFn: () => listEstablecimientos(token),
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null)
  const [form, setForm] = useState<EstablecimientoUpsert>(emptyEstab)
  const [puntoOpen, setPuntoOpen] = useState<Establecimiento | null>(null)
  const [punto, setPunto] = useState<PuntoUpsert>({ codigo: '', descripcion: '', is_active: 1 })
  const [editingPunto, setEditingPunto] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function openNew() {
    setForm(emptyEstab)
    setEditingCodigo(null)
    setEditOpen(true)
    setErr(null)
  }

  function openEdit(e: Establecimiento) {
    setForm({
      codigo: e.codigo,
      denominacion: e.denominacion ?? '',
      direccion: e.direccion,
      num_casa: e.num_casa ?? '0',
      dep: e.dep,
      dis: e.dis ?? { cod: 0, desc: '' },
      ciu: e.ciu,
      telefono: e.telefono ?? '',
      email: e.email ?? '',
    })
    setEditingCodigo(e.codigo)
    setEditOpen(true)
    setErr(null)
  }

  function openNewPunto(e: Establecimiento) {
    setPuntoOpen(e)
    setPunto({ codigo: '', descripcion: '', is_active: 1 })
    setEditingPunto(false)
    setErr(null)
  }

  function openEditPunto(e: Establecimiento, p: PuntoExpedicion) {
    setPuntoOpen(e)
    setPunto({ codigo: p.codigo, descripcion: p.descripcion ?? '', is_active: p.is_active ? 1 : 0 })
    setEditingPunto(true)
    setErr(null)
  }

  const saveEstab = useMutation({
    mutationFn: () =>
      upsertEstablecimiento(token, {
        ...form,
        dep: { cod: Number(form.dep.cod), desc: form.dep.desc },
        dis: form.dis?.cod ? { cod: Number(form.dis.cod), desc: form.dis.desc } : undefined,
        ciu: { cod: Number(form.ciu.cod), desc: form.ciu.desc },
      }),
    onSuccess: async () => {
      setMsg('Establecimiento guardado')
      setEditOpen(false)
      await qc.invalidateQueries({ queryKey: ['establecimientos'] })
    },
    onError: (e: Error) => setErr(e instanceof ApiError ? e.message : e.message),
  })

  const savePunto = useMutation({
    mutationFn: () => upsertPunto(token, puntoOpen!.codigo, punto),
    onSuccess: async () => {
      setMsg(editingPunto ? 'Punto actualizado' : 'Punto de expedición guardado')
      setPuntoOpen(null)
      setPunto({ codigo: '', descripcion: '', is_active: 1 })
      setEditingPunto(false)
      await qc.invalidateQueries({ queryKey: ['establecimientos'] })
    },
    onError: (e: Error) => setErr(e instanceof ApiError ? e.message : e.message),
  })

  const togglePunto = useMutation({
    mutationFn: ({ est, p }: { est: Establecimiento; p: PuntoExpedicion }) =>
      upsertPunto(token, est.codigo, {
        codigo: p.codigo,
        descripcion: p.descripcion ?? '',
        is_active: p.is_active ? 0 : 1,
      }),
    onSuccess: async (_d, vars) => {
      setMsg(vars.p.is_active ? 'Punto inactivado' : 'Punto activado')
      await qc.invalidateQueries({ queryKey: ['establecimientos'] })
    },
    onError: (e: Error) => setErr(e instanceof ApiError ? e.message : e.message),
  })

  const establecimientos = q.data ?? []
  const iconBtn =
    'grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-cream hover:text-ink'

  const depOptions = useMemo(
    () => DEPARTAMENTOS.map((d) => ({ value: String(d.cod), label: geoLabel(d.desc) })),
    [],
  )
  const disOptions = useMemo(() => {
    const list = form.dep.cod ? distritosByDepartamento(form.dep.cod) : []
    // Si el valor actual no está en catálogo (dato legado), lo mostramos igual.
    if (form.dis?.cod && !list.some((d) => d.cod === form.dis!.cod)) {
      const legacy = findDistrito(form.dis.cod) ?? form.dis
      list.unshift({ cod: legacy.cod, desc: legacy.desc, dep: form.dep.cod })
    }
    return list.map((d) => ({ value: String(d.cod), label: geoLabel(d.desc) }))
  }, [form.dep.cod, form.dis])
  const ciuOptions = useMemo(() => {
    const list = form.dis?.cod ? ciudadesByDistrito(form.dis.cod) : []
    if (form.ciu.cod && !list.some((c) => c.cod === form.ciu.cod)) {
      const legacy = findCiudad(form.ciu.cod) ?? form.ciu
      list.unshift({ cod: legacy.cod, desc: legacy.desc, dis: form.dis?.cod ?? 0 })
    }
    return list.map((c) => ({ value: String(c.cod), label: geoLabel(c.desc) }))
  }, [form.dis, form.ciu])

  const codigoNorm = form.codigo.trim()
  const codigoDuplicado =
    !editingCodigo &&
    !!codigoNorm &&
    establecimientos.some((e) => e.codigo === codigoNorm || e.codigo === codigoNorm.padStart(3, '0'))
  const formValido =
    !!codigoNorm &&
    !!form.direccion.trim() &&
    !!form.dep.cod &&
    !!form.dis?.cod &&
    !!form.ciu.cod &&
    !codigoDuplicado

  function setDepartamento(codStr: string) {
    const cod = Number(codStr) || 0
    const dep = findDepartamento(cod)
    setForm((f) => ({
      ...f,
      dep: dep ?? { cod: 0, desc: '' },
      dis: { cod: 0, desc: '' },
      ciu: { cod: 0, desc: '' },
    }))
  }
  function setDistrito(codStr: string) {
    const cod = Number(codStr) || 0
    const dis = findDistrito(cod)
    setForm((f) => ({
      ...f,
      dis: dis ? { cod: dis.cod, desc: dis.desc } : { cod: 0, desc: '' },
      ciu: { cod: 0, desc: '' },
    }))
  }
  function setCiudad(codStr: string) {
    const cod = Number(codStr) || 0
    const ciu = findCiudad(cod) ?? CIUDADES.find((c) => c.cod === cod)
    setForm((f) => ({
      ...f,
      ciu: ciu ? { cod: ciu.cod, desc: ciu.desc } : { cod: 0, desc: '' },
    }))
  }

  return (
    <AppShell
      title="Establecimientos"
      actions={
        canEdit ? (
          <Button onClick={openNew}>+ Nuevo establecimiento</Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {msg && <SuccessAlert>{msg}</SuccessAlert>}
        {err && !editOpen && !puntoOpen && <Alert>{err}</Alert>}
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {establecimientos.length > 0 && (
        <div className={cn(panelClass, 'grid gap-6 p-6 sm:gap-8 sm:p-8')}>
          {establecimientos.map((e) => {
            const dir = [
              formatReadable(e.direccion),
              e.num_casa ? `N° ${e.num_casa}` : null,
              [formatReadable(e.ciu?.desc ?? ''), formatReadable(e.dep?.desc ?? '')]
                .filter(Boolean)
                .join(' / '),
            ]
              .filter(Boolean)
              .join(' · ')
            const geoTip = `dep ${e.dep?.cod} · dis ${e.dis?.cod ?? '—'} · ciu ${e.ciu?.cod}`
            const puntos = e.puntos ?? []

            return (
              <div
                key={e.codigo}
                className={cn(SECTION, 'flex flex-col border-b border-line/70 pb-6 last:border-0 last:pb-0')}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight text-ink">
                      {e.codigo} · {e.denominacion || 'Sin denominación'}
                    </h3>
                    <Badge className={e.is_active ? 'bg-ok/10 text-ok-strong' : 'bg-warn/10 text-warn'}>
                      {e.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button variant="ghost" className="gap-1.5 px-3" onClick={() => openEdit(e)}>
                        <IconEdit />
                        Editar
                      </Button>
                      <Button variant="soft" onClick={() => openNewPunto(e)}>
                        + Nuevo punto
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-start gap-2 text-sm text-muted">
                  <span className="mt-0.5 shrink-0 text-ink/55">
                    <IconMap />
                  </span>
                  <p className="min-w-0 leading-snug text-muted">{dir || 'Sin dirección'}</p>
                  <span className="group relative mt-0.5 shrink-0 text-muted hover:text-ink" title={geoTip}>
                    <IconInfo />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {geoTip}
                    </span>
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                        <th className="h-10 pr-3.5 font-semibold align-middle">Punto</th>
                        <th className="h-10 px-3.5 font-semibold align-middle">Descripción</th>
                        <th className="h-10 px-3.5 font-semibold align-middle">Estado</th>
                        {canEdit && (
                          <th className="h-10 pl-3.5 text-right font-semibold align-middle">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {puntos.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 4 : 3} className="h-14 align-middle text-muted">
                            Sin puntos de expedición. Agregá al menos el 001.
                          </td>
                        </tr>
                      ) : (
                        puntos.map((p) => (
                          <tr
                            key={p.codigo}
                            className="h-14 border-b border-line/60 transition-colors last:border-0 hover:bg-cream-soft"
                          >
                            <td className="pr-3.5 align-middle font-mono text-xs font-semibold text-ink">
                              {p.codigo}
                            </td>
                            <td className="px-3.5 align-middle text-ink">{p.descripcion || '—'}</td>
                            <td className="px-3.5 align-middle">
                              <Badge
                                className={
                                  p.is_active ? 'bg-ok/10 text-ok-strong' : 'bg-warn/10 text-warn'
                                }
                              >
                                {p.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            {canEdit && (
                              <td className="pl-3.5 align-middle">
                                <div className="flex items-center justify-end gap-0.5">
                                  <button
                                    type="button"
                                    title="Editar punto"
                                    aria-label="Editar punto"
                                    className={iconBtn}
                                    onClick={() => openEditPunto(e, p)}
                                  >
                                    <IconEdit />
                                  </button>
                                  <button
                                    type="button"
                                    title={p.is_active ? 'Inactivar punto' : 'Activar punto'}
                                    aria-label={p.is_active ? 'Inactivar punto' : 'Activar punto'}
                                    className={cn(iconBtn, !p.is_active && 'text-ok hover:text-ok')}
                                    disabled={togglePunto.isPending}
                                    onClick={() => togglePunto.mutate({ est: e, p })}
                                  >
                                    <IconPower />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
        )}

        {!q.isLoading && establecimientos.length === 0 && (
          <div className={cn(panelClass, 'py-10 text-center')}>
            <p className="text-sm font-medium text-ink">Todavía no hay establecimientos</p>
            <p className="mt-1 text-sm text-muted">
              Creá la sucursal 001 con la geo registrada en el RUC/SET.
            </p>
            {canEdit && (
              <Button className="mt-4" onClick={openNew}>
                + Nuevo establecimiento
              </Button>
            )}
          </div>
        )}
      </div>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editingCodigo ? 'Editar establecimiento' : 'Nuevo establecimiento'}
        widthClass="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={saveEstab.isPending}
              disabled={!formValido}
              onClick={() => saveEstab.mutate()}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">Identificación</h4>
              <p className="text-xs text-muted">Código del local y cómo se muestra en el panel.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Código"
                requiredMark
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="001"
                disabled={!!editingCodigo}
                error={codigoDuplicado ? 'Ya existe un establecimiento con este código' : undefined}
                hint={!codigoDuplicado ? 'Ej. 001, 002…' : undefined}
              />
              <TextField
                label="N° casa"
                className="sm:col-span-1"
                value={form.num_casa ?? '0'}
                onChange={(e) => setForm({ ...form, num_casa: e.target.value })}
                placeholder="0"
              />
              <TextField
                label="Teléfono"
                value={form.telefono ?? ''}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="021…"
              />
            </div>
            <TextField
              label="Denominación"
              value={form.denominacion ?? ''}
              onChange={(e) => setForm({ ...form, denominacion: e.target.value })}
              placeholder="Casa Matriz, Sucursal Centro…"
            />
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">Ubicación</h4>
              <p className="text-xs text-muted">
                Debe coincidir con la geo registrada en el RUC/SET (error 1255 si no).
              </p>
            </div>
            <TextField
              label="Dirección"
              requiredMark
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Calle, barrio, referencia…"
            />
            <SearchSelect
              label="Departamento"
              requiredMark
              value={form.dep.cod ? String(form.dep.cod) : ''}
              onChange={setDepartamento}
              options={depOptions}
              placeholder="Elegí un departamento"
            />
            <SearchSelect
              label="Distrito"
              requiredMark
              value={form.dis?.cod ? String(form.dis.cod) : ''}
              onChange={setDistrito}
              options={disOptions}
              placeholder={form.dep.cod ? 'Elegí un distrito' : 'Primero elegí departamento'}
              disabled={!form.dep.cod}
            />
            <SearchSelect
              label="Ciudad"
              requiredMark
              value={form.ciu.cod ? String(form.ciu.cod) : ''}
              onChange={setCiudad}
              options={ciuOptions}
              placeholder={form.dis?.cod ? 'Elegí una ciudad' : 'Primero elegí distrito'}
              disabled={!form.dis?.cod}
            />
          </section>

          {err && <Alert>{err}</Alert>}
        </div>
      </Drawer>

      <Drawer
        open={!!puntoOpen}
        onClose={() => setPuntoOpen(null)}
        title={
          editingPunto
            ? `Editar punto · est. ${puntoOpen?.codigo ?? ''}`
            : `Nuevo punto · est. ${puntoOpen?.codigo ?? ''}`
        }
        widthClass="max-w-[380px]"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPuntoOpen(null)}>
              Cancelar
            </Button>
            <Button
              loading={savePunto.isPending}
              disabled={!/^\d{3}$/.test(punto.codigo.trim())}
              onClick={() => savePunto.mutate()}
            >
              {editingPunto ? 'Guardar cambios' : 'Guardar punto'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Código"
            requiredMark
            value={punto.codigo}
            onChange={(e) => setPunto({ ...punto, codigo: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder="002"
            disabled={editingPunto}
            inputMode="numeric"
            maxLength={3}
            hint="Debe contener 3 dígitos numéricos (ej. 002)."
            error={
              punto.codigo && !/^\d{3}$/.test(punto.codigo)
                ? 'Ingresá exactamente 3 dígitos'
                : undefined
            }
          />
          <TextField
            label="Descripción"
            value={punto.descripcion ?? ''}
            onChange={(e) => setPunto({ ...punto, descripcion: e.target.value })}
            placeholder="Ej. Caja principal, Terminal móvil…"
            hint="Nombre interno para identificar la caja o punto."
          />
        </div>
        {err && (
          <div className="mt-4">
            <Alert>{err}</Alert>
          </div>
        )}
      </Drawer>
    </AppShell>
  )
}
