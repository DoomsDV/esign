import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Drawer, IconSave, Menu, PageHeader, SearchSelect, SuccessAlert, TextField, panelClass } from '@/components/ui'
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

const ESTABLECIMIENTOS_TIP =
  'Cada establecimiento define la geo del local emisor (dEst). Los puntos son las cajas desde las que emitís.'

/** Tarjeta individual por establecimiento. */
const EST_CARD = panelClass

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

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
    <AppShell title="Establecimientos">
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        {msg && <SuccessAlert>{msg}</SuccessAlert>}
        {err && !editOpen && !puntoOpen && <Alert>{err}</Alert>}
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {!q.isLoading && (
          <PageHeader
            compactOnMobile
            title="Sucursales y puntos de expedición"
            description={ESTABLECIMIENTOS_TIP}
            action={
              canEdit && establecimientos.length > 0 ? (
                <Button onClick={openNew} className="w-full gap-1.5 sm:w-auto">
                  <IconPlus />
                  Nuevo establecimiento
                </Button>
              ) : undefined
            }
          />
        )}

        {establecimientos.length > 0 && (
          <div className="space-y-4">
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
              const puntos = e.puntos ?? []

              const puntoActions = (p: PuntoExpedicion) =>
                canEdit ? (
                  <div className="flex shrink-0 items-center justify-end gap-0.5">
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
                ) : null

              return (
                <article key={e.codigo} className={EST_CARD}>
                  <div className="flex flex-col gap-3 px-5 py-5 sm:gap-4 sm:px-6 sm:py-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 text-base font-semibold tracking-tight text-ink">
                        <span className="font-mono text-sm tabular-nums text-muted">{e.codigo}</span>
                        <span className="mx-2 text-muted/40">·</span>
                        {e.denominacion || 'Sin denominación'}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge
                          className={cn(
                            e.is_active ? 'bg-ok/10 text-ok-strong' : 'bg-warn/10 text-warn',
                          )}
                        >
                          {e.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {canEdit && (
                          <Menu
                            items={[
                              { label: 'Editar', onClick: () => openEdit(e), icon: <IconEdit /> },
                              { label: 'Nuevo punto', onClick: () => openNewPunto(e), icon: <IconPlus /> },
                            ]}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <span className="mt-0.5 flex w-[15px] shrink-0 items-start justify-center text-brand-600/70">
                        <IconMap />
                      </span>
                      <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
                        {dir || 'Sin dirección'}
                      </p>
                    </div>

                  </div>

                  <div className="border-t border-line/60" />

                  {/* Móvil: lista compacta sin encabezados de tabla */}
                  <div className="px-5 py-3 sm:hidden">
                    {puntos.length === 0 ? (
                      <p className="py-2 text-sm text-muted">
                        Sin puntos de expedición. Agregá al menos el 001.
                      </p>
                    ) : (
                      <ul className="divide-y divide-line/40">
                        {puntos.map((p) => (
                          <li key={p.codigo} className="flex items-center gap-2 py-3">
                            <p className="min-w-0 flex-1 text-sm text-ink">
                              <span className="font-mono text-xs font-semibold tabular-nums text-muted">
                                {p.codigo}
                              </span>
                              <span className="mx-1.5 text-muted/40">·</span>
                              {p.descripcion || '—'}
                            </p>
                            <Badge
                              className={cn(
                                'shrink-0',
                                p.is_active ? 'bg-ok/10 text-ok-strong' : 'bg-warn/10 text-warn',
                              )}
                            >
                              {p.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            {puntoActions(p)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Desktop: tabla clásica */}
                  <div className="hidden overflow-x-auto px-4 py-2 sm:block sm:px-5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line/60 text-left text-xs font-medium text-muted">
                          <th className="h-10 pr-3.5 align-middle">Punto</th>
                          <th className="h-10 px-3.5 align-middle">Descripción</th>
                          <th className="h-10 px-3.5 align-middle">Estado</th>
                          {canEdit && (
                            <th className="h-10 pl-3.5 text-right align-middle">Acciones</th>
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
                            <tr key={p.codigo} className="h-14 border-b border-line/40 last:border-0">
                              <td className="pr-3.5 align-middle font-mono text-xs font-semibold tabular-nums text-ink">
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
                                <td className="pl-3.5 align-middle">{puntoActions(p)}</td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!q.isLoading && establecimientos.length === 0 && (
          <div className={cn(panelClass, 'px-6 py-12 text-center')}>
            <p className="text-base font-semibold text-ink">Todavía no hay establecimientos</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Creá la sucursal 001 con la geo registrada en el RUC/SET. Cada local necesita al menos un punto de
              expedición (caja 001).
            </p>
            {canEdit && (
              <Button className="mt-6 w-full gap-1.5 sm:w-auto" onClick={openNew}>
                <IconPlus />
                Nuevo establecimiento
              </Button>
            )}
          </div>
        )}
      </div>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editingCodigo ? 'Editar establecimiento' : 'Nuevo establecimiento'}
        size="default"
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
              <IconSave />
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
        size="narrow"
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
              <IconSave />
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
