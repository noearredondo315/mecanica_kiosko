export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'write' | 'read'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: number
          nombre: string | null
          ciudad: string | null
          año: number | null
          latitud: number | null
          longitud: number | null
          nombre_obra: string | null
          ubicacion_detallada: string | null
          laboratorio: string | null
          fecha_reporte: string | null
          cantidad_sondeos: string | null
          metodologia: string | null
          profundidad_max: number | null
          presencia_naf: boolean
          profundidad_naf: number | null
          tipo_suelo: string | null
          clasificacion_sucs: string | null
          consistencia_densidad: string | null
          limite_liquido: number | null
          indice_plasticidad: number | null
          contenido_agua: number | null
          alternativas_cimentacion: Json
          tipo_cimentacion: string | null
          qadm: number | null
          profundidad_desplante: number | null
          justificacion: string | null
          mejoramiento_requerido: boolean
          detalles_mejoramiento: string | null
          zona_sismica: string | null
          coeficiente_sismico: string | null
          clasificacion_sitio: string | null
          observaciones_criticas: string | null
          created_at: string
        }
        Insert: {
          id?: number
          nombre?: string | null
          ciudad?: string | null
          año?: number | null
          latitud?: number | null
          longitud?: number | null
          nombre_obra?: string | null
          ubicacion_detallada?: string | null
          laboratorio?: string | null
          fecha_reporte?: string | null
          cantidad_sondeos?: string | null
          metodologia?: string | null
          profundidad_max?: number | null
          presencia_naf?: boolean
          profundidad_naf?: number | null
          tipo_suelo?: string | null
          clasificacion_sucs?: string | null
          consistencia_densidad?: string | null
          limite_liquido?: number | null
          indice_plasticidad?: number | null
          contenido_agua?: number | null
          alternativas_cimentacion?: Json
          tipo_cimentacion?: string | null
          qadm?: number | null
          profundidad_desplante?: number | null
          justificacion?: string | null
          mejoramiento_requerido?: boolean
          detalles_mejoramiento?: string | null
          zona_sismica?: string | null
          coeficiente_sismico?: string | null
          clasificacion_sitio?: string | null
          observaciones_criticas?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          nombre?: string | null
          ciudad?: string | null
          año?: number | null
          latitud?: number | null
          longitud?: number | null
          nombre_obra?: string | null
          ubicacion_detallada?: string | null
          laboratorio?: string | null
          fecha_reporte?: string | null
          cantidad_sondeos?: string | null
          metodologia?: string | null
          profundidad_max?: number | null
          presencia_naf?: boolean
          profundidad_naf?: number | null
          tipo_suelo?: string | null
          clasificacion_sucs?: string | null
          consistencia_densidad?: string | null
          limite_liquido?: number | null
          indice_plasticidad?: number | null
          contenido_agua?: number | null
          alternativas_cimentacion?: Json
          tipo_cimentacion?: string | null
          qadm?: number | null
          profundidad_desplante?: number | null
          justificacion?: string | null
          mejoramiento_requerido?: boolean
          detalles_mejoramiento?: string | null
          zona_sismica?: string | null
          coeficiente_sismico?: string | null
          clasificacion_sitio?: string | null
          observaciones_criticas?: string | null
          created_at?: string
        }
      }
      inferred_stores: {
        Row: {
          id: string
          user_id: string | null
          nombre: string
          latitud: number
          longitud: number
          confidence_score: number | null
          parent_store_id: number | null
          parent_store_name: string | null
          metadata: Json
          inferred_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          nombre: string
          latitud: number
          longitud: number
          confidence_score?: number | null
          parent_store_id?: number | null
          parent_store_name?: string | null
          metadata?: Json
          inferred_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          nombre?: string
          latitud?: number
          longitud?: number
          confidence_score?: number | null
          parent_store_id?: number | null
          parent_store_name?: string | null
          metadata?: Json
          inferred_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
