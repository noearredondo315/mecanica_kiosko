'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileUp, X, CheckCircle, AlertCircle, MapPin } from 'lucide-react'
import { parseGeoFile, parseCoordinateInput, isValidMexicoCoordinate, formatCoordinateDecimal, type ParsedCoordinates } from '@/lib/kmzParser'
import { useTheme } from '@/context/ThemeContext'

interface FileDropZoneProps {
  onCoordinatesExtracted: (coords: ParsedCoordinates) => void
  onError: (message: string) => void
}

export default function FileDropZone({ onCoordinatesExtracted, onError }: FileDropZoneProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [inputMode, setInputMode] = useState<'file' | 'manual'>('file')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const geoFile = files.find(f => 
      f.name.toLowerCase().endsWith('.kmz') || 
      f.name.toLowerCase().endsWith('.kml')
    )
    
    if (!geoFile) {
      setLastResult({ success: false, message: 'Por favor, arrastra un archivo KMZ o KML' })
      onError('Formato de archivo no válido')
      return
    }
    
    await processFile(geoFile)
  }, [onError])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }, [])

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setLastResult(null)
    
    try {
      const result = await parseGeoFile(file)
      
      if (result.success && result.coordinates.length > 0) {
        const coord = result.coordinates[0]
        
        if (!isValidMexicoCoordinate(coord)) {
          setLastResult({ 
            success: false, 
            message: 'Las coordenadas están fuera del territorio mexicano' 
          })
          onError('Coordenadas fuera de México')
          return
        }
        
        setLastResult({ 
          success: true, 
          message: `Coordenadas extraídas: ${formatCoordinateDecimal(coord)}` 
        })
        onCoordinatesExtracted(coord)
      } else {
        setLastResult({ 
          success: false, 
          message: result.error || 'No se pudieron extraer coordenadas' 
        })
        onError(result.error || 'Error procesando archivo')
      }
    } catch (error) {
      setLastResult({ 
        success: false, 
        message: 'Error procesando el archivo' 
      })
      onError('Error inesperado')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSubmit = useCallback(() => {
    if (!manualInput.trim()) {
      setLastResult({ success: false, message: 'Ingresa las coordenadas' })
      return
    }
    
    const parsed = parseCoordinateInput(manualInput)
    
    if (!parsed) {
      setLastResult({ 
        success: false, 
        message: 'Formato no reconocido. Usa: "lat, lon" o GMS' 
      })
      onError('Formato de coordenadas inválido')
      return
    }
    
    if (!isValidMexicoCoordinate(parsed)) {
      setLastResult({ 
        success: false, 
        message: 'Las coordenadas están fuera de México' 
      })
      onError('Coordenadas fuera de México')
      return
    }
    
    setLastResult({ 
      success: true, 
      message: `Coordenadas válidas: ${formatCoordinateDecimal(parsed)}` 
    })
    onCoordinatesExtracted(parsed)
    setManualInput('')
  }, [manualInput, onCoordinatesExtracted, onError])

  const bgPrimary = isDark ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)'
  const bgSecondary = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'
  const textPrimary = isDark ? '#f8fafc' : '#0f172a'
  const textSecondary = isDark ? '#94a3b8' : '#64748b'
  const textMuted = isDark ? '#64748b' : '#94a3b8'
  const borderColor = isDark ? 'rgb(71, 85, 105)' : 'rgb(203, 213, 225)'
  const borderHover = isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)'

  return (
    <div className="space-y-4">
      <div 
        className="flex gap-2 p-1 rounded-lg"
        style={{ background: bgSecondary }}
      >
        <button
          onClick={() => setInputMode('file')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            inputMode === 'file'
              ? 'bg-blue-600 text-white'
              : ''
          }`}
          style={inputMode !== 'file' ? { color: textSecondary } : {}}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Archivo KMZ/KML
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            inputMode === 'manual'
              ? 'bg-blue-600 text-white'
              : ''
          }`}
          style={inputMode !== 'manual' ? { color: textSecondary } : {}}
        >
          <MapPin className="w-4 h-4 inline-block mr-2" />
          Coordenadas
        </button>
      </div>

      <AnimatePresence mode="wait">
        {inputMode === 'file' ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer"
              style={{
                borderColor: isDragging ? '#3b82f6' : borderColor,
                background: isDragging ? 'rgba(59, 130, 246, 0.1)' : bgSecondary,
                opacity: isProcessing ? 0.5 : 1,
                pointerEvents: isProcessing ? 'none' : 'auto'
              }}
            >
              <input
                type="file"
                accept=".kmz,.kml"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              
              <div className="space-y-3">
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                  style={{ background: isDragging ? 'rgba(59, 130, 246, 0.2)' : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)') }}
                >
                  {isProcessing ? (
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileUp className="w-8 h-8" style={{ color: isDragging ? '#60a5fa' : textSecondary }} />
                  )}
                </div>
                
                <div>
                  <p className="font-medium" style={{ color: textPrimary }}>
                    {isDragging 
                      ? 'Suelta el archivo aquí' 
                      : 'Arrastra un archivo KMZ o KML'
                    }
                  </p>
                  <p className="text-sm mt-1" style={{ color: textMuted }}>
                    o haz clic para seleccionar
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="relative">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="25.6714, -100.3097"
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ 
                  background: bgSecondary, 
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <button
                onClick={handleManualSubmit}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Ubicar
              </button>
            </div>
            <p className="text-xs" style={{ color: textMuted }}>
              Formatos: Decimal (lat, lon) o GMS (25°40&apos;17&quot;N 100°18&apos;35&quot;W)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{
              background: lastResult.success 
                ? 'rgba(34, 197, 94, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${lastResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: lastResult.success ? '#22c55e' : '#ef4444'
            }}
          >
            {lastResult.success ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{lastResult.message}</span>
            <button
              onClick={() => setLastResult(null)}
              className="ml-auto hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
