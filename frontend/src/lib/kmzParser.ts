import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'

export interface ParsedCoordinates {
  lat: number
  lon: number
  alt?: number
  name?: string
  description?: string
}

export interface KMZParseResult {
  success: boolean
  coordinates: ParsedCoordinates[]
  error?: string
  fileName?: string
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseAttributeValue: true,
  trimValues: true
})

function parseCoordinateString(coordString: string): ParsedCoordinates[] {
  if (!coordString || typeof coordString !== 'string') return []
  
  const coords: ParsedCoordinates[] = []
  const points = coordString.trim().split(/\s+/)
  
  for (const point of points) {
    const parts = point.split(',')
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      const alt = parts.length > 2 ? parseFloat(parts[2]) : undefined
      
      if (!isNaN(lon) && !isNaN(lat)) {
        coords.push({ lon, lat, alt })
      }
    }
  }
  
  return coords
}

function extractPlacemarks(obj: unknown, results: ParsedCoordinates[]): void {
  if (!obj || typeof obj !== 'object') return
  
  const record = obj as Record<string, unknown>
  
  if (record.Placemark) {
    const placemarks = Array.isArray(record.Placemark) 
      ? record.Placemark 
      : [record.Placemark]
    
    for (const pm of placemarks) {
      const placemark = pm as Record<string, unknown>
      const name = placemark.name as string | undefined
      const description = placemark.description as string | undefined
      
      if (placemark.Point) {
        const point = placemark.Point as Record<string, unknown>
        const coordStr = point.coordinates as string
        const coords = parseCoordinateString(coordStr)
        if (coords.length > 0) {
          results.push({ ...coords[0], name, description })
        }
      }
      
      if (placemark.Polygon) {
        const polygon = placemark.Polygon as Record<string, unknown>
        const outer = polygon.outerBoundaryIs as Record<string, unknown> | undefined
        if (outer?.LinearRing) {
          const ring = outer.LinearRing as Record<string, unknown>
          const coordStr = ring.coordinates as string
          const coords = parseCoordinateString(coordStr)
          if (coords.length > 0) {
            const centroid = calculateCentroid(coords)
            results.push({ ...centroid, name, description })
          }
        }
      }
      
      if (placemark.LineString) {
        const line = placemark.LineString as Record<string, unknown>
        const coordStr = line.coordinates as string
        const coords = parseCoordinateString(coordStr)
        if (coords.length > 0) {
          const centroid = calculateCentroid(coords)
          results.push({ ...centroid, name, description })
        }
      }
    }
  }
  
  for (const key of Object.keys(record)) {
    if (key !== 'Placemark' && typeof record[key] === 'object') {
      extractPlacemarks(record[key], results)
    }
  }
}

function calculateCentroid(coords: ParsedCoordinates[]): ParsedCoordinates {
  if (coords.length === 0) return { lat: 0, lon: 0 }
  if (coords.length === 1) return coords[0]
  
  let sumLat = 0
  let sumLon = 0
  
  for (const coord of coords) {
    sumLat += coord.lat
    sumLon += coord.lon
  }
  
  return {
    lat: sumLat / coords.length,
    lon: sumLon / coords.length
  }
}

export async function parseKML(kmlContent: string): Promise<ParsedCoordinates[]> {
  try {
    const parsed = xmlParser.parse(kmlContent)
    const results: ParsedCoordinates[] = []
    extractPlacemarks(parsed, results)
    return results
  } catch (error) {
    console.error('Error parsing KML:', error)
    return []
  }
}

export async function parseKMZ(file: File): Promise<KMZParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    
    const kmlFiles = Object.keys(zip.files).filter(
      name => name.toLowerCase().endsWith('.kml')
    )
    
    if (kmlFiles.length === 0) {
      return {
        success: false,
        coordinates: [],
        error: 'No se encontró archivo KML dentro del KMZ',
        fileName: file.name
      }
    }
    
    const kmlContent = await zip.files[kmlFiles[0]].async('string')
    const coordinates = await parseKML(kmlContent)
    
    if (coordinates.length === 0) {
      return {
        success: false,
        coordinates: [],
        error: 'No se encontraron coordenadas válidas en el archivo',
        fileName: file.name
      }
    }
    
    return {
      success: true,
      coordinates,
      fileName: file.name
    }
  } catch (error) {
    return {
      success: false,
      coordinates: [],
      error: error instanceof Error ? error.message : 'Error desconocido al procesar el archivo',
      fileName: file.name
    }
  }
}

