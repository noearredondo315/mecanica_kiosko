'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Building2, Layers, Droplets, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Store, AlternativaCimentacion } from '@/lib/supabase/api'
import { cn } from '@/lib/utils'

interface StoreDetailPanelProps {
  store: Store | null
  onClose: () => void
}

function Section({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = true 
}: { 
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border-b border-[rgba(var(--border-color))] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[rgba(var(--glass-bg))] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[rgb(var(--accent-primary))]" />
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

function DataRow({ label, value, highlight = false }: { label: string; value: string | number | null | undefined; highlight?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-[rgb(var(--text-muted))] shrink-0">{label}</span>
      <span className={cn(
        'text-sm text-right',
        highlight ? 'text-[rgb(var(--accent-primary))] font-medium' : 'text-[rgb(var(--text-primary))]'
      )}>
        {value}
      </span>
    </div>
  )
}

function AlternativaCard({ alternativa, index }: { alternativa: AlternativaCimentacion; index: number }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className={cn(
      'rounded-xl p-3 border',
      'bg-[rgba(var(--glass-bg))] border-[rgba(var(--border-color))]'
    )}>
      <div 
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded',
              'bg-[rgba(var(--accent-primary),0.2)] text-[rgb(var(--accent-primary))]'
            )}>
              Opción {index + 1}
            </span>
            {alternativa.requiere_mejoramiento && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                Requiere mejoramiento
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-[rgb(var(--text-primary))]">
            {alternativa.tipo_cimentacion}
          </p>
        </div>
        <div className="text-right ml-2">
          <p className="text-lg font-bold text-[rgb(var(--accent-primary))]">
            {alternativa.capacidad_carga_admisible_ton_m2}
          </p>
          <p className="text-[10px] text-[rgb(var(--text-muted))]">ton/m²</p>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[rgba(var(--border-color))] space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[rgb(var(--text-muted))]">Desplante</span>
                  <p className="text-[rgb(var(--text-primary))] font-medium">
                    {alternativa.profundidad_desplante_m} m
                  </p>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-muted))]">Ancho</span>
                  <p className="text-[rgb(var(--text-primary))] font-medium">
                    {alternativa.ancho_cimentacion_m} m
                  </p>
                </div>
              </div>
              
              {alternativa.condiciones_calculo && (
                <div>
                  <span className="text-[10px] text-[rgb(var(--text-muted))]">Condiciones de cálculo</span>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 leading-relaxed">
                    {alternativa.condiciones_calculo}
                  </p>
                </div>
              )}
              
              {alternativa.descripcion_mejoramiento && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 font-medium">Mejoramiento requerido</span>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 leading-relaxed">
                    {alternativa.descripcion_mejoramiento}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full mt-2 text-[10px] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
      >
        {expanded ? 'Ver menos' : 'Ver detalles'}
      </button>
    </div>
  )
}

