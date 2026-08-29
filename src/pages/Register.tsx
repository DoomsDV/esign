import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AuthCta, AuthLayout } from '@/components/AuthLayout'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { Alert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { analyzePassword } from '@/lib/passwordStrength'

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>()

  const passwordValue = watch('password') ?? ''

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
    <AuthLayout
      compact
      eyebrow="Alta"
      title="Crear cuenta"
      subtitle="Datos de tu negocio y de quien va a administrar el panel."
      altText="¿Ya tenés cuenta?"
      altHref="/login"
      altLabel="Iniciar sesión"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5">
        {serverError && <Alert>{serverError}</Alert>}

        <TextField
          label="Razón social"
          placeholder="Mi Empresa SA"
          error={errors.business_name?.message}
          {...register('business_name', { required: 'Ingresá la razón social' })}
        />

        <div className="grid grid-cols-3 gap-2.5">
          <div className="col-span-2">
            <TextField
              label="RUC"
              placeholder="80012345"
              error={errors.ruc?.message}
              {...register('ruc', { required: 'Ingresá el RUC' })}
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

        <div className="grid grid-cols-2 gap-2.5">
          <TextField label="Nombre" {...register('first_name')} />
          <TextField label="Apellido" {...register('last_name')} />
        </div>

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
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Ingresá una contraseña',
            validate: (value) =>
              analyzePassword(value).isAcceptable ||
              'Usá al menos 8 caracteres y 3 tipos: mayúscula, minúscula, número o símbolo',
          })}
        />
        <PasswordStrengthMeter password={passwordValue} className="auth-meter" />

        <AuthCta
          loading={isSubmitting}
          disabled={passwordValue.length > 0 && !analyzePassword(passwordValue).isAcceptable}
          className="mt-1 py-3"
        >
          Crear cuenta
        </AuthCta>
      </form>
    </AuthLayout>
  )
}
