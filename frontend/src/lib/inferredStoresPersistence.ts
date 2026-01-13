import type { StorePoint, InferredSoilData } from './voronoi'

const STORAGE_KEY = 'geomap_inferred_stores'

export interface InferredStoreRecord {
  id: string
  nombre: string
  lat: number
  lon: number
  fechaCreacion: string
  fechaActualizacion: string
  isInferred: true
  parentStoreId?: string | number
  parentStoreName?: string
  parentDistance?: number
  confidenceScore: number
  inferredData: InferredSoilData | null
  metadata?: {
    ciudad?: string
    estado?: string
    observaciones?: string
  }
}

export interface InferredStoresData {
  version: string
  lastUpdated: string
  stores: InferredStoreRecord[]
}

function generateId(): string {
  return `inferred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function loadInferredStores(): InferredStoresData {
  if (typeof window === 'undefined') {
    return { version: '1.0', lastUpdated: new Date().toISOString(), stores: [] }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored) as InferredStoresData
      return data
    }
  } catch (error) {
    console.error('Error loading inferred stores:', error)
  }
  
  return { version: '1.0', lastUpdated: new Date().toISOString(), stores: [] }
}

export function saveInferredStores(data: InferredStoresData): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    data.lastUpdated = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Error saving inferred stores:', error)
    return false
  }
}

export function addInferredStore(
  position: [number, number],
  parentStore: StorePoint | null,
  parentDistance: number,
  confidenceScore: number,
  inferredData: InferredSoilData | null,
  metadata?: { ciudad?: string; estado?: string; observaciones?: string },
  customName?: string
): InferredStoreRecord {
  const data = loadInferredStores()
  
  const defaultName = metadata?.ciudad 
    ? `Nueva Tienda - ${metadata.ciudad}` 
    : `Nueva Tienda ${data.stores.length + 1}`
  
  const newStore: InferredStoreRecord = {
    id: generateId(),
    nombre: customName || defaultName,
    lat: position[0],
    lon: position[1],
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    isInferred: true,
    parentStoreId: parentStore?.id,
    parentStoreName: parentStore?.nombre,
    parentDistance,
    confidenceScore,
    inferredData,
    metadata
  }
  
  data.stores.push(newStore)
  saveInferredStores(data)
  
  return newStore
}

export function updateInferredStore(
  id: string,
  updates: Partial<Omit<InferredStoreRecord, 'id' | 'fechaCreacion' | 'isInferred'>>
): InferredStoreRecord | null {
  const data = loadInferredStores()
  const index = data.stores.findIndex(s => s.id === id)
  
  if (index === -1) return null
  
  data.stores[index] = {
    ...data.stores[index],
    ...updates,
    fechaActualizacion: new Date().toISOString()
  }
  
  saveInferredStores(data)
  return data.stores[index]
}

export function deleteInferredStore(id: string): boolean {
  const data = loadInferredStores()
  const initialLength = data.stores.length
  data.stores = data.stores.filter(s => s.id !== id)
  
  if (data.stores.length < initialLength) {
    saveInferredStores(data)
    return true
  }
  
  return false
}

export function clearAllInferredStores(): void {
  const data: InferredStoresData = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    stores: []
  }
  saveInferredStores(data)
}

export function exportInferredStoresToJSON(): string {
  const data = loadInferredStores()
  return JSON.stringify(data, null, 2)
}

export function downloadInferredStoresJSON(filename?: string): void {
  const json = exportInferredStoresToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // Ensure filename has .json extension
  let finalFilename = filename || `tiendas_inferidas_${new Date().toISOString().split('T')[0]}`
  if (!finalFilename.endsWith('.json')) {
    finalFilename += '.json'
  }
  a.download = finalFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

export function importInferredStoresFromJSON(jsonString: string, merge = true): ImportResult {
  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: []
  }
  
  try {
    const importedData = JSON.parse(jsonString) as InferredStoresData
    
    if (!importedData.stores || !Array.isArray(importedData.stores)) {
      result.errors.push('Formato de archivo inválido: no se encontró array de tiendas')
      return result
    }
    
    const existingData = merge ? loadInferredStores() : {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      stores: []
    }
    
    const existingIds = new Set(existingData.stores.map(s => s.id))
    
    for (const store of importedData.stores) {
      if (!store.lat || !store.lon) {
        result.errors.push(`Tienda omitida: coordenadas inválidas`)
        result.skipped++
        continue
      }
      
      if (existingIds.has(store.id)) {
        result.skipped++
        continue
      }
      
      const newStore: InferredStoreRecord = {
        id: store.id || generateId(),
        nombre: store.nombre || `Tienda Importada ${existingData.stores.length + 1}`,
        lat: store.lat,
        lon: store.lon,
        fechaCreacion: store.fechaCreacion || new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        isInferred: true,
        parentStoreId: store.parentStoreId,
        parentStoreName: store.parentStoreName,
        parentDistance: store.parentDistance,
        confidenceScore: store.confidenceScore || 0,
        inferredData: store.inferredData || null,
        metadata: store.metadata
      }
      
      existingData.stores.push(newStore)
      result.imported++
    }
    
    saveInferredStores(existingData)
    result.success = true
    
  } catch (error) {
    result.errors.push(`Error procesando JSON: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
  
  return result
}

export async function importInferredStoresFromFile(file: File, merge = true): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        resolve(importInferredStoresFromJSON(content, merge))
      } else {
        resolve({
          success: false,
          imported: 0,
          skipped: 0,
          errors: ['No se pudo leer el contenido del archivo']
        })
      }
    }
    
    reader.onerror = () => {
      resolve({
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Error leyendo el archivo']
      })
    }
    
    reader.readAsText(file)
  })
}

export function inferredStoreToStorePoint(record: InferredStoreRecord): StorePoint {
  return {
    id: record.id,
    nombre: record.nombre,
    lat: record.lat,
    lon: record.lon,
    tipo_suelo: record.inferredData?.tipo_suelo || null,
    clasificacion_sucs: record.inferredData?.clasificacion_sucs || null,
    qadm: record.inferredData?.qadm_estimado || null,
    profundidad_desplante: record.inferredData?.profundidad_desplante || null,
    presencia_naf: record.inferredData?.presencia_naf_probable || false,
    profundidad_naf: record.inferredData?.profundidad_naf_estimada || null,
    tipo_cimentacion: record.inferredData?.tipo_cimentacion_sugerido || null,
    mejoramiento_requerido: record.inferredData?.mejoramiento_probable || false,
    detalles_mejoramiento: null,
    ciudad: record.metadata?.ciudad || null,
    año: new Date(record.fechaCreacion).getFullYear(),
    observaciones_criticas: record.metadata?.observaciones || null,
    isInferred: true
  }
}

export function getAllStorePointsWithInferred(officialStores: StorePoint[]): StorePoint[] {
  const inferredData = loadInferredStores()
  const inferredPoints = inferredData.stores.map(inferredStoreToStorePoint)
  return [...officialStores, ...inferredPoints]
}
