'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchStores, type DashboardData } from '@/lib/supabase/api'

export interface FilterState {
  years: number[]
  cities: string[]
  errorsOnly: boolean
  search: string
}

export function useStores(filters: FilterState) {
  return useQuery<DashboardData>({
    queryKey: ['stores', filters],
    queryFn: async () => {
      console.log('Fetching stores with filters:', filters);
      const data = await fetchStores({
        year: filters.years.length > 0 ? filters.years : undefined,
        city: filters.cities.length > 0 ? filters.cities : undefined,
        errors_only: filters.errorsOnly,
        search: filters.search || undefined,
      });
      console.log('API Response:', data);
      return data;
    },
  })
}
