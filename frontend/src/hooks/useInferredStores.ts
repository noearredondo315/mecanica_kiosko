'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchInferredStores, 
  addInferredStore, 
  updateInferredStore, 
  deleteInferredStore 
} from '@/lib/supabase/api'
import type { Database } from '@/lib/supabase/types'

type InferredStore = Database['public']['Tables']['inferred_stores']['Row']
type InferredStoreInsert = Database['public']['Tables']['inferred_stores']['Insert']
type InferredStoreUpdate = Database['public']['Tables']['inferred_stores']['Update']

export function useInferredStores() {
  return useQuery<InferredStore[]>({
    queryKey: ['inferred-stores'],
    queryFn: fetchInferredStores,
  })
}

export function useAddInferredStore() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (store: InferredStoreInsert) => addInferredStore(store),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inferred-stores'] })
    },
  })
}

export function useUpdateInferredStore() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: InferredStoreUpdate }) => 
      updateInferredStore(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inferred-stores'] })
    },
  })
}

export function useDeleteInferredStore() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteInferredStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inferred-stores'] })
    },
  })
}
