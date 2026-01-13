import type { Feature, Polygon, Position } from 'geojson'

export interface StorePoint {
  id: number
  nombre: string
  lat: number
  lon: number
  tipo_suelo: string | null
  clasificacion_sucs: string | null
  qadm: number | null
  profundidad_desplante: number | null
  presencia_naf: boolean
  profundidad_naf: number | null
  tipo_cimentacion: string | null
  mejoramiento_requerido: boolean
  detalles_mejoramiento: string | null
  ciudad: string | null
  año: number | null
  observaciones_criticas: string | null
  isInferred?: boolean
  origin?: {
    isInferred: boolean
    inferredAt?: string
    inferredFrom?: (number | string)[]
    confidenceScore?: number
  }
}

export interface VoronoiCell {
  storeId: number
  storeName: string
  polygon: Feature<Polygon>
  centroid: Position
  area: number
  isInferred?: boolean
}

export interface NaturalNeighborWeight {
  storeId: number
  storeName: string
  weight: number
  distance: number
  stolenArea: number
  storeData: StorePoint
}

export interface VoronoiAnalysisResult {
  parentStore: StorePoint | null
  parentDistance: number
  naturalNeighbors: NaturalNeighborWeight[]
  confidenceScore: number
  isWithinNetwork: boolean
  voronoiCells: VoronoiCell[]
  newPointCell: Feature<Polygon> | null
}

export interface HeterogeneityAlert {
  type: 'high' | 'medium' | 'low'
  message: string
  details: {
    field: string
    values: { store: string; value: number | string }[]
    variance: number
  }[]
}

export interface InferredSoilData {
  qadm_estimado: number | null
  qadm_min: number | null
  qadm_max: number | null
  tipo_suelo: string | null
  clasificacion_sucs: string | null
  profundidad_desplante: number | null
  tipo_cimentacion_sugerido: string | null
  presencia_naf_probable: boolean
  profundidad_naf_estimada: number | null
  mejoramiento_probable: boolean
  observaciones: string[]
}
