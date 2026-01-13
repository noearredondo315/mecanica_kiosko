'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Building2, Layers, Droplets, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Trash2, Edit3 } from 'lucide-react'
import { useState } from 'react'
import type { InferredStore } from '@/lib/supabase/api'
import { cn } from '@/lib/utils'

interface InferredStoreDetailPanelProps {
  store: InferredStore | null
  onClose: () => void
  onDelete?: (id: string) => void
  onEdit?: (id: string, newName: string) => void
}

function Section({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = true,
  accentColor = 'orange'
}: { 
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
  accentColor?: 'orange' | 'blue' | 'purple'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  const colorClasses = {
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500'
  }
  
  return (
    <div className="border-b border-[rgba(var(--border-color))] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[rgba(var(--glass-bg))] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorClasses[accentColor]}`} />
          <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[rgb(var(--text-muted))]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[rgb(var(--text-muted))]" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DataRow({ label, value, highlight = false, highlightColor = 'orange' }: { 
  label: string
  value: string | number | null | undefined
  highlight?: boolean
  highlightColor?: 'orange' | 'blue' | 'green'
}) {
  if (value === null || value === undefined || value === '') return null
  
  const colorClasses = {
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    green: 'text-green-500'
  }
  
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-[rgb(var(--text-muted))] shrink-0">{label}</span>
      <span className={cn(
        'text-sm text-right',
        highlight ? `${colorClasses[highlightColor]} font-medium` : 'text-[rgb(var(--text-primary))]'
      )}>
        {value}
      </span>
    </div>
  )
}

