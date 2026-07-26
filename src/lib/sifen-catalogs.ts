// Catálogos SIFEN de uso frecuente en el panel (Manual Técnico v150).
export const TIPOS_REGIMEN = [
  { cod: '1', desc: 'Régimen de Turismo' },
  { cod: '2', desc: 'Importador' },
  { cod: '3', desc: 'Exportador' },
  { cod: '4', desc: 'Maquila' },
  { cod: '5', desc: 'Ley N° 60/90' },
  { cod: '6', desc: 'Régimen del Pequeño Productor' },
  { cod: '7', desc: 'Régimen del Mediano Productor' },
  { cod: '8', desc: 'Régimen Contable' },
] as const

/** Actividades económicas frecuentes / validadas en homologación.
 *  La descripción debe enviarse EXACTA al SET (error 1261/1262 si no coincide). */
export const ACTIVIDADES_ECONOMICAS = [
  {
    cod: '74909',
    desc: 'OTRAS ACTIVIDADES PROFESIONALES, CIENTÍFICAS Y TÉCNICAS N.C.P.',
  },
  {
    cod: '62010',
    desc: 'ACTIVIDADES DE PROGRAMACIÓN INFORMÁTICA',
  },
  {
    cod: '62020',
    desc: 'ACTIVIDADES DE CONSULTORÍA DE INFORMÁTICA Y DE GESTIÓN DE INSTALACIONES INFORMÁTICAS',
  },
  {
    cod: '62090',
    desc: 'OTRAS ACTIVIDADES DE TECNOLOGÍA DE LA INFORMACIÓN Y DE SERVICIOS INFORMÁTICOS',
  },
  {
    cod: '63110',
    desc: 'PROCESAMIENTO DE DATOS, HOSPEDAJE Y ACTIVIDADES CONEXAS',
  },
  {
    cod: '70200',
    desc: 'ACTIVIDADES DE CONSULTORÍA DE GESTIÓN',
  },
  {
    cod: '47111',
    desc: 'COMERCIO AL POR MENOR EN ALMACENES NO ESPECIALIZADOS CON PREDOMINIO DE ALIMENTOS, BEBIDAS O TABACO',
  },
  {
    cod: '47411',
    desc: 'COMERCIO AL POR MENOR DE COMPUTADORAS Y EQUIPO PERIFÉRICO',
  },
] as const

export function regimenLabel(cod: string): string {
  const hit = TIPOS_REGIMEN.find((r) => r.cod === cod)
  return hit ? `${hit.cod} — ${hit.desc}` : cod
}

export function actividadLabel(cod: string, desc: string): string {
  return `${cod} — ${desc}`
}