export default function StoreDetailPanel({ store, onClose }: StoreDetailPanelProps) {
  return (
    <AnimatePresence>
      {store && (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-96 glass-sidebar h-full flex flex-col border-l border-[rgba(var(--border-color))] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-[rgba(var(--border-color))] shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
                  ID: {store.id} • {store.ciudad}
                </p>
                <h2 className="text-lg font-bold text-[rgb(var(--text-primary))] truncate">
                  {store.nombre}
                </h2>
                {store.nombre_obra && store.nombre_obra !== store.nombre && (
                  <p className="text-sm text-[rgb(var(--text-secondary))] truncate mt-0.5">
                    {store.nombre_obra}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  'bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--card-bg))]',
                  'border border-[rgba(var(--border-color))]',
                  'transition-colors'
                )}
              >
                <X className="w-4 h-4 text-[rgb(var(--text-muted))]" />
              </button>
            </div>
            
            {/* Quick stats */}
            <div className="flex gap-2 mt-3">
              <div className={cn(
                'flex-1 p-2 rounded-lg text-center',
                'bg-[rgba(var(--accent-primary),0.1)]'
              )}>
                <p className="text-lg font-bold text-[rgb(var(--accent-primary))]">
                  {store.qadm ?? '-'}
                </p>
                <p className="text-[10px] text-[rgb(var(--text-muted))]">Qadm (ton/m²)</p>
              </div>
              <div className={cn(
                'flex-1 p-2 rounded-lg text-center',
                'bg-[rgba(var(--glass-bg))]'
              )}>
                <p className="text-lg font-bold text-[rgb(var(--text-primary))]">
                  {store.profundidad_desplante ?? '-'}
                </p>
                <p className="text-[10px] text-[rgb(var(--text-muted))]">Desplante (m)</p>
              </div>
              <div className={cn(
                'flex-1 p-2 rounded-lg text-center',
                'bg-[rgba(var(--glass-bg))]'
              )}>
                <p className="text-lg font-bold text-[rgb(var(--text-primary))]">
                  {store.profundidad_max ?? '-'}
                </p>
                <p className="text-[10px] text-[rgb(var(--text-muted))]">Prof. Max (m)</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Identificación */}
            <Section title="Identificación" icon={Building2}>
              <DataRow label="Laboratorio" value={store.laboratorio} />
              <DataRow label="Fecha del reporte" value={store.fecha_reporte} />
              <DataRow label="Año" value={store.año} />
              {store.ubicacion_detallada && (
                <div className="pt-2">
                  <span className="text-xs text-[rgb(var(--text-muted))]">Ubicación</span>
                  <p className="text-sm text-[rgb(var(--text-secondary))] mt-1 leading-relaxed">
                    {store.ubicacion_detallada}
                  </p>
                </div>
              )}
            </Section>

            {/* Exploración */}
            <Section title="Exploración de Campo" icon={Layers}>
              <DataRow label="Cantidad de sondeos" value={store.cantidad_sondeos} />
              <DataRow label="Metodología" value={store.metodologia} />
              <DataRow label="Profundidad máxima" value={store.profundidad_max ? `${store.profundidad_max} m` : null} />
              <div className="flex items-center gap-2 pt-1">
                {store.presencia_naf ? (
                  <>
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400">
                      NAF presente a {store.profundidad_naf} m
                    </span>
                  </>
                ) : (
                  <>
                    <Droplets className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                    <span className="text-sm text-[rgb(var(--text-muted))]">
                      Sin NAF detectado
                    </span>
                  </>
                )}
              </div>
            </Section>

            {/* Caracterización del suelo */}
            <Section title="Caracterización del Suelo" icon={Layers} defaultOpen={false}>
              <DataRow label="Tipo de suelo" value={store.tipo_suelo} highlight />
              <DataRow label="Clasificación SUCS" value={store.clasificacion_sucs} />
              <DataRow label="Consistencia/Densidad" value={store.consistencia_densidad} />
              {(store.limite_liquido || store.indice_plasticidad || store.contenido_agua) && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {store.limite_liquido && (
                    <div className="text-center p-2 rounded-lg bg-[rgba(var(--glass-bg))]">
                      <p className="text-sm font-medium text-[rgb(var(--text-primary))]">{store.limite_liquido}</p>
                      <p className="text-[10px] text-[rgb(var(--text-muted))]">LL</p>
                    </div>
                  )}
                  {store.indice_plasticidad && (
                    <div className="text-center p-2 rounded-lg bg-[rgba(var(--glass-bg))]">
                      <p className="text-sm font-medium text-[rgb(var(--text-primary))]">{store.indice_plasticidad}</p>
                      <p className="text-[10px] text-[rgb(var(--text-muted))]">IP</p>
                    </div>
                  )}
                  {store.contenido_agua && (
                    <div className="text-center p-2 rounded-lg bg-[rgba(var(--glass-bg))]">
                      <p className="text-sm font-medium text-[rgb(var(--text-primary))]">{store.contenido_agua}%</p>
                      <p className="text-[10px] text-[rgb(var(--text-muted))]">W</p>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Cimentación Recomendada */}
            <Section title="Cimentación Recomendada" icon={Building2}>
              <div className={cn(
                'p-3 rounded-xl border',
                'bg-[rgba(var(--accent-primary),0.05)] border-[rgba(var(--accent-primary),0.2)]'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-[rgb(var(--accent-primary))]" />
                  <span className="text-sm font-medium text-[rgb(var(--accent-primary))]">
                    {store.tipo_cimentacion || 'No especificado'}
                  </span>
                </div>
                {store.justificacion && (
                  <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
                    {store.justificacion}
                  </p>
                )}
              </div>
              
              {store.mejoramiento_requerido && store.detalles_mejoramiento && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-500">Mejoramiento Requerido</span>
                  </div>
                  <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
                    {store.detalles_mejoramiento}
                  </p>
                </div>
              )}
            </Section>

            {/* Alternativas de Cimentación */}
            {Array.isArray(store.alternativas_cimentacion) && (store.alternativas_cimentacion as any[]).length > 0 && (
              <Section title={`Alternativas Analizadas (${(store.alternativas_cimentacion as any[]).length})`} icon={Layers} defaultOpen={false}>
                <div className="space-y-2">
                  {(store.alternativas_cimentacion as any[]).map((alt, idx) => (
                    <AlternativaCard key={idx} alternativa={alt} index={idx} />
                  ))}
                </div>
              </Section>
            )}

            {/* Análisis Sísmico */}
            {(store.zona_sismica || store.coeficiente_sismico || store.clasificacion_sitio) && (
              <Section title="Análisis Sísmico" icon={AlertTriangle} defaultOpen={false}>
                <DataRow label="Zona sísmica" value={store.zona_sismica} />
                <DataRow label="Coeficiente sísmico" value={store.coeficiente_sismico} />
                <DataRow label="Clasificación del sitio" value={store.clasificacion_sitio} />
              </Section>
            )}

            {/* Observaciones */}
            {store.observaciones_criticas && (
              <Section title="Observaciones Críticas" icon={AlertTriangle} defaultOpen={false}>
                <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                  {store.observaciones_criticas}
                </p>
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[rgba(var(--border-color))] shrink-0">
            <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
              <MapPin className="w-3 h-3" />
              <span>{store.latitud?.toFixed(6)}, {store.longitud?.toFixed(6)}</span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
