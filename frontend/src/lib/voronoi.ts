import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, Point, Polygon, Position } from 'geojson'

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

const MEXICO_BBOX: [number, number, number, number] = [-118.5, 14.5, -86.5, 32.8]

export function createVoronoiDiagram(
  stores: StorePoint[],
  bbox: [number, number, number, number] = MEXICO_BBOX
): FeatureCollection<Polygon> {
  const points = turf.featureCollection(
    stores.map(store => 
      turf.point([store.lon, store.lat], { 
        id: store.id, 
        nombre: store.nombre,
        isInferred: store.origin?.isInferred || false
      })
    )
  )

  const voronoi = turf.voronoi(points, { bbox })
  
  if (!voronoi) {
    return turf.featureCollection([])
  }

  voronoi.features = voronoi.features.map((feature: Feature<Polygon> | null, index: number) => {
    if (feature && stores[index]) {
      feature.properties = {
        ...feature.properties,
        storeId: stores[index].id,
        storeName: stores[index].nombre,
        qadm: stores[index].qadm,
        tipo_suelo: stores[index].tipo_suelo,
        isInferred: stores[index].origin?.isInferred || false
      }
    }
    return feature
  }).filter((f: Feature<Polygon> | null) => f !== null) as Feature<Polygon>[]

  return voronoi as FeatureCollection<Polygon>
}

export function findContainingCell(
  point: [number, number],
  voronoiCells: FeatureCollection<Polygon>
): Feature<Polygon> | null {
  const pt = turf.point(point)
  
  for (const cell of voronoiCells.features) {
    if (cell && turf.booleanPointInPolygon(pt, cell)) {
      return cell
    }
  }
  
  return null
}

export function findNearestStore(
  point: [number, number],
  stores: StorePoint[]
): { store: StorePoint; distance: number } | null {
  if (stores.length === 0) return null

  let nearestStore = stores[0]
  let minDistance = turf.distance(
    turf.point(point),
    turf.point([stores[0].lon, stores[0].lat]),
    { units: 'kilometers' }
  )

  for (let i = 1; i < stores.length; i++) {
    const dist = turf.distance(
      turf.point(point),
      turf.point([stores[i].lon, stores[i].lat]),
      { units: 'kilometers' }
    )
    if (dist < minDistance) {
      minDistance = dist
      nearestStore = stores[i]
    }
  }

  return { store: nearestStore, distance: minDistance }
}

export function calculateNaturalNeighborWeights(
  newPoint: [number, number],
  stores: StorePoint[],
  bbox: [number, number, number, number] = MEXICO_BBOX
): NaturalNeighborWeight[] {
  if (stores.length < 3) return []

  const originalVoronoi = createVoronoiDiagram(stores, bbox)
  
  const originalAreas = new Map<number, number>()
  originalVoronoi.features.forEach(cell => {
    if (cell && cell.properties?.storeId) {
      originalAreas.set(cell.properties.storeId, turf.area(cell))
    }
  })

  const newStore: StorePoint = {
    id: -1,
    nombre: 'Nueva Tienda',
    lat: newPoint[1],
    lon: newPoint[0],
    tipo_suelo: null,
    clasificacion_sucs: null,
    qadm: null,
    profundidad_desplante: null,
    presencia_naf: false,
    profundidad_naf: null,
    tipo_cimentacion: null,
    mejoramiento_requerido: false,
    detalles_mejoramiento: null,
    ciudad: null,
    año: new Date().getFullYear(),
    observaciones_criticas: null,
    origin: { isInferred: true }
  }

  const storesWithNew = [...stores, newStore]
  const newVoronoi = createVoronoiDiagram(storesWithNew, bbox)

  const newAreas = new Map<number, number>()
  let newPointCellArea = 0
  
  newVoronoi.features.forEach(cell => {
    if (cell && cell.properties?.storeId !== undefined) {
      const area = turf.area(cell)
      if (cell.properties.storeId === -1) {
        newPointCellArea = area
      } else {
        newAreas.set(cell.properties.storeId, area)
      }
    }
  })

  const weights: NaturalNeighborWeight[] = []
  let totalStolenArea = 0

  stores.forEach(store => {
    const originalArea = originalAreas.get(store.id as number) || 0
    const newArea = newAreas.get(store.id as number) || 0
    const stolenArea = Math.max(0, originalArea - newArea)
    
    if (stolenArea > 0) {
      totalStolenArea += stolenArea
      const distance = turf.distance(
        turf.point(newPoint),
        turf.point([store.lon, store.lat]),
        { units: 'kilometers' }
      )
      
      weights.push({
        storeId: store.id,
        storeName: store.nombre,
        weight: 0,
        distance,
        stolenArea,
        storeData: store
      })
    }
  })

  if (totalStolenArea > 0) {
    weights.forEach(w => {
      w.weight = w.stolenArea / totalStolenArea
    })
  }

  weights.sort((a, b) => b.weight - a.weight)

  return weights
}

