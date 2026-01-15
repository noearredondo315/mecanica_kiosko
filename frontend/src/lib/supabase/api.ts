'use client'

import { createClient } from './client'
import type { Database } from './types'

export type Store = Database['public']['Tables']['stores']['Row']
export type InferredStore = Database['public']['Tables']['inferred_stores']['Row']

// Extended type with user info from profiles join
export interface InferredStoreWithUser extends InferredStore {
  registered_by?: string | null
}

export interface AlternativaCimentacion {
  tipo_cimentacion: string
  capacidad_carga_admisible_ton_m2: number
  profundidad_desplante_m: number
  ancho_cimentacion_m: number
  condiciones_calculo: string
  requiere_mejoramiento: boolean
  descripcion_mejoramiento: string
}

export interface Metadata {
  total_stores: number
  cities: string[]
  years: number[]
  stores_by_city: Record<string, number>
}

export interface DashboardData {
  stores: Store[]
  metadata: Metadata
}

export async function fetchStores(params?: {
  year?: number[]
  city?: string[]
  errors_only?: boolean
  search?: string
}): Promise<DashboardData> {
  const supabase = createClient()
  
  let query = supabase.from('stores').select('*')
  
  // Apply filters
  if (params?.year?.length) {
    query = query.in('año', params.year)
  }
  
  if (params?.city?.length) {
    query = query.in('ciudad', params.city)
  }
  
  if (params?.search) {
    const searchTerm = `%${params.search}%`
    query = query.or(`nombre.ilike.${searchTerm},ciudad.ilike.${searchTerm}`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching stores:', error)
    throw new Error('Failed to fetch stores')
  }
  
  const stores = data as Store[]
  
  // Calculate metadata
  const validStores = stores || []
  const cities = Array.from(new Set(validStores.map(s => s.ciudad).filter(Boolean))) as string[]
  const years = Array.from(new Set(validStores.map(s => s.año).filter(Boolean))) as number[]
  
  const stores_by_city: Record<string, number> = {}
  cities.forEach(city => {
    stores_by_city[city] = validStores.filter(s => s.ciudad === city).length
  })
  
  return {
    stores: validStores,
    metadata: {
      total_stores: validStores.length,
      cities: cities.sort(),
      years: years.sort(),
      stores_by_city
    }
  }
}

export async function fetchCities(): Promise<{ cities: string[] }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .select('ciudad')
  
  if (error) {
    console.error('Error fetching cities:', error)
    throw new Error('Failed to fetch cities')
  }
  
  const cities = Array.from(new Set((data as any[])?.map(s => s.ciudad).filter(Boolean))) as string[]
  return { cities: cities.sort() }
}

export async function fetchYears(): Promise<{ years: number[] }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .select('año')
  
  if (error) {
    console.error('Error fetching years:', error)
    throw new Error('Failed to fetch years')
  }
  
  const years = Array.from(new Set((data as any[])?.map(s => s.año).filter(Boolean))) as number[]
  return { years: years.sort() }
}

// Inferred stores functions
export async function fetchInferredStores(): Promise<InferredStore[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('inferred_stores')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching inferred stores:', error)
    throw new Error('Failed to fetch inferred stores')
  }
  
  return data || []
}

// Fetch inferred stores with user info (join with profiles)
export async function fetchInferredStoresWithUser(): Promise<InferredStoreWithUser[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('inferred_stores')
    .select(`
      *,
      profiles:user_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching inferred stores with user:', error)
    throw new Error('Failed to fetch inferred stores')
  }
  
  // Transform data to flatten the profiles join
  return (data || []).map((store: any) => ({
    ...store,
    registered_by: store.profiles?.full_name || null,
    profiles: undefined // Remove nested object
  }))
}

export async function addInferredStore(store: Database['public']['Tables']['inferred_stores']['Insert']): Promise<InferredStore> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('inferred_stores')
    .insert([{ ...store, user_id: user?.id }] as any)
    .select()
    .single()
  
  if (error) {
    console.error('Error adding inferred store:', error)
    throw new Error('Failed to add inferred store')
  }
  
  return data as InferredStore
}

export async function updateInferredStore(
  id: string, 
  updates: Database['public']['Tables']['inferred_stores']['Update']
): Promise<InferredStore> {
  const supabase = createClient()
  
  const { data, error } = await (supabase
    .from('inferred_stores') as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating inferred store:', error)
    throw new Error('Failed to update inferred store')
  }
  
  return data as InferredStore
}

export async function deleteInferredStore(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('inferred_stores')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting inferred store:', error)
    throw new Error('Failed to delete inferred store')
  }
}

// Utility functions
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}
