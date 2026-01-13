'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import type { Store, Metadata } from '@/lib/supabase/api'
import { formatPercent } from '@/lib/supabase/api'
import { cn } from '@/lib/utils'

interface MetricsPanelProps {
  metadata: Metadata
  selectedStore: Store | null
  storeHistory: Store[] | null
  isLoadingHistory: boolean
}

export default function MetricsPanel({
  metadata,
  selectedStore,
  storeHistory,
  isLoadingHistory,
}: MetricsPanelProps) {
  const errorRateData = metadata.stores_by_city ? Object.entries(metadata.stores_by_city)
    .map(([city, count]) => ({
      city: city.length > 10 ? city.substring(0, 10) + '...' : city,
      fullCity: city,
      rate: Math.round((count / metadata.total_stores) * 100),
      total: metadata.total_stores,
      count: count,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8) : []

  return (
    <div className="w-96 glass-sidebar h-full flex flex-col border-l border-white/10">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Métricas</h2>
        <p className="text-sm text-slate-400">Análisis de la red</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Total Tiendas</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {metadata.total_stores}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Ciudades</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {metadata.cities.length}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Tasa de Error por Ciudad
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorRateData} layout="vertical">
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="city" 
                  width={80}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="glass-card p-3 text-sm">
                          <p className="font-medium text-white">{data.fullCity}</p>
                          <p className="text-slate-400">
                            {data.count} tiendas
                          </p>
                          <p className="font-semibold text-blue-400">
                            {data.rate}% del total
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {errorRateData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill="#3b82f6"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {selectedStore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">
                Detalle de Tienda
              </h3>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                'bg-green-500/20 text-green-400'
              )}>
                OK
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="text-sm text-white font-medium">{selectedStore.nombre}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Ciudad</p>
                  <p className="text-sm text-white">{selectedStore.ciudad}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Año</p>
                  <p className="text-sm text-white">{selectedStore.año}</p>
                </div>
              </div>
              {selectedStore.tipo_cimentacion && (
                <div>
                  <p className="text-xs text-slate-500">Cimentación</p>
                  <p className="text-sm text-white">{selectedStore.tipo_cimentacion}</p>
                </div>
              )}
              {selectedStore.qadm && (
                <div>
                  <p className="text-xs text-slate-500">Qadm</p>
                  <p className="text-sm text-white">{selectedStore.qadm} ton/m²</p>
                </div>
              )}
              {selectedStore.laboratorio && (
                <div>
                  <p className="text-xs text-slate-500">Laboratorio</p>
                  <p className="text-sm text-white">{selectedStore.laboratorio}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {selectedStore && storeHistory && storeHistory.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <h3 className="text-sm font-medium text-slate-300 mb-4">
              Histórico de la Tienda
            </h3>
            <div className="space-y-2">
              {storeHistory.map((record, idx) => (
                <div 
                  key={`${record.id}-${record.año}`}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg',
                    record.id === selectedStore.id && record.año === selectedStore.año
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{record.año}</span>
                    {idx > 0 && storeHistory && storeHistory[idx - 1].qadm && record.qadm && (
                      record.qadm > (storeHistory[idx - 1].qadm || 0) 
                        ? <TrendingUp className="w-3 h-3 text-green-400" />
                        : <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {record.qadm && (
                      <span className="text-xs text-slate-400">
                        {record.qadm} ton/m²
                      </span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {isLoadingHistory && selectedStore && (
          <div className="glass-card p-4 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{metadata.cities.length} ciudades</span>
          <span>{metadata.years.length} años</span>
        </div>
      </div>
    </div>
  )
}
