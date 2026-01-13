'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Eye, EyeOff, Grid3X3, RotateCcw, Download,
  Settings, Sliders
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface ControlPanelProps {
  showVoronoi: boolean
  setShowVoronoi: (show: boolean) => void
  voronoiOpacity: number
  setVoronoiOpacity: (opacity: number) => void
  onReset: () => void
  onExport: () => void
  hasNewStore: boolean
}

export default function ControlPanel({
  showVoronoi,
  setShowVoronoi,
  voronoiOpacity,
  setVoronoiOpacity,
  onReset,
  onExport,
  hasNewStore
}: ControlPanelProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [isExpanded, setIsExpanded] = useState(false)

  const bgCard = isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'
  const bgHover = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.8)'
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a'
  const textSecondary = isDark ? '#cbd5e1' : '#334155'
  const textMuted = isDark ? '#94a3b8' : '#64748b'
  const borderColor = isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'
  const bgSlider = isDark ? '#334155' : '#e2e8f0'
  const bgBtnDisabled = isDark ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)'
  const bgBtnEnabled = isDark ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: bgCard, border: `1px solid ${borderColor}` }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => e.currentTarget.style.background = bgHover}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5" style={{ color: textMuted }} />
          <span className="font-medium" style={{ color: textPrimary }}>Controles de Visualización</span>
        </div>
        <Sliders className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} style={{ color: textMuted }} />
      </button>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="p-4 space-y-4"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-blue-500" />
              <span className="text-sm" style={{ color: textSecondary }}>Polígonos de Thiessen</span>
            </div>
            <button
              onClick={() => setShowVoronoi(!showVoronoi)}
              className={`w-12 h-6 rounded-full transition-colors relative ${showVoronoi ? 'bg-blue-600' : ''}`}
              style={!showVoronoi ? { background: isDark ? '#475569' : '#cbd5e1' } : {}}
            >
              <div 
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${showVoronoi ? 'left-7' : 'left-1'}`} 
              />
            </button>
          </div>

          {showVoronoi && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: textMuted }}>Opacidad</span>
                <span className="text-sm font-mono" style={{ color: textSecondary }}>
                  {Math.round(voronoiOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={voronoiOpacity}
                onChange={(e) => setVoronoiOpacity(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                style={{ background: bgSlider }}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onReset}
              disabled={!hasNewStore}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: hasNewStore ? bgBtnEnabled : bgBtnDisabled,
                color: hasNewStore ? textPrimary : textMuted,
                cursor: hasNewStore ? 'pointer' : 'not-allowed'
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar
            </button>
            <button
              onClick={onExport}
              disabled={!hasNewStore}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                hasNewStore ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
              }`}
              style={!hasNewStore ? {
                background: bgBtnDisabled,
                color: textMuted,
                cursor: 'not-allowed'
              } : {}}
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
