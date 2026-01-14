'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchStores, type DashboardData } from '@/lib/supabase/api'

export interface FilterState {
  years: number[]
  cities: string[]
  errorsOnly: boolean
  search: string
}

export interface UseStoresOptions {
  enabled?: boolean
}

export function useStores(filters: FilterState, options: UseStoresOptions = {}) {
  const { enabled = true } = options
  
  return useQuery<DashboardData>({
    queryKey: ['stores', filters],
    queryFn: async () => {
      const data = await fetchStores({
        year: filters.years.length > 0 ? filters.years : undefined,
        city: filters.cities.length > 0 ? filters.cities : undefined,
        errors_only: filters.errorsOnly,
        search: filters.search || undefined,
      });
      return data;
    },
    enabled, // Only fetch when enabled (auth is ready)
  })
}
