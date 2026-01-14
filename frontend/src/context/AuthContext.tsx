'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase/types'

// Routes that require authentication
const PROTECTED_ROUTES = ['/', '/geomap', '/admin']

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
  
  const router = useRouter()
  const pathname = usePathname()
  
  // Use singleton client
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[Auth] Fetching profile for user:', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data && !error) {
        const profileData = data as Profile
        console.log('[Auth] Profile fetched successfully:', { role: profileData.role, email: profileData.email })
        setProfile(profileData)
      } else if (error) {
        console.error('[Auth] Error fetching profile:', error)
        // Profile fetch failed but user is authenticated - set a default profile
        // This prevents the UI from being empty
        setProfile({
          id: userId,
          email: null,
          full_name: null,
          role: 'read' as UserRole,
          avatar_url: null
        })
      }
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err)
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    let mounted = true

    // Helper to check if current path is protected
    const isProtectedRoute = (path: string) => {
      return PROTECTED_ROUTES.some(route => 
        path === route || path.startsWith(route + '/')
      )
    }

    // Get initial session using getUser() for more reliable auth check
    const getInitialSession = async () => {
      console.log('[Auth] Starting session rehydration...')
      
      try {
        // First try to get the session from cookies
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('[Auth] getSession result:', { 
          hasSession: !!currentSession, 
          error: sessionError?.message 
        })
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError)
        }

        if (currentSession) {
          // Validate session with getUser() - this makes a server call to verify the token
          console.log('[Auth] Validating session with getUser()...')
          const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
          
          console.log('[Auth] getUser result:', { 
            hasUser: !!currentUser, 
            userId: currentUser?.id,
            error: userError?.message 
          })
          
          if (userError) {
            console.error('[Auth] User validation error:', userError)
            // CRITICAL FIX: Session is invalid/expired - force signOut to clear cookies
            console.log('[Auth] Forcing signOut due to invalid session...')
            await supabase.auth.signOut()
            
            if (mounted) {
              setSession(null)
              setUser(null)
              setProfile(null)
              setIsLoading(false)
              
              // Redirect to login if on a protected route
              if (isProtectedRoute(pathname)) {
                console.log('[Auth] Redirecting to /login (invalid session on protected route)')
                router.replace('/login')
              }
            }
            return
          }

          if (currentUser && mounted) {
            console.log('[Auth] Session valid, fetching profile...')
            setSession(currentSession)
            setUser(currentUser)
            await fetchProfile(currentUser.id)
            console.log('[Auth] Session rehydration complete')
          }
        } else {
          console.log('[Auth] No session found')
          // No session exists - redirect to login if on protected route
          if (mounted && isProtectedRoute(pathname)) {
            console.log('[Auth] Redirecting to /login (no session on protected route)')
            router.replace('/login')
          }
        }
        
        if (mounted) {
          setIsLoading(false)
        }
      } catch (err) {
        console.error('[Auth] Error getting initial session:', err)
        // On any error, clean up and redirect
        try {
          await supabase.auth.signOut()
        } catch {}
        
        if (mounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          
          if (isProtectedRoute(pathname)) {
            router.replace('/login')
          }
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        
        console.log('Auth state change:', event)
        
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return
        }

        if (newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          await fetchProfile(newSession.user.id)
        } else {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, router, pathname])

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
  const isAuthenticated = !!user && !!session

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
