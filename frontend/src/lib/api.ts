const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export interface AlternativaCimentacion {
  tipo_cimentacion: string
  capacidad_carga_admisible_ton_m2: number
  profundidad_desplante_m: number
  ancho_cimentacion_m: number
  condiciones_calculo: string
  requiere_mejoramiento: boolean
  descripcion_mejoramiento: string
}

export interface Store {
  id: number
  nombre: string | null
  ciudad: string | null
  año: number
  latitud: number | null
  longitud: number | null
  
  // Identificación
  nombre_obra: string | null
  ubicacion_detallada: string | null
  laboratorio: string | null
  fecha_reporte: string | null
  
  // Exploración de campo
  cantidad_sondeos: string | null
  metodologia: string | null
  profundidad_max: number | null
  presencia_naf: boolean
  profundidad_naf: number | null
  
  // Caracterización del suelo
  tipo_suelo: string | null
  clasificacion_sucs: string | null
  consistencia_densidad: string | null
  limite_liquido: number | null
  indice_plasticidad: number | null
  contenido_agua: number | null
  
  // Cimentación
  alternativas_cimentacion: AlternativaCimentacion[]
  tipo_cimentacion: string | null
  qadm: number | null
  profundidad_desplante: number | null
  justificacion: string | null
  mejoramiento_requerido: boolean
  detalles_mejoramiento: string | null
  
  // Análisis sísmico
  zona_sismica: string | null
  coeficiente_sismico: string | null
  clasificacion_sitio: string | null
  
  // Observaciones
  observaciones_criticas: string | null
}

export interface Metadata {
  total_stores: number
  cities: string[]
  years: number[]
  stores_by_city: Record<string, number>
}

export interface DashboardData {
  stores: Store[]
  metadata: Metadata
}

export async function fetchStores(params?: {
  year?: number[]
  city?: string[]
  errors_only?: boolean
  search?: string
}): Promise<DashboardData> {
  const url = new URL(`${API_BASE}/api/stores`)
  
  if (params?.year?.length) {
    params.year.forEach(y => url.searchParams.append('year', y.toString()))
  }
  if (params?.city?.length) {
    params.city.forEach(c => url.searchParams.append('city', c))
  }
  if (params?.errors_only) {
    url.searchParams.set('errors_only', 'true')
  }
  if (params?.search) {
    url.searchParams.set('search', params.search)
  }
  
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  })
  if (!res.ok) throw new Error('Failed to fetch stores')
  return res.json()
}


export async function fetchCities(): Promise<{ cities: string[] }> {
  const res = await fetch(`${API_BASE}/api/cities`)
  if (!res.ok) throw new Error('Failed to fetch cities')
  return res.json()
}

export async function fetchYears(): Promise<{ years: number[] }> {
  const res = await fetch(`${API_BASE}/api/years`)
  if (!res.ok) throw new Error('Failed to fetch years')
  return res.json()
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}