export default function InferredStoreDetailPanel({ 
  store, 
  onClose,
  onDelete,
  onEdit
}: InferredStoreDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!store) return null

  const handleStartEdit = () => {
    setEditName(store.nombre)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editName.trim() && onEdit) {
      onEdit(store.id, editName.trim())
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(store.id)
    }
    setShowDeleteConfirm(false)
    onClose()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-96 glass-sidebar h-full flex flex-col border-l border-[rgba(var(--border-color))] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-[rgba(var(--border-color))] shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                  INFERIDA
                </span>
              </div>
              {isEditing ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded border border-orange-500/50 bg-[rgba(var(--glass-bg))] text-[rgb(var(--text-primary))] focus:outline-none focus:border-orange-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <h2 className="text-lg font-bold text-orange-400 truncate">{store.nombre}</h2>
              )}
              <p className="text-sm text-[rgb(var(--text-secondary))] truncate mt-0.5">
                {(store.metadata as any)?.ciudad || 'Ubicación no especificada'}
              </p>
            </div>
            <div className="flex gap-1">
              {onEdit && !isEditing && (
                <button 
                  onClick={handleStartEdit}
                  className="p-2 rounded-lg shrink-0 bg-[rgba(var(--glass-bg))] hover:bg-orange-500/20 border border-[rgba(var(--border-color))] transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-orange-400" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg shrink-0 bg-[rgba(var(--glass-bg))] hover:bg-red-500/20 border border-[rgba(var(--border-color))] transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 rounded-lg shrink-0 bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))] border border-[rgba(var(--border-color))] transition-colors"
              >
                <X className="w-4 h-4 text-[rgb(var(--text-muted))]" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-2 mt-3">
            <div className="flex-1 p-2 rounded-lg text-center bg-orange-500/10">
              <p className="text-lg font-bold text-orange-500">
                {(store.inferred_data as any)?.qadm_estimado?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-[10px] text-[rgb(var(--text-muted))]">Qadm (ton/m²)</p>
            </div>
            <div className="flex-1 p-2 rounded-lg text-center bg-[rgba(var(--glass-bg))]">
              <p className="text-lg font-bold text-[rgb(var(--text-primary))]">
                {Math.round(store.confidence_score || 0)}%
              </p>
              <p className="text-[10px] text-[rgb(var(--text-muted))]">Confianza</p>
            </div>
            <div className="flex-1 p-2 rounded-lg text-center bg-[rgba(var(--glass-bg))]">
              <p className="text-lg font-bold text-[rgb(var(--text-primary))]">
                {(store.metadata as any)?.parentDistance?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-[10px] text-[rgb(var(--text-muted))]">Dist. (km)</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Parent Store Info */}
          <Section title="Tienda de Referencia" icon={Building2} accentColor="blue">
            <DataRow label="Nombre" value={store.parent_store_name} />
            <DataRow label="ID" value={store.parent_store_id} />
            <DataRow label="Distancia" value={(store.metadata as any)?.parentDistance ? `${(store.metadata as any).parentDistance.toFixed(2)} km` : undefined} highlight highlightColor="blue" />
          </Section>

          {/* Inferred Data */}
          <Section title="Datos Inferidos" icon={Layers} accentColor="orange">
            <DataRow label="Qadm Estimado" value={(store.inferred_data as any)?.qadm_estimado ? `${(store.inferred_data as any).qadm_estimado.toFixed(2)} ton/m²` : undefined} highlight />
            <DataRow label="Rango Qadm" value={(store.inferred_data as any)?.qadm_min && (store.inferred_data as any)?.qadm_max ? `${(store.inferred_data as any).qadm_min.toFixed(1)} - ${(store.inferred_data as any).qadm_max.toFixed(1)} ton/m²` : undefined} />
            <DataRow label="Clasificación SUCS" value={(store.inferred_data as any)?.clasificacion_sucs} />
            <DataRow label="Cimentación Sugerida" value={(store.inferred_data as any)?.tipo_cimentacion_sugerido} highlight />
            <DataRow label="Desplante" value={(store.inferred_data as any)?.profundidad_desplante !== undefined ? `${(store.inferred_data as any).profundidad_desplante} m` : undefined} />
            
            {(store.inferred_data as any)?.tipo_suelo && (
              <div className="mt-2 p-2 rounded-lg bg-[rgba(var(--glass-bg))]">
                <p className="text-xs text-[rgb(var(--text-muted))] mb-1">Tipo de Suelo:</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">{(store.inferred_data as any).tipo_suelo}</p>
              </div>
            )}
          </Section>

          {/* Alerts */}
          <Section title="Alertas y Observaciones" icon={AlertTriangle} accentColor="orange">
            <div className="space-y-2">
              {(store.inferred_data as any)?.mejoramiento_probable && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs text-amber-400">Se anticipa necesidad de mejoramiento</span>
                </div>
              )}
              {(store.inferred_data as any)?.presencia_naf_probable && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                  <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-400">
                    Posible NAF a {(store.inferred_data as any).profundidad_naf_estimada || '?'} m
                  </span>
                </div>
              )}
              {(store.inferred_data as any)?.observaciones?.map((obs: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(var(--glass-bg))]">
                  <CheckCircle className="w-4 h-4 text-[rgb(var(--text-muted))] shrink-0 mt-0.5" />
                  <span className="text-xs text-[rgb(var(--text-secondary))]">{obs}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Location */}
          <Section title="Ubicación" icon={MapPin} defaultOpen={false}>
            <DataRow label="Latitud" value={store.latitud.toFixed(6)} />
            <DataRow label="Longitud" value={store.longitud.toFixed(6)} />
            <DataRow label="Ciudad" value={(store.metadata as any)?.ciudad} />
          </Section>

          {/* Dates */}
          <Section title="Información" icon={Calendar} defaultOpen={false}>
            <DataRow label="Creada" value={formatDate(store.created_at)} />
            <DataRow label="Actualizada" value={formatDate(store.updated_at)} />
            <DataRow label="ID" value={store.id} />
          </Section>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-80 p-5 rounded-2xl bg-[rgb(var(--bg-secondary))] border border-[rgba(var(--border-color))] shadow-2xl">
              <h3 className="text-lg font-bold text-[rgb(var(--text-primary))] mb-2">
                ¿Eliminar tienda?
              </h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] mb-4">
                Esta acción no se puede deshacer. La tienda "{store.nombre}" será eliminada permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 px-4 rounded-lg bg-[rgba(var(--glass-bg))] border border-[rgba(var(--border-color))] text-[rgb(var(--text-primary))] hover:bg-[rgba(var(--card-bg))] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 px-4 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  )
}