export function analyzeNewStoreLocation(
  newPoint: [number, number],
  stores: StorePoint[],
  bbox: [number, number, number, number] = MEXICO_BBOX
): VoronoiAnalysisResult {
  if (stores.length === 0) {
    return {
      parentStore: null,
      parentDistance: 0,
      naturalNeighbors: [],
      confidenceScore: 0,
      isWithinNetwork: false,
      voronoiCells: [],
      newPointCell: null
    }
  }

  const voronoiDiagram = createVoronoiDiagram(stores, bbox)
  
  const containingCell = findContainingCell(newPoint, voronoiDiagram)
  
  const nearest = findNearestStore(newPoint, stores)
  
  let parentStore: StorePoint | null = null
  
  if (containingCell && containingCell.properties?.storeId) {
    parentStore = stores.find(s => s.id === containingCell.properties?.storeId) || null
  }
  
  if (!parentStore && nearest) {
    parentStore = nearest.store
  }

  const naturalNeighbors = calculateNaturalNeighborWeights(newPoint, stores, bbox)

  let confidenceScore = 0
  if (parentStore && nearest) {
    const maxInfluenceDistance = 50
    const distanceFactor = Math.max(0, 1 - (nearest.distance / maxInfluenceDistance))
    
    const neighborConsistency = naturalNeighbors.length > 0 
      ? naturalNeighbors[0].weight 
      : 0
    
    confidenceScore = (distanceFactor * 0.6 + neighborConsistency * 0.4) * 100
  }

  const voronoiCells: VoronoiCell[] = voronoiDiagram.features
    .filter(f => f !== null)
    .map(cell => ({
      storeId: cell.properties?.storeId || 0,
      storeName: cell.properties?.storeName || '',
      polygon: cell,
      centroid: turf.centroid(cell).geometry.coordinates,
      area: turf.area(cell),
      isInferred: cell.properties?.isInferred || false
    }))

  let newPointCell: Feature<Polygon> | null = null
  if (stores.length >= 3) {
    const storesWithNew = [...stores, {
      id: -1,
      nombre: 'Nueva Tienda',
      lat: newPoint[1],
      lon: newPoint[0],
      tipo_suelo: null,
      clasificacion_sucs: null,
      qadm: null,
      profundidad_desplante: null,
      presencia_naf: false,
      profundidad_naf: null,
      tipo_cimentacion: null,
      mejoramiento_requerido: false,
      detalles_mejoramiento: null,
      ciudad: null,
      año: new Date().getFullYear(),
      observaciones_criticas: null,
      origin: { isInferred: true }
    }]
    const newVoronoi = createVoronoiDiagram(storesWithNew, bbox)
    newPointCell = newVoronoi.features.find(f => f?.properties?.storeId === -1) || null
  }

  return {
    parentStore,
    parentDistance: nearest?.distance || 0,
    naturalNeighbors,
    confidenceScore,
    isWithinNetwork: containingCell !== null,
    voronoiCells,
    newPointCell
  }
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

export function checkHeterogeneity(
  neighbors: NaturalNeighborWeight[]
): HeterogeneityAlert | null {
  if (neighbors.length < 2) return null

  const alerts: HeterogeneityAlert['details'] = []

  const qadmValues = neighbors
    .filter(n => n.storeData.qadm !== null)
    .map(n => ({ store: n.storeName, value: n.storeData.qadm! }))

  if (qadmValues.length >= 2) {
    const values = qadmValues.map(v => v.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const variance = range / avg

    if (variance > 0.5) {
      alerts.push({
        field: 'Capacidad de Carga Admisible (Qadm)',
        values: qadmValues,
        variance
      })
    }
  }

  const soilTypes = neighbors
    .filter(n => n.storeData.tipo_suelo !== null)
    .map(n => ({ store: n.storeName, value: n.storeData.tipo_suelo! }))

  if (soilTypes.length >= 2) {
    const uniqueTypes = new Set(soilTypes.map(s => s.value))
    if (uniqueTypes.size > 1) {
      alerts.push({
        field: 'Tipo de Suelo',
        values: soilTypes,
        variance: uniqueTypes.size / soilTypes.length
      })
    }
  }

  if (alerts.length === 0) return null

  const maxVariance = Math.max(...alerts.map(a => a.variance))
  let alertType: 'high' | 'medium' | 'low' = 'low'
  
  if (maxVariance > 0.7) alertType = 'high'
  else if (maxVariance > 0.4) alertType = 'medium'

  return {
    type: alertType,
    message: alertType === 'high'
      ? '⚠️ ALERTA CRÍTICA: Alta variabilidad en las condiciones del suelo de tiendas vecinas. Se recomienda estudio de mecánica de suelos obligatorio.'
      : alertType === 'medium'
      ? '⚡ PRECAUCIÓN: Variabilidad moderada detectada. Considerar estudio complementario.'
      : 'ℹ️ Condiciones relativamente homogéneas en la zona.',
    details: alerts
  }
}

export interface InferredSoilData {
  tipo_suelo: string | null
  clasificacion_sucs: string | null
  qadm_estimado: number | null
  qadm_min: number | null
  qadm_max: number | null
  profundidad_desplante: number | null
  tipo_cimentacion_sugerido: string | null
  presencia_naf_probable: boolean
  profundidad_naf_estimada: number | null
  mejoramiento_probable: boolean
  observaciones: string[]
}

export function inferSoilData(
  neighbors: NaturalNeighborWeight[]
): InferredSoilData {
  const result: InferredSoilData = {
    tipo_suelo: null,
    clasificacion_sucs: null,
    qadm_estimado: null,
    qadm_min: null,
    qadm_max: null,
    profundidad_desplante: null,
    tipo_cimentacion_sugerido: null,
    presencia_naf_probable: false,
    profundidad_naf_estimada: null,
    mejoramiento_probable: false,
    observaciones: []
  }

  if (neighbors.length === 0) return result

  const qadmValues = neighbors
    .filter(n => n.storeData.qadm !== null)
    .map(n => ({ value: n.storeData.qadm!, weight: n.weight }))

  if (qadmValues.length > 0) {
    let weightedSum = 0
    let totalWeight = 0
    qadmValues.forEach(({ value, weight }) => {
      weightedSum += value * weight
      totalWeight += weight
    })
    result.qadm_estimado = Math.round((weightedSum / totalWeight) * 10) / 10
    result.qadm_min = Math.min(...qadmValues.map(v => v.value))
    result.qadm_max = Math.max(...qadmValues.map(v => v.value))
  }

  const profDesplante = neighbors
    .filter(n => n.storeData.profundidad_desplante !== null)
    .map(n => ({ value: n.storeData.profundidad_desplante!, weight: n.weight }))

  if (profDesplante.length > 0) {
    let weightedSum = 0
    let totalWeight = 0
    profDesplante.forEach(({ value, weight }) => {
      weightedSum += value * weight
      totalWeight += weight
    })
    result.profundidad_desplante = Math.round((weightedSum / totalWeight) * 10) / 10
  }

  const soilTypes = neighbors
    .filter(n => n.storeData.tipo_suelo !== null)
    .map(n => n.storeData.tipo_suelo!)
  
  if (soilTypes.length > 0) {
    const freq = new Map<string, number>()
    soilTypes.forEach(type => {
      freq.set(type, (freq.get(type) || 0) + 1)
    })
    result.tipo_suelo = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0]
  }

  const sucsTypes = neighbors
    .filter(n => n.storeData.clasificacion_sucs !== null)
    .map(n => n.storeData.clasificacion_sucs!)
  
  if (sucsTypes.length > 0) {
    const freq = new Map<string, number>()
    sucsTypes.forEach(type => {
      freq.set(type, (freq.get(type) || 0) + 1)
    })
    result.clasificacion_sucs = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0]
  }

  const cimentacionTypes = neighbors
    .filter(n => n.storeData.tipo_cimentacion !== null)
    .map(n => n.storeData.tipo_cimentacion!)
  
  if (cimentacionTypes.length > 0) {
    const freq = new Map<string, number>()
    cimentacionTypes.forEach(type => {
      freq.set(type, (freq.get(type) || 0) + 1)
    })
    result.tipo_cimentacion_sugerido = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0]
  }

  const nafCount = neighbors.filter(n => n.storeData.presencia_naf).length
  result.presencia_naf_probable = nafCount > neighbors.length / 2

  const nafDepths = neighbors
    .filter(n => n.storeData.profundidad_naf !== null)
    .map(n => ({ value: n.storeData.profundidad_naf!, weight: n.weight }))

  if (nafDepths.length > 0) {
    let weightedSum = 0
    let totalWeight = 0
    nafDepths.forEach(({ value, weight }) => {
      weightedSum += value * weight
      totalWeight += weight
    })
    result.profundidad_naf_estimada = Math.round((weightedSum / totalWeight) * 10) / 10
  }

  const mejoramientoCount = neighbors.filter(n => n.storeData.mejoramiento_requerido).length
  result.mejoramiento_probable = mejoramientoCount > neighbors.length / 2

  if (result.qadm_min !== null && result.qadm_max !== null) {
    const range = result.qadm_max - result.qadm_min
    if (range > 5) {
      result.observaciones.push(`Alta variabilidad en Qadm (${result.qadm_min} - ${result.qadm_max} ton/m²)`)
    }
  }

  if (result.presencia_naf_probable) {
    result.observaciones.push(`Probable presencia de nivel freático a ~${result.profundidad_naf_estimada}m`)
  }

  if (result.mejoramiento_probable) {
    result.observaciones.push('Se anticipa necesidad de mejoramiento del suelo')
  }

  return result
}

