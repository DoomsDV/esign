import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, Button, Card, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const { login, selectClient } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>()

  async function onSubmit(values: LoginForm) {
    setServerError(null)
    try {
      const res = await login(values.email.trim(), values.password)
      if (!res.clients.length) {
        setServerError('El usuario no pertenece a ningun negocio.')
        return
      }
      if (res.clients.length === 1) {
        await selectClient(res.user_id, res.clients[0])
        navigate('/', { replace: true })
        return
      }
      navigate('/seleccionar-negocio', { state: { userId: res.user_id, clients: res.clients } })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesion.')
    }
  }

  return (
    <AuthLayout altText="No tenes cuenta?" altHref="/registro" altLabel="Crear cuenta">
      <Card className="w-full max-w-md px-8 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-ink">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-muted">
            Ingresa tus datos para acceder a tu panel de facturacion.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
          {serverError && <Alert>{serverError}</Alert>}

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
            placeholder="********"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Ingresa tu contrasena' })}
          />

          <div className="text-right">
            <span className="text-xs font-medium text-muted">Tenes problemas para ingresar?</span>
          </div>

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full py-3">
            Ingresar
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          No tenes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand-600 hover:text-brand-700">
            Crear cuenta
          </Link>
        </p>
      </Card>
    </AuthLayout>
  )
}
