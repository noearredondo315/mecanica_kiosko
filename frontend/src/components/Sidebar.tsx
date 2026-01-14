'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X, Sun, Moon, MapPin, Grid3X3, ArrowRight, Download, Upload, FolderOpen, CheckCircle, AlertCircle, Table, LogOut, User, PanelLeftClose, PanelLeft } from 'lucide-react'
import InferredStoresTable from './InferredStoresTable'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { 
  fetchInferredStores, 
} from '@/lib/supabase/api'

interface SidebarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  totalStores: number
  onInferredStoresChange?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({
  searchQuery,
  onSearchChange,
  totalStores,
  onInferredStoresChange,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const { profile, signOut, canAccessGeomap, isAdmin, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [inferredStoresCount, setInferredStoresCount] = useState(0)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFilename, setExportFilename] = useState('')
  const [showStoresTable, setShowStoresTable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load inferred stores count from Supabase
  const refreshInferredCount = useCallback(async () => {
    // Block API calls if not authenticated
    if (!isAuthenticated) {
      return
    }
    try {
      const stores = await fetchInferredStores()
      setInferredStoresCount(stores.length)
    } catch (err) {
      console.error('Error fetching inferred count:', err)
    }
  }, [isAuthenticated])

  // Only fetch inferred count when authenticated and auth is not loading
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      refreshInferredCount()
    }
  }, [refreshInferredCount, isAuthenticated, isAuthLoading])

  const handleExportClick = async () => {
    if (inferredStoresCount === 0) {
      setImportStatus({ type: 'error', message: 'No hay tiendas inferidas para exportar' })
      setTimeout(() => setImportStatus(null), 3000)
      return
    }
    // Set default filename with timestamp
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    setExportFilename(`tiendas_inferidas_${timestamp}`)
    setShowExportDialog(true)
  }

  const handleExportConfirm = async () => {
    try {
      const filename = exportFilename.trim() || 'tiendas_inferidas'
      const stores = await fetchInferredStores()
      const dataStr = JSON.stringify(stores, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setImportStatus({ type: 'success', message: `${stores.length} tiendas exportadas` })
      setTimeout(() => setImportStatus(null), 3000)
      setShowExportDialog(false)
      setExportFilename('')
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Error al exportar' })
      setTimeout(() => setImportStatus(null), 3000)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string
          const stores = JSON.parse(content)
          
          if (!Array.isArray(stores)) {
            throw new Error('El archivo no contiene un arreglo de tiendas válido')
          }

          const { addInferredStore } = await import('@/lib/supabase/api')
          let imported = 0
          for (const store of stores) {
            // Remove local IDs and dates to let Supabase handle them
            const { id, created_at, updated_at, user_id, ...storeData } = store
            await addInferredStore(storeData)
            imported++
          }

          setImportStatus({ 
            type: 'success', 
            message: `${imported} tiendas importadas exitosamente` 
          })
          
          refreshInferredCount()
          onInferredStoresChange?.()
        } catch (err: any) {
          setImportStatus({ 
            type: 'error', 
            message: err.message || 'Error al procesar el archivo' 
          })
        }
      }
      reader.readAsText(file)
    } catch (err) {
      setImportStatus({ 
        type: 'error', 
        message: 'Error al leer el archivo' 
      })
    }
    
    setTimeout(() => setImportStatus(null), 4000)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // If collapsed, show minimal sidebar with just toggle button
  if (isCollapsed) {
    return (
      <aside className="w-14 glass-sidebar h-full flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className={cn(
            'p-2 rounded-lg transition-all duration-300',
            'bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))]',
            'border border-[rgba(var(--border-color))]'
          )}
          title="Expandir sidebar"
        >
          <PanelLeft className="w-5 h-5 text-[rgb(var(--text-secondary))]" />
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-80 glass-sidebar h-full flex flex-col">
      {/* Logos */}
      <div className="p-4 border-b border-[rgba(var(--border-color))]">
        <div className="flex items-center justify-between gap-3">
          <Image
            src="/logopt.png"
            alt="Palma Terra"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
          />
          <Image
            src="/logokiosko.png"
            alt="Kiosko"
            width={80}
            height={32}
            className="h-7 w-auto object-contain"
          />
        </div>
      </div>

      {/* Header */}
      <div className="p-6 border-b border-[rgba(var(--border-color))]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--text-primary))]">
            GEOMAP
          </h1>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                'p-2 rounded-lg transition-all duration-300',
                'bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))]',
                'border border-[rgba(var(--border-color))]'
              )}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>
            
            {/* Collapse Toggle */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={cn(
                  'p-2 rounded-lg transition-all duration-300',
                  'bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))]',
                  'border border-[rgba(var(--border-color))]'
                )}
                title="Minimizar sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-[rgb(var(--text-secondary))]" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          NAB - Suelos y Control
        </p>
      </div>

      {/* Search */}
      <div className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'w-full pl-10 pr-10 py-3 rounded-xl',
              'bg-[rgba(var(--glass-bg))] border border-[rgba(var(--border-color))]',
              'text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]',
              'focus:outline-none focus:border-[rgb(var(--accent-primary))] focus:ring-1 focus:ring-[rgb(var(--accent-primary))]',
              'transition-all duration-200'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* GEOMAP Thiessen Link - Only for admin and write roles */}
      {canAccessGeomap && (
        <div className="px-6 pb-4">
          <Link
            href="/geomap"
            className={cn(
              'flex items-center justify-between p-4 rounded-xl',
              'bg-gradient-to-r from-blue-600/20 to-purple-600/20',
              'border border-blue-500/30 hover:border-blue-500/50',
              'transition-all duration-300 group'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Grid3X3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">
                  Agregar nueva tienda
                </p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">
                  Análisis de Polígonos de Thiessen
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* Admin Panel Link - Only for admin users */}
      {isAdmin && (
        <div className="px-6 pb-4">
          <Link
            href="/admin"
            className={cn(
              'flex items-center justify-between p-4 rounded-xl',
              'bg-gradient-to-r from-purple-600/20 to-pink-600/20',
              'border border-purple-500/30 hover:border-purple-500/50',
              'transition-all duration-300 group'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">
                  Gestión de Usuarios
                </p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">
                  Panel de Administración
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* Gestión de Datos - Import/Export */}
      <div className="px-6 pb-4">
        <div className={cn(
          'p-4 rounded-xl',
          'bg-[rgba(var(--glass-bg))]',
          'border border-[rgba(var(--border-color))]'
        )}>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">
              Gestión de Datos
            </span>
            {inferredStoresCount > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                {inferredStoresCount} guardadas
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg',
                'bg-[rgba(var(--card-bg))] hover:bg-[rgba(var(--accent-primary),0.1)]',
                'border border-[rgba(var(--border-color))] hover:border-[rgb(var(--accent-primary))]',
                'text-sm font-medium text-[rgb(var(--text-primary))]',
                'transition-all duration-200'
              )}
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
            <button
              onClick={handleExportClick}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg',
                'bg-gradient-to-r from-orange-500/20 to-amber-500/20',
                'border border-orange-500/30 hover:border-orange-500/50',
                'text-sm font-medium text-orange-400',
                'transition-all duration-200'
              )}
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>

          {/* Manage Inferred Stores Button */}
          {inferredStoresCount > 0 && (
            <button
              onClick={() => setShowStoresTable(true)}
              className={cn(
                'w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
                'bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))]',
                'border border-[rgba(var(--border-color))]',
                'text-xs font-medium text-[rgb(var(--text-secondary))]',
                'transition-all duration-200'
              )}
            >
              <Table className="w-3.5 h-3.5" />
              Gestionar tiendas inferidas
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Status message */}
          {importStatus && (
            <div className={cn(
              'mt-3 p-2 rounded-lg flex items-center gap-2 text-xs',
              importStatus.type === 'success' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            )}>
              {importStatus.type === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {importStatus.message}
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={cn(
            'w-96 p-6 rounded-2xl shadow-2xl',
            'bg-[rgb(var(--bg-secondary))] border border-[rgba(var(--border-color))]'
          )}>
            <h3 className="text-lg font-bold text-[rgb(var(--text-primary))] mb-4">
              Exportar Tiendas Inferidas
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-[rgb(var(--text-secondary))] mb-2">
                Nombre del archivo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg',
                    'bg-[rgba(var(--glass-bg))] border border-[rgba(var(--border-color))]',
                    'text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]',
                    'focus:outline-none focus:border-[rgb(var(--accent-primary))]'
                  )}
                  placeholder="tiendas_inferidas"
                  autoFocus
                />
                <span className="text-[rgb(var(--text-muted))]">.json</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExportDialog(false)
                  setExportFilename('')
                }}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg',
                  'bg-[rgba(var(--glass-bg))] border border-[rgba(var(--border-color))]',
                  'text-[rgb(var(--text-primary))] hover:bg-[rgba(var(--card-bg))]',
                  'transition-colors'
                )}
              >
                Cancelar
              </button>
              <button
                onClick={handleExportConfirm}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg',
                  'bg-gradient-to-r from-orange-500 to-amber-500',
                  'text-white font-medium',
                  'hover:from-orange-600 hover:to-amber-600',
                  'transition-colors'
                )}
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inferred Stores Management Table */}
      <InferredStoresTable
        isOpen={showStoresTable}
        onClose={() => setShowStoresTable(false)}
        onStoresChange={() => {
          refreshInferredCount()
          onInferredStoresChange?.()
        }}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Profile Section - Now at bottom */}
      {profile && (
        <div className="px-6 py-4 border-t border-[rgba(var(--border-color))]">
          <div className={cn(
            'p-3 rounded-xl flex items-center justify-between',
            'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
            'border border-blue-500/20'
          )}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[rgb(var(--text-primary))]">
                  {profile.full_name || profile.email?.split('@')[0]}
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))] capitalize">
                  {profile.role === 'admin' ? '👑 Administrador' : 
                   (profile.role === 'write' || profile.role === 'editor') ? '✏️ Editor' : '👁️ Solo lectura'}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'hover:bg-red-500/20 text-[rgb(var(--text-muted))] hover:text-red-400'
              )}
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="p-6 border-t border-[rgba(var(--border-color))]">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl',
            'bg-[rgba(var(--accent-primary),0.1)]'
          )}>
            <MapPin className="w-5 h-5 text-[rgb(var(--accent-primary))]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">
              {totalStores}
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              Tiendas en el mapa
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
