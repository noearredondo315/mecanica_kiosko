import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { UserRole } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  try {
    // Get the current user's session to verify they're an admin
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if current user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden crear usuarios' }, { status: 403 })
    }

    // Parse request body
    const { email, password, fullName, role } = await request.json() as {
      email: string
      password: string
      fullName: string
      role: UserRole
    }

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Create user using Supabase Admin client (requires service role key)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    // Update the profile with the assigned role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role,
        full_name: fullName,
        email 
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // User was created but profile update failed - still return success but log the error
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: newUser.user.id, 
        email: newUser.user.email 
      } 
    })

  } catch (error) {
    console.error('Error in create-user API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
