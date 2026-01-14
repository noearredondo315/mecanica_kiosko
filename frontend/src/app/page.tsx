'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import StoreDetailPanel from '@/components/StoreDetailPanel'
import InferredStoreDetailPanel from '@/components/InferredStoreDetailPanel'
import { useStores } from '@/hooks/useStores'
import { useAuth } from '@/context/AuthContext'
import { 
  fetchInferredStores, 
  updateInferredStore,
  deleteInferredStore,
  type Store,
  type InferredStore
} from '@/lib/supabase/api'
import type { Database } from '@/lib/supabase/types'

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
  const { isAuthenticated, isLoading: isAuthLoading, canDelete, canWrite } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedInferredStore, setSelectedInferredStore] = useState<InferredStore | null>(null)
  const [inferredStoresVersion, setInferredStoresVersion] = useState(0)

  // Only fetch stores when auth is ready and user is authenticated
  const { data: storesData, isLoading: isLoadingStores, error: fetchError } = useStores({
    years: [],
    cities: [],
    errorsOnly: false,
    search: searchQuery,
  }, { enabled: !isAuthLoading && isAuthenticated })

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

  const handleInferredStoreSelect = useCallback((store: InferredStore) => {
    setSelectedInferredStore(store)
    setSelectedStore(null) // Close official store panel if open
  }, [])

  const handleCloseInferredDetail = useCallback(() => {
    setSelectedInferredStore(null)
  }, [])

  const handleDeleteInferredStore = useCallback((id: string) => {
    if (!canDelete) return // Only admin can delete
    deleteInferredStore(id)
    setSelectedInferredStore(null)
    setInferredStoresVersion(v => v + 1)
  }, [canDelete])

  const handleEditInferredStore = useCallback(async (id: string, newName: string) => {
    await updateInferredStore(id, { nombre: newName })
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
        canDelete={canDelete}
        canEdit={canWrite}
      />
    </div>
  )
}
