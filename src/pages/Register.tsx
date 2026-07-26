import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, Button, Card, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface RegisterForm {
  business_name: string
  ruc: string
  dv: string
  first_name: string
  last_name: string
  email: string
  password: string
}

export default function Register() {
  const { register: registerAccount, login, selectClient } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>()

  async function onSubmit(values: RegisterForm) {
    setServerError(null)
    try {
      await registerAccount({
        email: values.email.trim(),
        password: values.password,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        business_name: values.business_name.trim(),
        ruc: values.ruc.trim(),
        dv: values.dv ? Number(values.dv) : undefined,
      })
      // Auto-login tras el alta.
      const res = await login(values.email.trim(), values.password)
      if (res.clients.length) {
        await selectClient(res.user_id, res.clients[0])
        navigate('/', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'No se pudo crear la cuenta.')
    }
  }

  return (
    <AuthLayout altText="Ya tenes cuenta?" altHref="/login" altLabel="Iniciar sesion">
      <Card className="w-full max-w-lg px-8 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-ink">Crear cuenta</h1>
          <p className="mt-2 text-sm text-muted">
            Registra tu negocio para empezar a emitir documentos electronicos.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
          {serverError && <Alert>{serverError}</Alert>}

          <TextField
            label="Razon social"
            placeholder="Mi Empresa SA"
            error={errors.business_name?.message}
            {...register('business_name', { required: 'Ingresa la razon social' })}
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <TextField
                label="RUC"
                placeholder="80012345"
                error={errors.ruc?.message}
                {...register('ruc', { required: 'Ingresa el RUC' })}
              />
            </div>
            <TextField
              label="DV"
              placeholder="6"
              inputMode="numeric"
              error={errors.dv?.message}
              {...register('dv')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Nombre" placeholder="Daniel" {...register('first_name')} />
            <TextField label="Apellido" placeholder="Villasanti" {...register('last_name')} />
          </div>

          <TextField
            label="Email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Ingresa tu email' })}
          />
          <TextField
            label="Contrasena"
            type="password"
            placeholder="Minimo 8 caracteres"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Ingresa una contrasena',
              minLength: { value: 8, message: 'Minimo 8 caracteres' },
            })}
          />

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full py-3">
            Crear cuenta
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Ya tenes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Iniciar sesion
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}
