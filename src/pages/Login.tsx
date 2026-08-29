import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AuthCta, AuthLayout } from '@/components/AuthLayout'
import { Alert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface LoginForm {
  email: string
  password: string
}

function IconEye({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.5 10.7a3 3 0 004.1 4.1M9.9 5.6A10.8 10.8 0 0112 5.4c5.2 0 9.3 3.6 10.5 6.6a11.3 11.3 0 01-4.1 4.7M6.6 6.8C4 8.5 2.4 10.7 1.5 12c1.1 2.9 4.9 6.6 10.5 6.6 1.3 0 2.5-.2 3.6-.6"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.2 12.2C3.5 9 7.4 5.5 12 5.5s8.5 3.5 9.8 6.7c-1.3 3.2-5.2 6.6-9.8 6.6S3.5 15.4 2.2 12.2z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  )
}

export default function Login() {
  const { login, selectClient } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
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
      eyebrow="Acceso"
      title="Entrá al panel"
      pageTitle="Iniciar sesión"
      subtitle="Email y contraseña de tu cuenta etick."
      altText="¿No tenés cuenta?"
      altHref="/registro"
      altLabel="Crear cuenta"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
          type={showPassword ? 'text' : 'password'}
          placeholder="Tu contraseña"
          autoComplete="current-password"
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
            >
              <IconEye off={showPassword} />
            </button>
          }
          {...register('password', { required: 'Ingresá tu contraseña' })}
        />

        <AuthCta loading={isSubmitting} className="mt-1">
          Ingresar
        </AuthCta>
      </form>
    </AuthLayout>
  )
}
