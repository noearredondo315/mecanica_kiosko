'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { MapPin, ArrowLeft, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { fetchStores, type Store } from '@/lib/api'
import { 
  analyzeNewStoreLocation, 
  checkHeterogeneity, 
  inferSoilData,
  type StorePoint,
  type VoronoiAnalysisResult,
  type HeterogeneityAlert,
  type InferredSoilData
} from '@/lib/voronoi'
import { FileDropZone, ResultsDashboard, ControlPanel } from '@/components/geomap'
import type { ParsedCoordinates } from '@/lib/kmzParser'
import { useTheme } from '@/context/ThemeContext'
import { addInferredStore } from '@/lib/inferredStoresPersistence'

const VoronoiMap = dynamic(
  () => import('@/components/geomap/VoronoiMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }
)

function storeToStorePoint(store: Store): StorePoint | null {
  if (store.latitud === null || store.longitud === null) return null
  
  return {
    id: store.id,
    nombre: store.nombre || `Tienda ${store.id}`,
    lat: store.latitud,
    lon: store.longitud,
    tipo_suelo: store.tipo_suelo,
    clasificacion_sucs: store.clasificacion_sucs,
    qadm: store.qadm,
    profundidad_desplante: store.profundidad_desplante,
    presencia_naf: store.presencia_naf,
    profundidad_naf: store.profundidad_naf,
    tipo_cimentacion: store.tipo_cimentacion,
    mejoramiento_requerido: store.mejoramiento_requerido,
    detalles_mejoramiento: store.detalles_mejoramiento,
    ciudad: store.ciudad,
    año: store.año,
    observaciones_criticas: store.observaciones_criticas
  }
}

export default function GeoMapPage() {
  const [newStorePosition, setNewStorePosition] = useState<[number, number] | null>(null)
  const [showVoronoi, setShowVoronoi] = useState(true)
  const [voronoiOpacity, setVoronoiOpacity] = useState(0.15)
  const [analysisResult, setAnalysisResult] = useState<VoronoiAnalysisResult | null>(null)
  const [heterogeneityAlert, setHeterogeneityAlert] = useState<HeterogeneityAlert | null>(null)
  const [inferredData, setInferredData] = useState<InferredSoilData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStoreSaved, setIsStoreSaved] = useState(false)
  const [inferredStoresRefresh, setInferredStoresRefresh] = useState(0)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const { data, isLoading } = useQuery({
    queryKey: ['stores-geomap'],
    queryFn: () => fetchStores(),
    staleTime: 5 * 60 * 1000,
  })

  const storePoints = useMemo(() => {
    if (!data?.stores) return []
    return data.stores
      .map(storeToStorePoint)
      .filter((s): s is StorePoint => s !== null)
  }, [data?.stores])

  const runAnalysis = useCallback((position: [number, number]) => {
    if (storePoints.length === 0) return

    setIsAnalyzing(true)
    setError(null)

    setTimeout(() => {
      try {
        const result = analyzeNewStoreLocation(
          [position[1], position[0]],
          storePoints
        )
        
        setAnalysisResult(result)

        if (result.naturalNeighbors.length > 0) {
          const alert = checkHeterogeneity(result.naturalNeighbors)
          setHeterogeneityAlert(alert)

          const inferred = inferSoilData(result.naturalNeighbors)
          setInferredData(inferred)
        }
      } catch (err) {
        console.error('Analysis error:', err)
        setError('Error en el análisis de Thiessen')
      } finally {
        setIsAnalyzing(false)
      }
    }, 100)
  }, [storePoints])

  const handleMapClick = useCallback((latlng: [number, number]) => {
    setNewStorePosition(latlng)
    setIsStoreSaved(false)
    runAnalysis(latlng)
  }, [runAnalysis])

  const handleCoordinatesExtracted = useCallback((coords: ParsedCoordinates) => {
    const position: [number, number] = [coords.lat, coords.lon]
    setNewStorePosition(position)
    setIsStoreSaved(false)
    runAnalysis(position)
  }, [runAnalysis])

  const handleError = useCallback((message: string) => {
    setError(message)
  }, [])

  const handleReset = useCallback(() => {
    setNewStorePosition(null)
    setAnalysisResult(null)
    setHeterogeneityAlert(null)
    setInferredData(null)
    setError(null)
    setIsStoreSaved(false)
  }, [])

  const handleSaveStore = useCallback((storeName: string) => {
    if (!newStorePosition || !analysisResult) return

    try {
      addInferredStore(
        newStorePosition,
        analysisResult.parentStore,
        analysisResult.parentDistance,
        analysisResult.confidenceScore,
        inferredData,
        { ciudad: analysisResult.parentStore?.ciudad || undefined },
        storeName
      )
      setIsStoreSaved(true)
      // Trigger refresh of inferred stores on map
      setInferredStoresRefresh(prev => prev + 1)
    } catch (err) {
      console.error('Error saving store:', err)
      setError('Error al guardar la tienda inferida')
    }
  }, [newStorePosition, analysisResult, inferredData])

  const handleExport = useCallback(() => {
    if (!analysisResult || !newStorePosition) return

    const exportData = {
      nueva_tienda: {
        latitud: newStorePosition[0],
        longitud: newStorePosition[1],
        fecha_analisis: new Date().toISOString()
      },
      tienda_padre: analysisResult.parentStore ? {
        id: analysisResult.parentStore.id,
        nombre: analysisResult.parentStore.nombre,
        distancia_km: analysisResult.parentDistance,
        qadm: analysisResult.parentStore.qadm,
        tipo_suelo: analysisResult.parentStore.tipo_suelo,
        tipo_cimentacion: analysisResult.parentStore.tipo_cimentacion
      } : null,
      datos_inferidos: inferredData,
      grado_confianza: analysisResult.confidenceScore,
      alerta_heterogeneidad: heterogeneityAlert,
      vecinos_naturales: analysisResult.naturalNeighbors.slice(0, 5).map(n => ({
        tienda: n.storeName,
        peso: n.weight,
        distancia_km: n.distance
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analisis_nueva_tienda_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [analysisResult, newStorePosition, inferredData, heterogeneityAlert])

  const bgPrimary = isDark ? 'rgb(2, 6, 23)' : 'rgb(248, 250, 252)'
  const bgSecondary = isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)'
  const bgSidebar = isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.9)'
  const textPrimary = isDark ? '#ffffff' : '#0f172a'
  const textSecondary = isDark ? '#cbd5e1' : '#334155'
  const textMuted = isDark ? '#64748b' : '#94a3b8'
  const borderColor = isDark ? 'rgb(30, 41, 59)' : 'rgb(226, 232, 240)'

  return (
    <div className="h-screen flex flex-col" style={{ background: bgPrimary }}>
      {/* Header */}
      <header className="flex-shrink-0 backdrop-blur-sm z-50" style={{ borderBottom: `1px solid ${borderColor}`, background: bgSecondary }}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 transition-colors"
              style={{ color: textMuted }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Volver</span>
            </Link>
            <div className="w-px h-6" style={{ background: borderColor }} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold" style={{ color: textPrimary }}>Agregar Nueva Tienda</h1>
                <p className="text-xs" style={{ color: textMuted }}>Análisis de Polígonos de Thiessen</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm" style={{ color: textMuted }}>Tiendas en red</p>
              <p className="text-lg font-semibold" style={{ color: textPrimary }}>{storePoints.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Input Controls */}
        <aside className="w-80 flex-shrink-0 overflow-y-auto" style={{ borderRight: `1px solid ${borderColor}`, background: bgSidebar }}>
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: textSecondary }}>
                Proyectar Nueva Tienda
              </h2>
              <FileDropZone 
                onCoordinatesExtracted={handleCoordinatesExtracted}
                onError={handleError}
              />
            </div>

            <div className="h-px" style={{ background: borderColor }} />

            <ControlPanel
              showVoronoi={showVoronoi}
              setShowVoronoi={setShowVoronoi}
              voronoiOpacity={voronoiOpacity}
              setVoronoiOpacity={setVoronoiOpacity}
              onReset={handleReset}
              onExport={handleExport}
              hasNewStore={newStorePosition !== null}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center" style={{ background: bgPrimary }}>
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                <p style={{ color: textMuted }}>Cargando tiendas...</p>
              </div>
            </div>
          ) : (
            <VoronoiMap
              stores={data?.stores || []}
              voronoiCells={analysisResult?.voronoiCells || []}
              newStorePosition={newStorePosition}
              newStoreCell={analysisResult?.newPointCell || null}
              parentStore={analysisResult?.parentStore || null}
              onMapClick={handleMapClick}
              showVoronoi={showVoronoi}
              voronoiOpacity={voronoiOpacity}
              isLoading={isAnalyzing}
              refreshTrigger={inferredStoresRefresh}
            />
          )}
        </main>

        {/* Right Sidebar - Results */}
        <aside className="w-96 flex-shrink-0" style={{ borderLeft: `1px solid ${borderColor}`, background: bgSidebar }}>
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>
                Resultados del Análisis
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ResultsDashboard
                parentStore={analysisResult?.parentStore || null}
                parentDistance={analysisResult?.parentDistance || 0}
                naturalNeighbors={analysisResult?.naturalNeighbors || []}
                confidenceScore={analysisResult?.confidenceScore || 0}
                heterogeneityAlert={heterogeneityAlert}
                inferredData={inferredData}
                newStorePosition={newStorePosition}
                onSaveStore={handleSaveStore}
                isSaved={isStoreSaved}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
