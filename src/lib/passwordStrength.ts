export interface PasswordCriteria {
  minLength: boolean
  hasLower: boolean
  hasUpper: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordAnalysis {
  criteria: PasswordCriteria
  strength: PasswordStrengthLevel
  score: number
  label: string
  isAcceptable: boolean
}

const SPECIAL = /[^A-Za-z0-9]/

export function analyzePassword(password: string): PasswordAnalysis {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: SPECIAL.test(password),
  }

  if (!password) {
    return {
      criteria,
      strength: 'empty',
      score: 0,
      label: '',
      isAcceptable: false,
    }
  }

  const score = Object.values(criteria).filter(Boolean).length

  let strength: PasswordStrengthLevel = 'weak'
  let label = 'Débil'

  if (score <= 2) {
    strength = 'weak'
    label = 'Débil'
  } else if (score === 3) {
    strength = 'fair'
    label = 'Regular'
  } else if (score === 4) {
    strength = 'good'
    label = 'Buena'
  } else {
    strength = 'strong'
    label = 'Fuerte'
  }

  // Mínimo: 8 caracteres + al menos 3 tipos de caracteres.
  const typesMet = [criteria.hasLower, criteria.hasUpper, criteria.hasNumber, criteria.hasSpecial].filter(
    Boolean,
  ).length
  const isAcceptable = criteria.minLength && typesMet >= 3

  return { criteria, strength, score, label, isAcceptable }
}

export const PASSWORD_REQUIREMENTS = [
  { key: 'minLength' as const, label: 'Al menos 8 caracteres' },
  { key: 'hasLower' as const, label: 'Una minúscula' },
  { key: 'hasUpper' as const, label: 'Una mayúscula' },
  { key: 'hasNumber' as const, label: 'Un número' },
  { key: 'hasSpecial' as const, label: 'Un símbolo' },
] as const
