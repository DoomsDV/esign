import { useTheme } from '@/lib/theme'

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" className="stroke-current" strokeWidth="1.7" />
      <path
        d="M12 3.5v1.8M12 18.7v1.8M4.9 4.9l1.3 1.3M17.8 17.8l1.3 1.3M3.5 12h1.8M18.7 12h1.8M4.9 19.1l1.3-1.3M17.8 6.2l1.3-1.3"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15.2 4.1A8.2 8.2 0 1 0 20 14.6 6.4 6.4 0 0 1 15.2 4.1Z"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ??
        'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink transition-colors duration-150 hover:bg-cream active:bg-cream'
      }
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={dark}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  )
}
