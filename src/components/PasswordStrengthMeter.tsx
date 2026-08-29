import { analyzePassword, PASSWORD_REQUIREMENTS } from '@/lib/passwordStrength'
import { cn } from '@/lib/cn'

const BAR_COLORS: Record<ReturnType<typeof analyzePassword>['strength'], string> = {
  empty: 'bg-line',
  weak: 'bg-danger',
  fair: 'bg-warn',
  good: 'bg-brand-400',
  strong: 'bg-ok',
}

const LABEL_COLORS: Record<ReturnType<typeof analyzePassword>['strength'], string> = {
  empty: 'text-muted',
  weak: 'text-danger',
  fair: 'text-warn',
  good: 'text-brand-700',
  strong: 'text-ok-strong',
}

export function PasswordStrengthMeter({ password, className }: { password: string; className?: string }) {
  const analysis = analyzePassword(password)

  if (!password) return null

  const filledSegments = analysis.strength === 'empty' ? 0 : Math.max(1, analysis.score)

  return (
    <div
      className={cn('space-y-2.5 rounded-xl border border-line/70 bg-cream-soft/50 px-3 py-2.5', className)}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">Seguridad de la contraseña</p>
        <span className={cn('text-xs font-semibold', LABEL_COLORS[analysis.strength])}>
          {analysis.label}
        </span>
      </div>

      <div className="flex gap-1" role="progressbar" aria-valuenow={filledSegments} aria-valuemin={0} aria-valuemax={5}>
        {PASSWORD_REQUIREMENTS.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < filledSegments ? BAR_COLORS[analysis.strength] : 'bg-line',
            )}
          />
        ))}
      </div>

      <ul className="grid gap-1 sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map(({ key, label }) => {
          const met = analysis.criteria[key]
          return (
            <li key={key} className="flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  'grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  met ? 'bg-ok/15 text-ok-strong' : 'bg-line text-muted',
                )}
                aria-hidden
              >
                {met ? '✓' : '·'}
              </span>
              <span className={cn(met ? 'text-ink' : 'text-muted')}>{label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
