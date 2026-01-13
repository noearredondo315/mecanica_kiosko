'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import StoreDetailPanel from '@/components/StoreDetailPanel'
import InferredStoreDetailPanel from '@/components/InferredStoreDetailPanel'
import { useStores } from '@/hooks/useStores'
import type { Store } from '@/lib/api'
import { 
  loadInferredStores, 
  updateInferredStore,
  deleteInferredStore,
  type InferredStoreRecord 
} from '@/lib/inferredStoresPersistence'

const StoreMap = dynamic(() => import('@/components/StoreMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[rgb(var(--bg-primary))]">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-[rgb(var(--accent-primary))] border-t-transparent rounded-full animate-spin" />
        <span className="text-[rgb(var(--text-secondary))]">Cargando mapa...</span>
      </div>
    </div>
  ),
})

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedInferredStore, setSelectedInferredStore] = useState<InferredStoreRecord | null>(null)
  const [inferredStoresVersion, setInferredStoresVersion] = useState(0)

  const { data: storesData, isLoading: isLoadingStores, error: fetchError } = useStores({
    years: [],
    cities: [],
    errorsOnly: false,
    search: searchQuery,
  })

  const filteredStores = useMemo(() => {
    if (!storesData?.stores) return []
    if (!searchQuery.trim()) return storesData.stores
    
    const query = searchQuery.toLowerCase().trim()
    return storesData.stores.filter(store => 
      (store.nombre?.toLowerCase().includes(query) || false) ||
      (store.id?.toString().includes(query) || false) ||
      (store.ciudad?.toLowerCase().includes(query) || false)
    )
  }, [storesData?.stores, searchQuery])

  const handleStoreSelect = useCallback((store: Store) => {
    setSelectedStore(store)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedStore(null)
  }, [])

  const handleInferredStoreSelect = useCallback((store: InferredStoreRecord) => {
    setSelectedInferredStore(store)
    setSelectedStore(null) // Close official store panel if open
  }, [])

  const handleCloseInferredDetail = useCallback(() => {
    setSelectedInferredStore(null)
  }, [])

  const handleDeleteInferredStore = useCallback((id: string) => {
    deleteInferredStore(id)
    setSelectedInferredStore(null)
    setInferredStoresVersion(v => v + 1)
  }, [])

  const handleEditInferredStore = useCallback((id: string, newName: string) => {
    updateInferredStore(id, { nombre: newName })
    // Reload the updated store
    const data = loadInferredStores()
    const updated = data.stores.find(s => s.id === id)
    if (updated) setSelectedInferredStore(updated)
    setInferredStoresVersion(v => v + 1)
  }, [])

  const handleInferredStoresChange = useCallback(() => {
    setInferredStoresVersion(v => v + 1)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[rgb(var(--bg-primary))]">
      <Sidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalStores={filteredStores.length}
        onInferredStoresChange={handleInferredStoresChange}
      />

      <main className="flex-1 relative">
        <StoreMap
          stores={filteredStores}
          selectedStore={selectedStore}
          onStoreSelect={handleStoreSelect}
          onInferredStoreSelect={handleInferredStoreSelect}
          isLoading={isLoadingStores}
          inferredStoresRefresh={inferredStoresVersion}
        />
      </main>

      <StoreDetailPanel
        store={selectedStore}
        onClose={handleCloseDetail}
      />

      <InferredStoreDetailPanel
        store={selectedInferredStore}
        onClose={handleCloseInferredDetail}
        onDelete={handleDeleteInferredStore}
        onEdit={handleEditInferredStore}
      />
    </div>
  )
}