export function createInferredStore(
  position: [number, number],
  inferredData: InferredSoilData,
  neighbors: NaturalNeighborWeight[],
  confidenceScore: number,
  customName?: string
): StorePoint {
  const timestamp = new Date().toISOString()
  const neighborIds = neighbors.slice(0, 5).map(n => n.storeId)
  
  return {
    id: Math.floor(Date.now() / 1000), // Ensure it's a number
    nombre: customName || `Tienda Proyectada ${new Date().toLocaleDateString('es-MX')}`,
    lat: position[0],
    lon: position[1],
    tipo_suelo: inferredData.tipo_suelo,
    clasificacion_sucs: inferredData.clasificacion_sucs,
    qadm: inferredData.qadm_estimado,
    profundidad_desplante: inferredData.profundidad_desplante,
    presencia_naf: inferredData.presencia_naf_probable,
    profundidad_naf: inferredData.profundidad_naf_estimada,
    tipo_cimentacion: inferredData.tipo_cimentacion_sugerido,
    mejoramiento_requerido: inferredData.mejoramiento_probable,
    detalles_mejoramiento: inferredData.mejoramiento_probable ? 'Inferido por proximidad' : null,
    ciudad: null,
    año: new Date().getFullYear(),
    observaciones_criticas: inferredData.observaciones.join('; ') || null,
    origin: {
      isInferred: true,
      inferredAt: timestamp,
      inferredFrom: neighborIds,
      confidenceScore
    }
  }
}
