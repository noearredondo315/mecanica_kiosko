'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import type { Store, InferredStore } from '@/lib/supabase/api'
import type { StorePoint, VoronoiCell } from '@/lib/voronoi'
import { useTheme } from '@/context/ThemeContext'

interface VoronoiMapProps {
  stores: Store[]
  voronoiCells: VoronoiCell[]
  newStorePosition: [number, number] | null
  newStoreCell: GeoJSON.Feature<GeoJSON.Polygon> | null
  parentStore: StorePoint | null
  onMapClick: (latlng: [number, number]) => void
  showVoronoi: boolean
  voronoiOpacity: number
  isLoading?: boolean
  refreshTrigger?: number
}

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]
const DEFAULT_ZOOM = 5

export default function VoronoiMap({
  stores,
  voronoiCells,
  newStorePosition,
  newStoreCell,
  parentStore,
  onMapClick,
  showVoronoi,
  voronoiOpacity,
  isLoading,
  refreshTrigger = 0
}: VoronoiMapProps) {
  const { theme } = useTheme()
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const inferredMarkersLayerRef = useRef<L.LayerGroup | null>(null)
  const voronoiLayerRef = useRef<L.GeoJSON | null>(null)
  const newStoreMarkerRef = useRef<L.Marker | null>(null)
  const newStoreCellRef = useRef<L.GeoJSON | null>(null)
  const connectionLineRef = useRef<L.Polyline | null>(null)
  const [savedInferredStores, setSavedInferredStores] = useState<InferredStore[]>([])

  const validStores = stores.filter(s => s.latitud !== null && s.longitud !== null)
  const isDark = theme === 'dark'

  // Load saved inferred stores from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const { fetchInferredStores } = await import('@/lib/supabase/api')
        const stores = await fetchInferredStores()
        setSavedInferredStores(stores)
      } catch (err) {
        console.error('Error loading inferred stores:', err)
      }
    }
    loadData()
  }, [refreshTrigger])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapRef.current = L.map(mapContainerRef.current, {
      center: MEXICO_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      preferCanvas: true,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)

    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick([e.latlng.lat, e.latlng.lng])
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [onMapClick])

  useEffect(() => {
    if (!mapRef.current) return

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current)
  }, [isDark])

  useEffect(() => {
    if (!mapRef.current) return

    if (markersLayerRef.current) {
      mapRef.current.removeLayer(markersLayerRef.current)
    }

    markersLayerRef.current = L.layerGroup()

    validStores.forEach((store) => {
      const isParent = parentStore?.id === store.id
      const markerColor = isParent 
        ? '34, 197, 94'
        : isDark ? '59, 130, 246' : '37, 99, 235'

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-${isParent ? '12' : '8'} h-${isParent ? '12' : '8'} rounded-full ${isParent ? 'animate-ping' : 'animate-pulse'}" 
                 style="background: radial-gradient(circle, rgba(${markerColor}, 0.3) 0%, transparent 70%);"></div>
            <div class="w-${isParent ? '4' : '3'} h-${isParent ? '4' : '3'} rounded-full shadow-lg border-2 border-white"
                 style="background: rgb(${markerColor}); box-shadow: 0 0 12px rgba(${markerColor}, 0.6);"></div>
          </div>
        `,
        iconSize: [isParent ? 48 : 32, isParent ? 48 : 32],
        iconAnchor: [isParent ? 24 : 16, isParent ? 24 : 16],
      })

      const marker = L.marker([store.latitud!, store.longitud!], { icon })

      const tooltipBg = isDark ? '#1e293b' : '#ffffff'
      const tooltipText = isDark ? '#f8fafc' : '#0f172a'
      const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      const labelColor = isDark ? '#94a3b8' : '#64748b'

      const tooltipContent = `
        <div class="store-tooltip" style="background: ${tooltipBg}; color: ${tooltipText}; border: 1px solid ${tooltipBorder};">
          <div class="tooltip-title">${store.nombre || 'Sin nombre'}</div>
          <div class="tooltip-subtitle" style="color: ${labelColor};">${store.ciudad} • ${store.año}</div>
          ${isParent ? '<div class="tooltip-badge">TIENDA PADRE</div>' : ''}
          <div class="tooltip-divider" style="background: ${tooltipBorder};"></div>
          ${store.qadm ? `
            <div class="tooltip-row">
              <span class="tooltip-label" style="color: ${labelColor};">Qadm:</span>
              <span class="tooltip-value"><strong>${store.qadm} ton/m²</strong></span>
            </div>
          ` : ''}
          ${store.tipo_suelo ? `
            <div class="tooltip-row">
              <span class="tooltip-label" style="color: ${labelColor};">Suelo:</span>
              <span class="tooltip-value">${store.tipo_suelo}</span>
            </div>
          ` : ''}
        </div>
      `

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'leaflet-tooltip-custom',
      })

      markersLayerRef.current!.addLayer(marker)
    })

    markersLayerRef.current.addTo(mapRef.current)

    if (validStores.length > 0 && !newStorePosition) {
      const bounds = L.latLngBounds(
        validStores.map(s => [s.latitud!, s.longitud!] as [number, number])
      )
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [validStores, parentStore, isDark, newStorePosition])

  // Render saved inferred stores as orange markers
  useEffect(() => {
    if (!mapRef.current) return

    if (inferredMarkersLayerRef.current) {
      mapRef.current.removeLayer(inferredMarkersLayerRef.current)
    }

    if (savedInferredStores.length === 0) return

    inferredMarkersLayerRef.current = L.layerGroup()

    savedInferredStores.forEach((store) => {
      const markerColor = '249, 115, 22' // orange-500

      const icon = L.divIcon({
        className: 'custom-marker-inferred',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full animate-pulse" 
                 style="background: radial-gradient(circle, rgba(${markerColor}, 0.4) 0%, transparent 70%);"></div>
            <div class="w-3 h-3 rounded-full shadow-lg border-2 border-white"
                 style="background: rgb(${markerColor}); box-shadow: 0 0 12px rgba(${markerColor}, 0.6);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const marker = L.marker([store.latitud, store.longitud], { icon })

      const tooltipBg = isDark ? '#1e293b' : '#ffffff'
      const tooltipText = isDark ? '#f8fafc' : '#0f172a'
      const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      const labelColor = isDark ? '#94a3b8' : '#64748b'

      const tooltipContent = `
        <div class="store-tooltip" style="background: ${tooltipBg}; color: ${tooltipText}; border: 1px solid ${tooltipBorder};">
          <div class="tooltip-title" style="color: #f97316;">${store.nombre}</div>
          <div class="tooltip-subtitle" style="color: ${labelColor};">Tienda Inferida</div>
          <div class="tooltip-badge" style="background: rgba(249,115,22,0.2); color: #f97316;">PROYECTADA</div>
          <div class="tooltip-divider" style="background: ${tooltipBorder};"></div>
          <div class="tooltip-row">
            <span class="tooltip-label" style="color: ${labelColor};">Confianza:</span>
            <span class="tooltip-value"><strong>${Math.round(store.confidence_score || 0)}%</strong></span>
          </div>
          ${store.parent_store_name ? `
            <div class="tooltip-row">
              <span class="tooltip-label" style="color: ${labelColor};">Basada en:</span>
              <span class="tooltip-value">${store.parent_store_name}</span>
            </div>
          ` : ''}
          ${(store.inferred_data as any)?.qadm_estimado ? `
            <div class="tooltip-row">
              <span class="tooltip-label" style="color: ${labelColor};">Qadm estimado:</span>
              <span class="tooltip-value"><strong>${(store.inferred_data as any).qadm_estimado.toFixed(2)} ton/m²</strong></span>
            </div>
          ` : ''}
        </div>
      `

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'leaflet-tooltip-custom leaflet-tooltip-interactive',
        interactive: true,
      })

      inferredMarkersLayerRef.current!.addLayer(marker)
    })

    inferredMarkersLayerRef.current.addTo(mapRef.current)
  }, [savedInferredStores, isDark])

  useEffect(() => {
    if (!mapRef.current) return

    if (voronoiLayerRef.current) {
      mapRef.current.removeLayer(voronoiLayerRef.current)
    }

    if (!showVoronoi || voronoiCells.length === 0) return

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: voronoiCells.map(cell => cell.polygon)
    }

    voronoiLayerRef.current = L.geoJSON(geojson, {
      style: (feature) => {
        const isParentCell = feature?.properties?.storeId === parentStore?.id
        const isInferred = feature?.properties?.isInferred
        return {
          fillColor: isInferred ? '#f97316' : (isParentCell ? '#22c55e' : '#3b82f6'),
          fillOpacity: voronoiOpacity * (isParentCell ? 1.5 : 1),
          color: isInferred ? '#ea580c' : (isParentCell ? '#16a34a' : '#2563eb'),
          weight: isParentCell ? 2 : 1,
          opacity: 0.8
        }
      }
    }).addTo(mapRef.current)
  }, [voronoiCells, showVoronoi, voronoiOpacity, parentStore])

  useEffect(() => {
    if (!mapRef.current) return

    if (newStoreMarkerRef.current) {
      mapRef.current.removeLayer(newStoreMarkerRef.current)
      newStoreMarkerRef.current = null
    }
    if (newStoreCellRef.current) {
      mapRef.current.removeLayer(newStoreCellRef.current)
      newStoreCellRef.current = null
    }
    if (connectionLineRef.current) {
      mapRef.current.removeLayer(connectionLineRef.current)
      connectionLineRef.current = null
    }

    if (!newStorePosition) return

    const newStoreIcon = L.divIcon({
      className: 'new-store-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-16 h-16 rounded-full animate-ping" 
               style="background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%);"></div>
          <div class="absolute w-10 h-10 rounded-full animate-pulse" 
               style="background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);"></div>
          <div class="w-5 h-5 rounded-full shadow-lg border-3 border-white flex items-center justify-center"
               style="background: rgb(239, 68, 68); box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);">
            <span class="text-white text-xs font-bold">+</span>
          </div>
        </div>
      `,
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    })

    newStoreMarkerRef.current = L.marker(newStorePosition, { 
      icon: newStoreIcon,
      draggable: true
    })

    newStoreMarkerRef.current.on('dragend', (e: L.DragEndEvent) => {
      const marker = e.target as L.Marker
      const position = marker.getLatLng()
      onMapClick([position.lat, position.lng])
    })

    const tooltipBg = isDark ? '#1e293b' : '#ffffff'
    const tooltipText = isDark ? '#f8fafc' : '#0f172a'
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    const labelColor = isDark ? '#94a3b8' : '#64748b'

    newStoreMarkerRef.current.bindTooltip(`
      <div class="store-tooltip" style="background: ${tooltipBg}; color: ${tooltipText}; border: 1px solid ${tooltipBorder};">
        <div class="tooltip-title" style="color: #ef4444;">📍 Nueva Tienda</div>
        <div class="tooltip-subtitle" style="color: ${labelColor};">Lat: ${newStorePosition[0].toFixed(6)}</div>
        <div class="tooltip-subtitle" style="color: ${labelColor};">Lon: ${newStorePosition[1].toFixed(6)}</div>
        <div class="tooltip-hint" style="color: ${labelColor};">Arrastra para ajustar posición</div>
      </div>
    `, {
      direction: 'top',
      offset: [0, -20],
      opacity: 1,
      className: 'leaflet-tooltip-custom new-store-tooltip',
    })

    newStoreMarkerRef.current.addTo(mapRef.current)

    if (newStoreCell && showVoronoi) {
      newStoreCellRef.current = L.geoJSON(newStoreCell, {
        style: {
          fillColor: '#ef4444',
          fillOpacity: voronoiOpacity * 1.2,
          color: '#dc2626',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 5'
        }
      }).addTo(mapRef.current)
    }

    if (parentStore) {
      connectionLineRef.current = L.polyline(
        [newStorePosition, [parentStore.lat, parentStore.lon]],
        {
          color: '#22c55e',
          weight: 2,
          opacity: 0.7,
          dashArray: '10, 10'
        }
      ).addTo(mapRef.current)
    }

    mapRef.current.flyTo(newStorePosition, 12, { duration: 1 })

  }, [newStorePosition, newStoreCell, showVoronoi, voronoiOpacity, parentStore, onMapClick, isDark])

  const legendBg = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)'
  const legendText = isDark ? '#e2e8f0' : '#1e293b'
  const legendLabel = isDark ? '#94a3b8' : '#64748b'
  const legendBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full cursor-crosshair"
      />
      
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-[1000]"
            style={{ background: isDark ? 'rgba(2,6,23,0.5)' : 'rgba(248,250,252,0.7)' }}
          >
            <div 
              className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg"
              style={{ background: legendBg, border: `1px solid ${legendBorder}` }}
            >
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span style={{ color: legendLabel }}>Calculando polígonos de Thiessen...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="absolute top-4 left-4 z-[1000] px-4 py-3 space-y-2 rounded-xl shadow-lg"
        style={{ background: legendBg, border: `1px solid ${legendBorder}` }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: legendLabel }}>Leyenda</div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span style={{ color: legendText }}>Tienda oficial (Lab.)</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span style={{ color: legendText }}>Tienda padre (referencia)</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span style={{ color: legendText }}>Nueva tienda</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span style={{ color: legendText }}>Tienda inferida</span>
        </div>
        {showVoronoi && (
          <>
            <div className="w-full h-px my-2" style={{ background: legendBorder }} />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-3 border border-blue-500 bg-blue-500/20" />
              <span style={{ color: legendText }}>Área de influencia</span>
            </div>
          </>
        )}
      </div>

      {!newStorePosition && (
        <div 
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl shadow-lg"
          style={{ background: legendBg, border: `1px solid ${legendBorder}` }}
        >
          <span className="text-sm" style={{ color: legendLabel }}>
            💡 Haz clic en el mapa para ubicar la nueva tienda
          </span>
        </div>
      )}
    </div>
  )
}
