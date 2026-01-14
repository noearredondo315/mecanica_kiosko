'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase/types'

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  // Role checks
  isAdmin: boolean
  canWrite: boolean
  canDelete: boolean
  canAccessGeomap: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Use singleton client
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log(`[AuthContext] Fetching profile for: ${userId}`)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data && !error) {
        // Normalize role for internal state
        const rawRole = (data as any).role as string
        let normalizedRole: UserRole = 'read'
        
        if (rawRole === 'admin') normalizedRole = 'admin'
        else if (rawRole === 'write' || rawRole === 'editor') normalizedRole = 'write'
        else normalizedRole = 'read' // includes 'viewer' and others

        console.log(`[AuthContext] Profile fetched. Raw role: ${rawRole}, Normalized: ${normalizedRole}`)
        
        setProfile({
          id: (data as any).id,
          email: (data as any).email,
          full_name: (data as any).full_name,
          avatar_url: (data as any).avatar_url,
          role: normalizedRole
        })
      } else if (error) {
        console.error('[AuthContext] Error fetching profile:', error)
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error fetching profile:', err)
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    let mounted = true

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id)
        return
      }

      if (nextSession) {
        const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.warn('[AuthContext] Could not fetch user details:', userError)
          return
        }

        if (fetchedUser) {
          setUser(fetchedUser)
          await fetchProfile(fetchedUser.id)
        }
      }
    }

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing session...')
        
        // Try to get session from cookies/storage
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthContext] Session error during init:', sessionError)
        }

        if (initialSession && mounted) {
          console.log('[AuthContext] Session found for:', initialSession.user?.email ?? 'unknown user')
          await applySession(initialSession)
        } else {
          console.log('[AuthContext] No initial session found on mount')
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

          if (refreshError) {
            console.warn('[AuthContext] Session refresh failed:', refreshError)
          }

          if (refreshedSession) {
            console.log('[AuthContext] Session refreshed from storage')
            await applySession(refreshedSession)
          }
        }
      } catch (err) {
        console.error('[AuthContext] Unexpected error during initialization:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
          console.log('[AuthContext] Initialization finished. isLoading = false')
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        
        console.log('[AuthContext] Auth state change event:', event, 'Has session:', !!newSession)
        
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return
        }

        if (newSession) {
          await applySession(newSession)
        } else if (event === 'INITIAL_SESSION') {
          // This handles cases where initializeAuth might have missed it or they are tied
          setIsLoading(false)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  // Role-based permission checks (support legacy role values)
  const isAdmin = profile?.role === 'admin'
  const canWrite = profile?.role === 'admin' || profile?.role === 'write' || profile?.role === 'editor'
  const canDelete = profile?.role === 'admin' // Only admin can delete
  const canAccessGeomap = profile?.role === 'admin' || profile?.role === 'write' || profile?.role === 'editor'
  const isAuthenticated = !!session

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        isAdmin,
        canWrite,
        canDelete,
        canAccessGeomap,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
