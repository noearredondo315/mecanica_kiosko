'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Store } from '@/lib/api'
import { useTheme } from '@/context/ThemeContext'
import L from 'leaflet'
import 'leaflet.markercluster'
import { loadInferredStores, type InferredStoreRecord } from '@/lib/inferredStoresPersistence'

interface StoreMapProps {
  stores: Store[]
  selectedStore: Store | null
  onStoreSelect: (store: Store) => void
  onInferredStoreSelect?: (store: InferredStoreRecord) => void
  isLoading?: boolean
  inferredStoresRefresh?: number
}

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]
const DEFAULT_ZOOM = 5

export default function StoreMap({ 
  stores, 
  selectedStore, 
  onStoreSelect,
  onInferredStoreSelect,
  isLoading,
  inferredStoresRefresh = 0
}: StoreMapProps) {
  const { theme } = useTheme()
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.MarkerClusterGroup | null>(null)
  const inferredMarkersRef = useRef<L.LayerGroup | null>(null)
  const storeMarkersRef = useRef<Map<number, L.Marker>>(new Map())
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const [savedInferredStores, setSavedInferredStores] = useState<InferredStoreRecord[]>([])

  // Load inferred stores from localStorage
  useEffect(() => {
    const data = loadInferredStores()
    setSavedInferredStores(data.stores)
  }, [inferredStoresRefresh])

  const validStores = useMemo(() => 
    stores.filter(s => s.latitud !== null && s.longitud !== null),
    [stores]
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapRef.current = L.map(mapContainerRef.current, {
      center: MEXICO_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      preferCanvas: true,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update tile layer based on theme
  useEffect(() => {
    if (!mapRef.current) return

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }

    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current)
  }, [theme])

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return

    if (markersRef.current) {
      mapRef.current.removeLayer(markersRef.current)
    }
    storeMarkersRef.current.clear()

    markersRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount()
        let size = 'small'
        let sizeNum = 36
        if (count >= 10) { size = 'medium'; sizeNum = 44 }
        if (count >= 50) { size = 'large'; sizeNum = 52 }
        
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(sizeNum, sizeNum),
        })
      },
    })

    validStores.forEach((store) => {
      // Create marker with halo effect
      const markerColor = theme === 'dark' ? '59, 130, 246' : '37, 99, 235'
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full animate-pulse" 
                 style="background: radial-gradient(circle, rgba(${markerColor}, 0.25) 0%, transparent 70%);"></div>
            <div class="w-3.5 h-3.5 rounded-full shadow-lg border-2 border-white"
                 style="background: rgb(${markerColor}); box-shadow: 0 0 12px rgba(${markerColor}, 0.5);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const marker = L.marker([store.latitud!, store.longitud!], { icon })

      // Create tooltip content with empty state handling
      const hasCimentacionData = store.tipo_cimentacion || store.qadm
      
      const emptyStateMessage = store.justificacion 
        ? store.justificacion.length > 120 
          ? store.justificacion.substring(0, 120) + '...'
          : store.justificacion
        : 'Información no especificada en el estudio. La elección final dependerá del criterio del Ing. Estructurista.'
      
      const tooltipContent = `
        <div class="store-tooltip">
          <div class="tooltip-title">${store.nombre || 'Sin nombre'}</div>
          <div class="tooltip-subtitle">${store.ciudad} • ${store.año}</div>
          <div class="tooltip-divider"></div>
          ${hasCimentacionData ? `
            ${store.tipo_cimentacion ? `
              <div class="tooltip-row">
                <span class="tooltip-label">Cimentación:</span>
                <span class="tooltip-value">${store.tipo_cimentacion}</span>
              </div>
            ` : ''}
            ${store.qadm ? `
              <div class="tooltip-row">
                <span class="tooltip-label">Qadm:</span>
                <span class="tooltip-value"><strong>${store.qadm} ton/m²</strong></span>
              </div>
            ` : ''}
          ` : `
            <div class="tooltip-empty-state">
              <div class="tooltip-empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <p class="tooltip-empty-text">${emptyStateMessage}</p>
            </div>
          `}
        </div>
      `

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -15],
        opacity: 1,
        className: 'leaflet-tooltip-custom leaflet-tooltip-interactive',
        interactive: true,
      })

      marker.on('click', () => {
        onStoreSelect(store)
      })

      storeMarkersRef.current.set(store.id, marker)
      markersRef.current!.addLayer(marker)
    })

    mapRef.current.addLayer(markersRef.current)

    if (validStores.length > 0) {
      const bounds = L.latLngBounds(
        validStores.map(s => [s.latitud!, s.longitud!] as [number, number])
      )
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [validStores, onStoreSelect, theme])

  // Render inferred stores as orange markers
  useEffect(() => {
    if (!mapRef.current) return

    if (inferredMarkersRef.current) {
      mapRef.current.removeLayer(inferredMarkersRef.current)
    }

    if (savedInferredStores.length === 0) return

    inferredMarkersRef.current = L.layerGroup()

    savedInferredStores.forEach((store) => {
      const markerColor = '249, 115, 22' // orange-500

      const icon = L.divIcon({
        className: 'custom-marker-inferred',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full animate-pulse" 
                 style="background: radial-gradient(circle, rgba(${markerColor}, 0.4) 0%, transparent 70%);"></div>
            <div class="w-3.5 h-3.5 rounded-full shadow-lg border-2 border-white"
                 style="background: rgb(${markerColor}); box-shadow: 0 0 12px rgba(${markerColor}, 0.6);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const marker = L.marker([store.lat, store.lon], { icon })

      const tooltipContent = `
        <div class="store-tooltip">
          <div class="tooltip-title" style="color: #f97316;">${store.nombre}</div>
          <div class="tooltip-subtitle">Tienda Proyectada</div>
          <div class="tooltip-badge" style="background: rgba(249,115,22,0.2); color: #f97316;">INFERIDA</div>
          <div class="tooltip-divider"></div>
          <div class="tooltip-row">
            <span class="tooltip-label">Confianza:</span>
            <span class="tooltip-value"><strong>${Math.round(store.confidenceScore)}%</strong></span>
          </div>
          ${store.parentStoreName ? `
            <div class="tooltip-row">
              <span class="tooltip-label">Basada en:</span>
              <span class="tooltip-value">${store.parentStoreName}</span>
            </div>
          ` : ''}
          ${store.inferredData?.qadm_estimado ? `
            <div class="tooltip-row">
              <span class="tooltip-label">Qadm est.:</span>
              <span class="tooltip-value"><strong>${store.inferredData.qadm_estimado.toFixed(2)} ton/m²</strong></span>
            </div>
          ` : ''}
        </div>
      `

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -15],
        opacity: 1,
        className: 'leaflet-tooltip-custom leaflet-tooltip-interactive',
        interactive: true,
      })

      // Add click handler for inferred store
      marker.on('click', () => {
        onInferredStoreSelect?.(store)
      })

      inferredMarkersRef.current!.addLayer(marker)
    })

    mapRef.current.addLayer(inferredMarkersRef.current)
  }, [savedInferredStores, theme, onInferredStoreSelect])

  // Fly to selected store
  useEffect(() => {
    if (!mapRef.current || !selectedStore || !selectedStore.latitud || !selectedStore.longitud) return

    mapRef.current.flyTo(
      [selectedStore.latitud, selectedStore.longitud],
      14,
      { duration: 1 }
    )
  }, [selectedStore])

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
      />
      
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgb(var(--bg-primary))]/50 backdrop-blur-sm flex items-center justify-center z-[1000]"
          >
            <div className="flex items-center gap-3 glass-card px-6 py-4">
              <div className="w-5 h-5 border-2 border-[rgb(var(--accent-primary))] border-t-transparent rounded-full animate-spin" />
              <span className="text-[rgb(var(--text-secondary))]">Cargando tiendas...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-[1000] glass-card px-4 py-3">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-6 h-6 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgb(var(--accent-primary)) 0%, transparent 70%)' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[rgb(var(--accent-primary))]" />
            </div>
            <span className="text-[rgb(var(--text-secondary))]">Oficial</span>
          </div>
          {savedInferredStores.length > 0 && (
            <>
              <div className="w-px h-4 bg-[rgba(var(--border-color))]" />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgb(249,115,22) 0%, transparent 70%)' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-orange-500" />
                </div>
                <span className="text-orange-400">{savedInferredStores.length} Inferidas</span>
              </div>
            </>
          )}
          <div className="w-px h-4 bg-[rgba(var(--border-color))]" />
          <span className="text-[rgb(var(--text-muted))]">{validStores.length + savedInferredStores.length} total</span>
        </div>
      </div>
    </div>
  )
}