export async function parseKMLFile(file: File): Promise<KMZParseResult> {
  try {
    const content = await file.text()
    const coordinates = await parseKML(content)
    
    if (coordinates.length === 0) {
      return {
        success: false,
        coordinates: [],
        error: 'No se encontraron coordenadas válidas en el archivo KML',
        fileName: file.name
      }
    }
    
    return {
      success: true,
      coordinates,
      fileName: file.name
    }
  } catch (error) {
    return {
      success: false,
      coordinates: [],
      error: error instanceof Error ? error.message : 'Error desconocido al procesar el archivo',
      fileName: file.name
    }
  }
}

export async function parseGeoFile(file: File): Promise<KMZParseResult> {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.kmz')) {
    return parseKMZ(file)
  } else if (fileName.endsWith('.kml')) {
    return parseKMLFile(file)
  } else {
    return {
      success: false,
      coordinates: [],
      error: 'Formato de archivo no soportado. Use archivos KMZ o KML.',
      fileName: file.name
    }
  }
}

export function parseDecimalCoordinates(input: string): ParsedCoordinates | null {
  const cleaned = input.replace(/\s+/g, ' ').trim()
  
  const patterns = [
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
    /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
    /^lat[:\s]*(-?\d+\.?\d*)\s*[,\s]\s*lo?ng?[:\s]*(-?\d+\.?\d*)$/i,
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const first = parseFloat(match[1])
      const second = parseFloat(match[2])
      
      if (!isNaN(first) && !isNaN(second)) {
        if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
          return { lat: first, lon: second }
        }
        if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
          return { lat: second, lon: first }
        }
      }
    }
  }
  
  return null
}

export function parseDMSCoordinates(input: string): ParsedCoordinates | null {
  const dmsPattern = /(\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]\s*([NSEW])/gi
  const matches = Array.from(input.matchAll(dmsPattern))
  
  if (matches.length < 2) return null
  
  let lat: number | null = null
  let lon: number | null = null
  
  for (const match of matches) {
    const degrees = parseFloat(match[1])
    const minutes = parseFloat(match[2])
    const seconds = parseFloat(match[3])
    const direction = match[4].toUpperCase()
    
    let decimal = degrees + minutes / 60 + seconds / 3600
    
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal
    }
    
    if (direction === 'N' || direction === 'S') {
      lat = decimal
    } else {
      lon = decimal
    }
  }
  
  if (lat !== null && lon !== null) {
    return { lat, lon }
  }
  
  return null
}

export function parseCoordinateInput(input: string): ParsedCoordinates | null {
  const decimal = parseDecimalCoordinates(input)
  if (decimal) return decimal
  
  const dms = parseDMSCoordinates(input)
  if (dms) return dms
  
  return null
}

export function isValidMexicoCoordinate(coord: ParsedCoordinates): boolean {
  return (
    coord.lat >= 14.5 && coord.lat <= 32.8 &&
    coord.lon >= -118.5 && coord.lon <= -86.5
  )
}

export function formatCoordinateDecimal(coord: ParsedCoordinates): string {
  return `${coord.lat.toFixed(6)}, ${coord.lon.toFixed(6)}`
}

export function formatCoordinateDMS(coord: ParsedCoordinates): string {
  const formatDMS = (decimal: number, isLat: boolean): string => {
    const direction = isLat 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W')
    
    const abs = Math.abs(decimal)
    const degrees = Math.floor(abs)
    const minutesDecimal = (abs - degrees) * 60
    const minutes = Math.floor(minutesDecimal)
    const seconds = (minutesDecimal - minutes) * 60
    
    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`
  }
  
  return `${formatDMS(coord.lat, true)} ${formatDMS(coord.lon, false)}`
}
