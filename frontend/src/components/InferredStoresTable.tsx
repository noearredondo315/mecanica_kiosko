'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Edit3, Check, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { 
  loadInferredStores, 
  updateInferredStore, 
  deleteInferredStore,
  type InferredStoreRecord 
} from '@/lib/inferredStoresPersistence'
import { cn } from '@/lib/utils'

interface InferredStoresTableProps {
  isOpen: boolean
  onClose: () => void
  onStoresChange: () => void
}

export default function InferredStoresTable({ 
  isOpen, 
  onClose,
  onStoresChange 
}: InferredStoresTableProps) {
  const [stores, setStores] = useState<InferredStoreRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'nombre' | 'fechaCreacion' | 'confidenceScore'>('fechaCreacion')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const data = loadInferredStores()
      setStores(data.stores)
    }
  }, [isOpen])

  const sortedStores = [...stores].sort((a, b) => {
    let comparison = 0
    if (sortField === 'nombre') {
      comparison = a.nombre.localeCompare(b.nombre)
    } else if (sortField === 'fechaCreacion') {
      comparison = new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
    } else if (sortField === 'confidenceScore') {
      comparison = a.confidenceScore - b.confidenceScore
    }
    return sortAsc ? comparison : -comparison
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const handleStartEdit = (store: InferredStoreRecord) => {
    setEditingId(store.id)
    setEditName(store.nombre)
  }

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateInferredStore(id, { nombre: editName.trim() })
      const data = loadInferredStores()
      setStores(data.stores)
      onStoresChange()
    }
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = (id: string) => {
    deleteInferredStore(id)
    const data = loadInferredStores()
    setStores(data.stores)
    setDeleteConfirmId(null)
    onStoresChange()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-[rgb(var(--bg-secondary))] border border-[rgba(var(--border-color))]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[rgba(var(--border-color))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <MapPin className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">
                  Gestión de Tiendas Inferidas
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {stores.length} tiendas guardadas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))] border border-[rgba(var(--border-color))] transition-colors"
            >
              <X className="w-5 h-5 text-[rgb(var(--text-muted))]" />
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {stores.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[rgb(var(--text-muted))]">
                No hay tiendas inferidas guardadas
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[rgb(var(--bg-secondary))] border-b border-[rgba(var(--border-color))]">
                  <tr>
                    <th 
                      className="text-left p-3 text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider cursor-pointer hover:text-[rgb(var(--text-primary))] transition-colors"
                      onClick={() => handleSort('nombre')}
                    >
                      <div className="flex items-center gap-1">
                        Nombre
                        {sortField === 'nombre' && (
                          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                      Ciudad
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                      Basada en
                    </th>
                    <th 
                      className="text-center p-3 text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider cursor-pointer hover:text-[rgb(var(--text-primary))] transition-colors"
                      onClick={() => handleSort('confidenceScore')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Confianza
                        {sortField === 'confidenceScore' && (
                          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center p-3 text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider cursor-pointer hover:text-[rgb(var(--text-primary))] transition-colors"
                      onClick={() => handleSort('fechaCreacion')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Fecha
                        {sortField === 'fechaCreacion' && (
                          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="text-center p-3 text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStores.map((store) => (
                    <tr 
                      key={store.id}
                      className="border-b border-[rgba(var(--border-color))] hover:bg-[rgba(var(--glass-bg))] transition-colors"
                    >
                      <td className="p-3">
                        {editingId === store.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm rounded border border-orange-500/50 bg-[rgba(var(--glass-bg))] text-[rgb(var(--text-primary))] focus:outline-none focus:border-orange-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(store.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit(store.id)}
                              className="p-1.5 rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-orange-400">{store.nombre}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[rgb(var(--text-secondary))]">
                          {store.metadata?.ciudad || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[rgb(var(--text-secondary))]">
                          {store.parentStoreName || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          'text-sm font-medium',
                          store.confidenceScore >= 80 ? 'text-green-500' :
                          store.confidenceScore >= 60 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {Math.round(store.confidenceScore)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs text-[rgb(var(--text-muted))]">
                          {formatDate(store.fechaCreacion)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          {deleteConfirmId === store.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(store.id)}
                                className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-xs rounded bg-[rgba(var(--glass-bg))] text-[rgb(var(--text-muted))] hover:bg-[rgba(var(--card-bg))] transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(store)}
                                className="p-1.5 rounded hover:bg-orange-500/20 text-orange-400 transition-colors"
                                title="Editar nombre"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(store.id)}
                                className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[rgba(var(--border-color))] bg-[rgba(var(--glass-bg))]">
            <p className="text-xs text-[rgb(var(--text-muted))] text-center">
              Solo las tiendas inferidas pueden ser modificadas. Las tiendas oficiales no son editables.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
