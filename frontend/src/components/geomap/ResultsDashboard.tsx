'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, Ruler, AlertTriangle, CheckCircle, 
  Layers, Droplets, Building2, FileWarning,
  ChevronDown, ChevronUp, Info, Save, CheckCircle2
} from 'lucide-react'
import type { StorePoint, NaturalNeighborWeight, HeterogeneityAlert, InferredSoilData } from '@/lib/voronoi'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/context/ThemeContext'

interface ResultsDashboardProps {
  parentStore: StorePoint | null
  parentDistance: number
  naturalNeighbors: NaturalNeighborWeight[]
  confidenceScore: number
  heterogeneityAlert: HeterogeneityAlert | null
  inferredData: InferredSoilData | null
  newStorePosition: [number, number] | null
  onSaveStore?: (storeName: string) => void
  isSaved?: boolean
}

export default function ResultsDashboard({
  parentStore,
  parentDistance,
  naturalNeighbors,
  confidenceScore,
  heterogeneityAlert,
  inferredData,
  newStorePosition,
  onSaveStore,
  isSaved = false
}: ResultsDashboardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [expandedSection, setExpandedSection] = useState<string | null>('parent')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [storeName, setStoreName] = useState('')

  const bgCard = isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'
  const bgHover = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.8)'
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a'
  const textSecondary = isDark ? '#cbd5e1' : '#334155'
  const textMuted = isDark ? '#94a3b8' : '#64748b'
  const borderColor = isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'

  if (!newStorePosition) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div 
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
            style={{ background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)' }}
          >
            <MapPin className="w-10 h-10" style={{ color: textMuted }} />
          </div>
          <div>
            <h3 className="text-lg font-medium" style={{ color: textSecondary }}>Proyecta una Nueva Tienda</h3>
            <p className="text-sm mt-1" style={{ color: textMuted }}>
              Usa el mapa, arrastra un archivo KMZ/KML o ingresa coordenadas para comenzar el análisis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg p-3"
        style={{ 
          background: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid rgba(245, 158, 11, 0.3)' 
        }}
      >
        <div className="flex gap-2">
          <FileWarning className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(253, 230, 138, 0.9)' : '#92400e' }}>
            <strong>DISCLAIMER:</strong> Este análisis es una interpolación matemática basada en Polígonos de Thiessen. 
            No sustituye el estudio de mecánica de suelos de laboratorio ni la responsabilidad profesional del perito en obra.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 rounded-xl"
        style={{ background: bgCard, border: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: textMuted }}>Grado de Confianza</span>
          <span className={`text-2xl font-bold ${
            confidenceScore >= 70 ? 'text-green-500' :
            confidenceScore >= 40 ? 'text-amber-500' : 'text-red-500'
          }`}>
            {confidenceScore.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#334155' : '#e2e8f0' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidenceScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              confidenceScore >= 70 ? 'bg-green-500' :
              confidenceScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: textMuted }}>
          Basado en proximidad y consistencia de datos vecinos
        </p>
      </motion.div>

      <AnimatePresence>
        {heterogeneityAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg p-4"
            style={{
              background: heterogeneityAlert.type === 'high' 
                ? 'rgba(239, 68, 68, 0.1)' 
                : heterogeneityAlert.type === 'medium'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${
                heterogeneityAlert.type === 'high' 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : heterogeneityAlert.type === 'medium'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)'
              }`
            }}
          >
            <div className="flex gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                heterogeneityAlert.type === 'high' ? 'text-red-500' :
                heterogeneityAlert.type === 'medium' ? 'text-amber-500' : 'text-blue-500'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  heterogeneityAlert.type === 'high' ? 'text-red-500' :
                  heterogeneityAlert.type === 'medium' ? 'text-amber-500' : 'text-blue-500'
                }`}>
                  {heterogeneityAlert.message}
                </p>
                {heterogeneityAlert.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {heterogeneityAlert.details.map((detail, idx) => (
                      <div key={idx} className="text-xs" style={{ color: textMuted }}>
                        <span className="font-medium">{detail.field}:</span>{' '}
                        {detail.values.map(v => `${v.store}: ${v.value}`).join(', ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl overflow-hidden" style={{ background: bgCard, border: `1px solid ${borderColor}` }}>
        <button
          onClick={() => toggleSection('parent')}
          className="w-full flex items-center justify-between p-4 transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.background = bgHover}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
              <Building2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium" style={{ color: textPrimary }}>Tienda de Referencia</h3>
              <p className="text-xs" style={{ color: textMuted }}>Tienda padre más cercana</p>
            </div>
          </div>
          {expandedSection === 'parent' ? (
            <ChevronUp className="w-5 h-5" style={{ color: textMuted }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: textMuted }} />
          )}
        </button>
        
        <AnimatePresence>
          {expandedSection === 'parent' && parentStore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ borderTop: `1px solid ${borderColor}` }}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: textMuted }}>Nombre</span>
                  <span className="text-sm font-medium" style={{ color: textPrimary }}>{parentStore.nombre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: textMuted }}>Ciudad</span>
                  <span className="text-sm" style={{ color: textSecondary }}>{parentStore.ciudad || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: textMuted }}>Distancia</span>
                  <span className="text-sm font-medium text-blue-500">
                    {parentDistance < 1 
                      ? `${(parentDistance * 1000).toFixed(0)} m`
                      : `${parentDistance.toFixed(2)} km`
                    }
                  </span>
                </div>
                <div className="h-px my-2" style={{ background: borderColor }} />
                
                {parentStore.qadm && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: textMuted }}>Qadm</span>
                    <span className="text-sm font-bold text-green-500">{parentStore.qadm} ton/m²</span>
                  </div>
                )}
                {parentStore.tipo_suelo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: textMuted }}>Tipo de Suelo</span>
                    <span className="text-sm" style={{ color: textSecondary }}>{parentStore.tipo_suelo}</span>
                  </div>
                )}
                {parentStore.clasificacion_sucs && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: textMuted }}>SUCS</span>
                    <span className="text-sm font-mono" style={{ color: textSecondary }}>{parentStore.clasificacion_sucs}</span>
                  </div>
                )}
                {parentStore.tipo_cimentacion && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: textMuted }}>Cimentación</span>
                    <span className="text-sm" style={{ color: textSecondary }}>{parentStore.tipo_cimentacion}</span>
                  </div>
                )}
                {parentStore.presencia_naf && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: textMuted }}>NAF</span>
                    <span className="text-sm text-blue-500">
                      {parentStore.profundidad_naf ? `${parentStore.profundidad_naf} m` : 'Presente'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {inferredData && (
        <div className="rounded-xl overflow-hidden" style={{ background: bgCard, border: `1px solid ${borderColor}` }}>
          <button
            onClick={() => toggleSection('inferred')}
            className="w-full flex items-center justify-between p-4 transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.background = bgHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249, 115, 22, 0.2)' }}>
                <Layers className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium" style={{ color: textPrimary }}>Datos Inferidos</h3>
                <p className="text-xs" style={{ color: textMuted }}>Polígonos de Thiessen</p>
              </div>
            </div>
            {expandedSection === 'inferred' ? (
              <ChevronUp className="w-5 h-5" style={{ color: textMuted }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: textMuted }} />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'inferred' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <div className="p-4 space-y-3">
                  {inferredData.qadm_estimado && (
                    <div className="rounded-lg p-3" style={{ background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm" style={{ color: textMuted }}>Qadm Estimado</span>
                        <span className="text-lg font-bold text-orange-500">
                          {inferredData.qadm_estimado} ton/m²
                        </span>
                      </div>
                      {inferredData.qadm_min !== null && inferredData.qadm_max !== null && (
                        <p className="text-xs" style={{ color: textMuted }}>
                          Rango: {inferredData.qadm_min} - {inferredData.qadm_max} ton/m²
                        </p>
                      )}
                    </div>
                  )}
                  
                  {inferredData.tipo_suelo && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: textMuted }}>Suelo Predominante</span>
                      <span className="text-sm" style={{ color: textSecondary }}>{inferredData.tipo_suelo}</span>
                    </div>
                  )}
                  
                  {inferredData.clasificacion_sucs && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: textMuted }}>SUCS</span>
                      <span className="text-sm font-mono" style={{ color: textSecondary }}>{inferredData.clasificacion_sucs}</span>
                    </div>
                  )}
                  
                  {inferredData.profundidad_desplante && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: textMuted }}>Prof. Desplante</span>
                      <span className="text-sm" style={{ color: textSecondary }}>{inferredData.profundidad_desplante} m</span>
                    </div>
                  )}
                  
                  {inferredData.tipo_cimentacion_sugerido && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: textMuted }}>Cimentación Sugerida</span>
                      <span className="text-sm" style={{ color: textSecondary }}>{inferredData.tipo_cimentacion_sugerido}</span>
                    </div>
                  )}
                  
                  {inferredData.presencia_naf_probable && (
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-500">
                        NAF probable a ~{inferredData.profundidad_naf_estimada} m
                      </span>
                    </div>
                  )}
                  
                  {inferredData.mejoramiento_probable && (
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-amber-500">
                        Probable necesidad de mejoramiento
                      </span>
                    </div>
                  )}
                  
                  {inferredData.observaciones.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${borderColor}` }}>
                      <p className="text-xs font-medium mb-2" style={{ color: textMuted }}>Observaciones:</p>
                      <ul className="space-y-1">
                        {inferredData.observaciones.map((obs, idx) => (
                          <li key={idx} className="text-xs flex items-start gap-2" style={{ color: textMuted }}>
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {naturalNeighbors.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: bgCard, border: `1px solid ${borderColor}` }}>
          <button
            onClick={() => toggleSection('neighbors')}
            className="w-full flex items-center justify-between p-4 transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.background = bgHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                <Ruler className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium" style={{ color: textPrimary }}>Vecinos Naturales</h3>
                <p className="text-xs" style={{ color: textMuted }}>{naturalNeighbors.length} tiendas con influencia</p>
              </div>
            </div>
            {expandedSection === 'neighbors' ? (
              <ChevronUp className="w-5 h-5" style={{ color: textMuted }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: textMuted }} />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'neighbors' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <div className="p-4 space-y-2">
                  {naturalNeighbors.slice(0, 5).map((neighbor, idx) => (
                    <div 
                      key={neighbor.storeId}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.8)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: textSecondary }}>{neighbor.storeName}</p>
                          <p className="text-xs" style={{ color: textMuted }}>{neighbor.distance.toFixed(2)} km</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-purple-500">
                          {(neighbor.weight * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs" style={{ color: textMuted }}>peso</p>
                      </div>
                    </div>
                  ))}
                  {naturalNeighbors.length > 5 && (
                    <p className="text-xs text-center pt-2" style={{ color: textMuted }}>
                      +{naturalNeighbors.length - 5} vecinos adicionales
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="p-4 rounded-xl" style={{ background: bgCard, border: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium" style={{ color: textSecondary }}>Coordenadas Nueva Tienda</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs" style={{ color: textMuted }}>Latitud</p>
            <p className="text-sm font-mono" style={{ color: textPrimary }}>{newStorePosition[0].toFixed(6)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: textMuted }}>Longitud</p>
            <p className="text-sm font-mono" style={{ color: textPrimary }}>{newStorePosition[1].toFixed(6)}</p>
          </div>
        </div>
      </div>

      {/* Save Store Button */}
      {onSaveStore && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            if (!isSaved) {
              // Set default name based on parent store city
              const defaultName = parentStore?.ciudad 
                ? `Nueva Tienda - ${parentStore.ciudad}` 
                : 'Nueva Tienda'
              setStoreName(defaultName)
              setShowSaveDialog(true)
            }
          }}
          disabled={isSaved}
          className={`
            w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
            ${isSaved 
              ? 'bg-green-600/20 text-green-500 cursor-default' 
              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-orange-500/25'
            }
          `}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Tienda Guardada
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar Tienda Inferida
            </>
          )}
        </motion.button>
      )}

      {/* Save Store Dialog - Using Portal to render above map */}
      {showSaveDialog && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ zIndex: 10000 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-96 p-6 rounded-2xl shadow-2xl"
            style={{ background: isDark ? '#1e293b' : '#ffffff', border: `1px solid ${borderColor}` }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: textPrimary }}>
              Guardar Tienda Inferida
            </h3>
            <div className="mb-4">
              <label className="block text-sm mb-2" style={{ color: textSecondary }}>
                Nombre de la obra / tienda
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                style={{ 
                  background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
                placeholder="Ej: Sucursal Centro, Local Plaza Norte..."
                autoFocus
              />
            </div>
            <div className="mb-4 p-3 rounded-lg" style={{ background: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.5)' }}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: textMuted }}>Ciudad:</span>
                <span style={{ color: textSecondary }}>{parentStore?.ciudad || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: textMuted }}>Basada en:</span>
                <span style={{ color: textSecondary }}>{parentStore?.nombre || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: textMuted }}>Confianza:</span>
                <span className="text-orange-500 font-medium">{Math.round(confidenceScore)}%</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setStoreName('')
                }}
                className="flex-1 py-2.5 px-4 rounded-lg transition-colors"
                style={{ 
                  background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const finalName = storeName.trim() || 'Nueva Tienda'
                  onSaveStore?.(finalName)
                  setShowSaveDialog(false)
                  setStoreName('')
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
