import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, Button, TextField } from '@/components/ui'
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
        setServerError('El usuario no pertenece a ningún negocio.')
        return
      }
      if (res.clients.length === 1) {
        await selectClient(res.user_id, res.clients[0])
        navigate('/', { replace: true })
        return
      }
      navigate('/seleccionar-negocio', { state: { userId: res.user_id, clients: res.clients } })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.')
    }
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresá tus datos para acceder a tu panel de facturación electrónica."
      altText="¿No tenés cuenta?"
      altHref="/registro"
      altLabel="Crear cuenta"
      panelQuote="Emití, firma y consulta documentos electrónicos SIFEN desde un solo lugar. Claro, rápido y listo para tu negocio."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && <Alert>{serverError}</Alert>}

        <TextField
          label="Email"
          type="email"
          placeholder="tu@empresa.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Ingresá tu email' })}
        />
        <TextField
          label="Contraseña"
          type="password"
          placeholder="********"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Ingresá tu contraseña' })}
        />

        <div className="text-right">
          <span className="text-xs font-medium text-muted">¿Tenés problemas para ingresar?</span>
        </div>

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full py-3">
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  )
}
